package br.com.ites.server.services.User.Auth;

import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.repositories.User.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;

/** Autentica usuários e emite tokens vinculados a sessões persistidas. */
@Service
public class AuthService {
    public static final String ISSUER = "https://ites.ifrj.edu.br";

    public sealed interface LoginResult permits TokenPair, Challenge {}

    public record TokenPair(String accessToken, String refreshToken, long expiresIn)
            implements LoginResult {}

    public record Challenge(boolean twoFactorRequired, String challenge, long expiresInSeconds)
            implements LoginResult {}

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtEncoder encoder;
    private final SessionService sessions;
    private final TwoFactorService twoFactor;
    private final AuthRateLimiter limits;
    private final Clock clock;
    private final Duration accessTtl;
    private final String dummyHash;

    public AuthService(
            UserRepository users,
            PasswordEncoder passwords,
            JwtEncoder encoder,
            SessionService sessions,
            TwoFactorService twoFactor,
            AuthRateLimiter limits,
            Clock clock,
            @Value("${auth.access-token-ttl}") Duration accessTtl) {
        this.users = users;
        this.passwords = passwords;
        this.encoder = encoder;
        this.sessions = sessions;
        this.twoFactor = twoFactor;
        this.limits = limits;
        this.clock = clock;
        this.accessTtl = accessTtl;
        this.dummyHash = passwords.encode(TokenTools.newToken());
    }

    @Transactional
    public LoginResult login(String email, String password, ClientInfo client) {
        return login(email, password, client, id -> {});
    }

    @Transactional
    public LoginResult login(
            String email, String password, ClientInfo client, Consumer<UUID> guard) {
        limits.check("login-ip", client.ip(), 20, Duration.ofMinutes(5));
        limits.check("login-email", TokenTools.email(email), 5, Duration.ofMinutes(15));
        UserEntity user =
                users.findByEmailIgnoreCase(TokenTools.email(email))
                        .filter(UserEntity::isActive)
                        .filter(u -> u.getEmailVerifiedAt() != null)
                        .orElse(null);
        if (!passwords.matches(password, user == null ? dummyHash : user.getPasswordHash())
                || user == null) throw AuthProblem.unauthorized();
        limits.clear("login-email", TokenTools.email(email));
        return startSession(user, client, guard);
    }

    @Transactional
    public LoginResult startSession(UserEntity user, ClientInfo client) {
        return startSession(user, client, id -> {});
    }

    @Transactional
    public LoginResult startSession(UserEntity user, ClientInfo client, Consumer<UUID> guard) {
        guard.accept(user.getId());
        if (twoFactor.enabled(user.getId())) {
            String challenge = twoFactor.challenge(user, client);
            return new Challenge(true, challenge, twoFactor.challengeTtlSeconds());
        }
        return open(user, client);
    }

    @Transactional(noRollbackFor = AuthProblem.class)
    public TokenPair loginTwoFactor(
            String challenge, String code, String recoveryCode, ClientInfo client) {
        return loginTwoFactor(challenge, code, recoveryCode, client, id -> {});
    }

    @Transactional(noRollbackFor = AuthProblem.class)
    public TokenPair loginTwoFactor(
            String challenge,
            String code,
            String recoveryCode,
            ClientInfo client,
            Consumer<UUID> guard) {
        UUID userId = twoFactor.verifyChallenge(challenge, code, recoveryCode, client, guard);
        return open(users.findById(userId).orElseThrow(AuthProblem::unauthorized), client);
    }

    @Transactional
    public TokenPair open(UserEntity user, ClientInfo client) {
        SessionService.Issued issued = sessions.create(user, client);
        return pair(user.getId(), issued);
    }

    @Transactional(noRollbackFor = AuthProblem.class)
    public TokenPair refresh(String raw, ClientInfo client) {
        SessionService.Issued issued = sessions.rotate(raw, client);
        return pair(issued.session().getUser().getId(), issued);
    }

    @Transactional
    public void logout(String raw) {
        sessions.revokeByRefresh(raw);
    }

    public String accessToken(UUID userId, UUID sessionId) {
        Instant now = clock.instant();
        JwtClaimsSet claims =
                JwtClaimsSet.builder()
                        .issuer(ISSUER)
                        .subject(userId.toString())
                        .audience(List.of("ites-portal"))
                        .issuedAt(now)
                        .expiresAt(now.plus(accessTtl))
                        .id(UUID.randomUUID().toString())
                        .claim("sid", sessionId.toString())
                        .claim("token_use", "access")
                        .build();
        return encoder.encode(
                        JwtEncoderParameters.from(
                                JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }

    private TokenPair pair(UUID userId, SessionService.Issued issued) {
        return new TokenPair(
                accessToken(userId, issued.session().getId()),
                issued.refreshToken(),
                accessTtl.toSeconds());
    }
}

package br.com.ites.server.services.User.Auth;

import br.com.ites.server.models.User.EmailTokenEntity;
import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.repositories.User.EmailTokenRepository;
import br.com.ites.server.repositories.User.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.function.Consumer;

/** Consome links de recuperação uma única vez e encerra sessões após a troca de senha. */
@Service
public class PasswordResetService {
    private final EmailTokenRepository tokens;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final PasswordPolicy policy;
    private final SessionService sessions;
    private final AuthService auth;
    private final AuthMailer mailer;
    private final AuthRateLimiter limits;
    private final Clock clock;
    private final Duration ttl;
    private final Duration cooldown;

    public PasswordResetService(
            EmailTokenRepository tokens,
            UserRepository users,
            PasswordEncoder passwords,
            PasswordPolicy policy,
            SessionService sessions,
            AuthService auth,
            AuthMailer mailer,
            AuthRateLimiter limits,
            Clock clock,
            @Value("${auth.reset-link-ttl}") Duration ttl,
            @Value("${auth.resend-cooldown}") Duration cooldown) {
        this.tokens = tokens;
        this.users = users;
        this.passwords = passwords;
        this.policy = policy;
        this.sessions = sessions;
        this.auth = auth;
        this.mailer = mailer;
        this.limits = limits;
        this.clock = clock;
        this.ttl = ttl;
        this.cooldown = cooldown;
    }

    @Transactional
    public void forgot(String rawEmail, ClientInfo client) {
        String email = TokenTools.email(rawEmail);
        Instant now = clock.instant();
        limits.check("reset-ip", client.ip(), 10, Duration.ofHours(1));
        UserEntity user =
                users.findByEmailIgnoreCase(email).filter(UserEntity::isActive).orElse(null);
        if (user == null) return;
        boolean waiting =
                tokens.findFirstByEmailAndPurposeOrderByCreatedAtDesc(
                                email, EmailTokenEntity.Purpose.PASSWORD_RESET)
                        .map(t -> t.getCreatedAt().plus(cooldown).isAfter(now))
                        .orElse(false);
        if (waiting) return;
        limits.check("reset-email", email, 3, Duration.ofHours(1));
        String raw = TokenTools.newToken();
        tokens.save(
                new EmailTokenEntity(
                        EmailTokenEntity.Purpose.PASSWORD_RESET,
                        TokenTools.hash(raw),
                        email,
                        user.getId(),
                        now,
                        now.plus(ttl),
                        client.ip()));
        mailer.reset(email, raw);
    }

    @Transactional(readOnly = true)
    public String verify(String raw, ClientInfo client) {
        limits.check("token-ip", client.ip(), 30, Duration.ofMinutes(5));
        return usable(raw).getEmail();
    }

    @Transactional
    public AuthService.LoginResult reset(String raw, String password, ClientInfo client) {
        return reset(raw, password, client, id -> {});
    }

    @Transactional
    public AuthService.LoginResult reset(
            String raw, String password, ClientInfo client, Consumer<UUID> guard) {
        limits.check("token-ip", client.ip(), 30, Duration.ofMinutes(5));
        EmailTokenEntity token = usable(raw);
        UserEntity user =
                users.findById(token.getUserId())
                        .filter(UserEntity::isActive)
                        .orElseThrow(AuthProblem::invalidToken);
        policy.validate(password, user.getEmail(), user.getFirstName(), user.getLastName());
        guard.accept(user.getId());
        Instant now = clock.instant();
        if (tokens.consume(token.getId(), now) != 1) throw AuthProblem.invalidToken();
        tokens.consumeAll(user.getEmail(), EmailTokenEntity.Purpose.PASSWORD_RESET, now);
        user.changePassword(passwords.encode(password), now);
        users.update(user);
        sessions.revokeOthers(user.getId(), null, "PASSWORD_RESET");
        mailer.notice(
                user.getEmail(),
                "Senha alterada",
                "Sua senha foi alterada e as sessões anteriores foram encerradas.");
        return auth.startSession(user, client, guard);
    }

    private EmailTokenEntity usable(String raw) {
        EmailTokenEntity token =
                tokens.findByTokenHashAndPurpose(
                                TokenTools.hash(raw), EmailTokenEntity.Purpose.PASSWORD_RESET)
                        .orElseThrow(AuthProblem::invalidToken);
        if (token.getConsumedAt() != null) throw AuthProblem.invalidToken();
        if (!clock.instant().isBefore(token.getExpiresAt())) throw AuthProblem.expiredToken();
        return token;
    }
}

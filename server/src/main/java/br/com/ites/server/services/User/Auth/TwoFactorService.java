package br.com.ites.server.services.User.Auth;

import br.com.ites.server.models.User.EmailTokenEntity;
import br.com.ites.server.models.User.RecoveryCodeEntity;
import br.com.ites.server.models.User.TwoFactorEntity;
import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.repositories.User.EmailTokenRepository;
import br.com.ites.server.repositories.User.RecoveryCodeRepository;
import br.com.ites.server.repositories.User.TwoFactorRepository;
import br.com.ites.server.repositories.User.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;

/** Gerencia TOTP, códigos de recuperação e desafios de login com consumo único. */
@Service
public class TwoFactorService {
    public record Status(boolean enabled, Instant enabledAt, long recoveryCodesRemaining) {}

    public record Setup(String uri, String secret) {}

    public record Recovery(List<String> codes, Instant enabledAt) {}

    private final TwoFactorRepository factors;
    private final RecoveryCodeRepository recovery;
    private final EmailTokenRepository tokens;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final TotpCrypto crypto;
    private final AuthRateLimiter limits;
    private final AuthMailer mailer;
    private final Clock clock;
    private final Duration challengeTtl;

    public TwoFactorService(
            TwoFactorRepository factors,
            RecoveryCodeRepository recovery,
            EmailTokenRepository tokens,
            UserRepository users,
            PasswordEncoder passwords,
            TotpCrypto crypto,
            AuthRateLimiter limits,
            AuthMailer mailer,
            Clock clock,
            @Value("${auth.two-factor-challenge-ttl}") Duration challengeTtl) {
        this.factors = factors;
        this.recovery = recovery;
        this.tokens = tokens;
        this.users = users;
        this.passwords = passwords;
        this.crypto = crypto;
        this.limits = limits;
        this.mailer = mailer;
        this.clock = clock;
        this.challengeTtl = challengeTtl;
    }

    @Transactional(readOnly = true)
    public Status status(UUID userId) {
        TwoFactorEntity tf =
                factors.findById(userId).filter(TwoFactorEntity::isEnabled).orElse(null);
        return tf == null
                ? new Status(false, null, 0)
                : new Status(
                        true, tf.getEnabledAt(), recovery.countByUserIdAndUsedAtIsNull(userId));
    }

    @Transactional(readOnly = true)
    public boolean enabled(UUID userId) {
        return factors.findById(userId).map(TwoFactorEntity::isEnabled).orElse(false);
    }

    public long challengeTtlSeconds() {
        return challengeTtl.toSeconds();
    }

    @Transactional
    public Setup start(UUID userId, String password) {
        limits.check("2fa-user", userId.toString(), 10, Duration.ofMinutes(15));
        UserEntity user = verifyPassword(userId, password);
        TwoFactorEntity tf = factors.findById(userId).orElse(null);
        if (tf != null && tf.isEnabled())
            throw problem("TWO_FACTOR_ALREADY_ENABLED", "2FA já está ativa.");
        byte[] secret = TotpSupport.newSecret();
        String encoded = crypto.encrypt(secret, userId);
        if (tf == null) tf = new TwoFactorEntity(userId, encoded, clock.instant());
        else tf.reset(encoded, clock.instant());
        factors.save(tf);
        String base32 = TotpSupport.base32(secret);
        return new Setup(TotpSupport.uri(user.getEmail(), base32), base32);
    }

    @Transactional
    public Recovery confirm(UUID userId, String code) {
        limits.check("2fa-user", userId.toString(), 10, Duration.ofMinutes(15));
        TwoFactorEntity tf =
                factors.findById(userId)
                        .orElseThrow(
                                () ->
                                        problem(
                                                "TWO_FACTOR_NOT_STARTED",
                                                "Inicie a configuração novamente."));
        if (tf.isEnabled()) throw problem("TWO_FACTOR_ALREADY_ENABLED", "2FA já está ativa.");
        if (!verifyTotp(tf, code)) throw invalidCode();
        tf = factors.findById(userId).orElseThrow(AuthProblem::unauthorized);
        tf.enable(clock.instant());
        factors.save(tf);
        Recovery result = replaceRecoveryCodes(userId, tf.getEnabledAt());
        UserEntity user = users.findById(userId).orElseThrow(AuthProblem::unauthorized);
        mailer.notice(
                user.getEmail(),
                "2FA ativada",
                "A verificação em duas etapas foi ativada na sua conta.");
        return result;
    }

    @Transactional
    public Recovery regenerate(UUID userId, String password, String code) {
        TwoFactorEntity tf = verifyPasswordAndCode(userId, password, code);
        return replaceRecoveryCodes(userId, tf.getEnabledAt());
    }

    @Transactional
    public void disable(UUID userId, String password, String code) {
        verifyPasswordAndCode(userId, password, code);
        recovery.deleteByUserId(userId);
        factors.deleteById(userId);
        UserEntity user = users.findById(userId).orElseThrow(AuthProblem::unauthorized);
        mailer.notice(
                user.getEmail(),
                "2FA desativada",
                "A verificação em duas etapas foi desativada na sua conta.");
    }

    @Transactional
    public void verifySensitive(UUID userId, String code) {
        TwoFactorEntity tf =
                factors.findById(userId).filter(TwoFactorEntity::isEnabled).orElse(null);
        if (tf == null) return;
        if (code == null || !verifyTotp(tf, code)) throw invalidCode();
    }

    @Transactional
    public String challenge(UserEntity user, ClientInfo client) {
        String raw = TokenTools.newToken();
        Instant now = clock.instant();
        tokens.save(
                new EmailTokenEntity(
                        EmailTokenEntity.Purpose.LOGIN_2FA,
                        TokenTools.hash(raw),
                        user.getEmail(),
                        user.getId(),
                        now,
                        now.plus(challengeTtl),
                        client.ip()));
        return raw;
    }

    /** Mantém a contagem de falhas mesmo quando a verificação rejeita o código. */
    @Transactional(noRollbackFor = AuthProblem.class)
    public UUID verifyChallenge(
            String raw, String code, String recoveryCode, ClientInfo client, Consumer<UUID> guard) {
        limits.check("login-2fa-ip", client.ip(), 20, Duration.ofMinutes(5));
        EmailTokenEntity token =
                tokens.findByTokenHashAndPurpose(
                                TokenTools.hash(raw), EmailTokenEntity.Purpose.LOGIN_2FA)
                        .orElseThrow(AuthProblem::invalidToken);
        Instant now = clock.instant();
        if (token.getConsumedAt() != null) throw AuthProblem.invalidToken();
        if (!now.isBefore(token.getExpiresAt())) throw AuthProblem.expiredToken();
        UserEntity user =
                users.findById(token.getUserId())
                        .filter(UserEntity::isActive)
                        .orElseThrow(AuthProblem::invalidToken);
        guard.accept(user.getId());
        TwoFactorEntity tf =
                factors.findById(user.getId())
                        .filter(TwoFactorEntity::isEnabled)
                        .orElseThrow(AuthProblem::invalidToken);
        boolean ok =
                recoveryCode != null && !recoveryCode.isBlank()
                        ? useRecovery(user.getId(), recoveryCode)
                        : verifyTotp(tf, code);
        if (!ok) {
            if (tokens.incrementAttempts(token.getId()) >= 5) tokens.consume(token.getId(), now);
            throw new AuthProblem(
                    HttpStatus.UNAUTHORIZED, "INVALID_TWO_FACTOR_CODE", "Código incorreto.");
        }
        if (tokens.consume(token.getId(), now) != 1) throw AuthProblem.invalidToken();
        return user.getId();
    }

    private TwoFactorEntity verifyPasswordAndCode(UUID userId, String password, String code) {
        limits.check("2fa-user", userId.toString(), 10, Duration.ofMinutes(15));
        verifyPassword(userId, password);
        TwoFactorEntity tf =
                factors.findById(userId)
                        .filter(TwoFactorEntity::isEnabled)
                        .orElseThrow(
                                () -> problem("TWO_FACTOR_NOT_ENABLED", "2FA não está ativa."));
        boolean ok =
                code != null && code.replaceAll("\\s", "").matches("[0-9]{6}")
                        ? verifyTotp(tf, code.replaceAll("\\s", ""))
                        : useRecovery(userId, code);
        if (!ok) throw invalidCode();
        return factors.findById(userId).orElseThrow(AuthProblem::unauthorized);
    }

    private boolean verifyTotp(TwoFactorEntity tf, String code) {
        if (code == null) return false;
        long step =
                TotpSupport.verify(
                        crypto.decrypt(tf.getSecretEnc(), tf.getUserId()),
                        code,
                        clock.instant(),
                        tf.getLastStep());
        return step >= 0 && factors.advanceStep(tf.getUserId(), step) == 1;
    }

    private boolean useRecovery(UUID userId, String code) {
        String normalized = TotpSupport.normalizeRecovery(code);
        return normalized.length() == 8
                && recovery.use(userId, TokenTools.hash(normalized), clock.instant()) == 1;
    }

    private Recovery replaceRecoveryCodes(UUID userId, Instant enabledAt) {
        recovery.deleteByUserId(userId);
        List<String> codes = TotpSupport.recoveryCodes();
        recovery.saveAll(
                codes.stream()
                        .map(
                                c ->
                                        new RecoveryCodeEntity(
                                                userId,
                                                TokenTools.hash(TotpSupport.normalizeRecovery(c))))
                        .toList());
        return new Recovery(codes, enabledAt);
    }

    private UserEntity verifyPassword(UUID userId, String password) {
        UserEntity user =
                users.findById(userId)
                        .filter(UserEntity::isActive)
                        .orElseThrow(AuthProblem::unauthorized);
        if (password == null || !passwords.matches(password, user.getPasswordHash()))
            throw AuthProblem.wrongPassword();
        return user;
    }

    private static AuthProblem invalidCode() {
        return new AuthProblem(
                HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_TWO_FACTOR_CODE", "Código incorreto.");
    }

    private static AuthProblem problem(String code, String message) {
        return new AuthProblem(HttpStatus.CONFLICT, code, message);
    }
}

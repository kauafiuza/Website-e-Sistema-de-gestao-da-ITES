package br.com.ites.server.services.User.Auth;

import br.com.ites.server.models.User.EmailTokenEntity;
import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.repositories.User.EmailTokenRepository;
import br.com.ites.server.repositories.User.RecoveryCodeRepository;
import br.com.ites.server.repositories.User.RefreshTokenRepository;
import br.com.ites.server.repositories.User.TwoFactorRepository;
import br.com.ites.server.repositories.User.UserRepository;
import br.com.ites.server.repositories.User.UserSessionRepository;
import br.com.ites.server.repositories.Web.Project.ProjectRepository;
import br.com.ites.server.services.Organization.OrganizationAuditEventService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Mantém alterações sensíveis da conta e revoga sessões quando credenciais ou e-mail mudam. */
@Service
public class AccountService {
    public record Profile(UUID id, String firstName, String lastName, String email) {}
    private record AuditTarget(UUID organizationId, UUID targetId) {}

    private final UserRepository users;
    private final ProjectRepository projects;
    private final RefreshTokenRepository refresh;
    private final UserSessionRepository sessionRepo;
    private final EmailTokenRepository tokens;
    private final TwoFactorRepository factors;
    private final RecoveryCodeRepository recovery;
    private final SessionService sessions;
    private final AuthService auth;
    private final AuthMailer mailer;
    private final TwoFactorService twoFactor;
    private final PasswordPolicy policy;
    private final PasswordEncoder passwords;
    private final AuthRateLimiter limits;
    private final Clock clock;
    private final Duration emailTtl;
    private final JdbcTemplate jdbc;
    private final OrganizationAuditEventService auditEvents;

    public AccountService(
            UserRepository users,
            ProjectRepository projects,
            RefreshTokenRepository refresh,
            UserSessionRepository sessionRepo,
            EmailTokenRepository tokens,
            TwoFactorRepository factors,
            RecoveryCodeRepository recovery,
            SessionService sessions,
            AuthService auth,
            AuthMailer mailer,
            TwoFactorService twoFactor,
            PasswordPolicy policy,
            PasswordEncoder passwords,
            AuthRateLimiter limits,
            Clock clock,
            @Value("${auth.email-change-link-ttl}") Duration emailTtl,
            JdbcTemplate jdbc,
            OrganizationAuditEventService auditEvents) {
        this.users = users;
        this.projects = projects;
        this.refresh = refresh;
        this.sessionRepo = sessionRepo;
        this.tokens = tokens;
        this.factors = factors;
        this.recovery = recovery;
        this.sessions = sessions;
        this.auth = auth;
        this.mailer = mailer;
        this.twoFactor = twoFactor;
        this.policy = policy;
        this.passwords = passwords;
        this.limits = limits;
        this.clock = clock;
        this.emailTtl = emailTtl;
        this.jdbc = jdbc;
        this.auditEvents = auditEvents;
    }

    @Transactional
    public AuthService.TokenPair changePassword(
            UUID userId, String current, String next, String code, ClientInfo client) {
        UserEntity user = verifyPassword(userId, current);
        twoFactor.verifySensitive(userId, code);
        policy.validate(next, user.getEmail(), user.getFirstName(), user.getLastName());
        user.changePassword(passwords.encode(next), clock.instant());
        users.update(user);
        sessions.revokeOthers(userId, null, "PASSWORD_CHANGED");
        mailer.notice(
                user.getEmail(),
                "Senha alterada",
                "Sua senha foi alterada e suas sessões anteriores foram encerradas.");
        return auth.open(user, client);
    }

    @Transactional(readOnly = true)
    public Profile profile(UUID userId) {
        return findProfile(userId).orElseThrow(AuthProblem::unauthorized);
    }

    @Transactional(readOnly = true)
    public Optional<Profile> findProfile(UUID userId) {
        return users.findById(userId)
                .filter(UserEntity::isActive)
                .map(
                        user ->
                                new Profile(
                                        user.getId(),
                                        user.getFirstName(),
                                        user.getLastName(),
                                        user.getEmail()));
    }

    @Transactional
    public void requestEmailChange(UUID userId, String newEmail, String password, String code) {
        limits.check("email-change-user", userId.toString(), 5, Duration.ofHours(1));
        UserEntity user = verifyPassword(userId, password);
        twoFactor.verifySensitive(userId, code);
        String normalized = TokenTools.email(newEmail);
        if (normalized.equals(user.getEmail()) || users.existsByEmailIgnoreCase(normalized))
            throw new AuthProblem(HttpStatus.CONFLICT, "EMAIL_TAKEN", "E-mail indisponível.");
        Instant now = clock.instant();
        String raw = TokenTools.newToken();
        tokens.save(
                new EmailTokenEntity(
                        EmailTokenEntity.Purpose.EMAIL_CHANGE,
                        TokenTools.hash(raw),
                        normalized,
                        userId,
                        now,
                        now.plus(emailTtl),
                        null));
        mailer.emailChange(normalized, raw);
    }

    @Transactional
    public String confirmEmailChange(String raw) {
        EmailTokenEntity token =
                tokens.findByTokenHashAndPurpose(
                                TokenTools.hash(raw), EmailTokenEntity.Purpose.EMAIL_CHANGE)
                        .orElseThrow(AuthProblem::invalidToken);
        Instant now = clock.instant();
        if (token.getConsumedAt() != null) throw AuthProblem.invalidToken();
        if (!now.isBefore(token.getExpiresAt())) throw AuthProblem.expiredToken();
        if (users.existsByEmailIgnoreCase(token.getEmail()))
            throw new AuthProblem(HttpStatus.CONFLICT, "EMAIL_TAKEN", "E-mail indisponível.");
        if (tokens.consume(token.getId(), now) != 1) throw AuthProblem.invalidToken();
        UserEntity user =
                users.findById(token.getUserId())
                        .filter(UserEntity::isActive)
                        .orElseThrow(AuthProblem::invalidToken);
        String old = user.getEmail();
        user.changeEmail(token.getEmail(), now);
        users.update(user);
        sessions.revokeOthers(user.getId(), null, "EMAIL_CHANGED");
        mailer.notice(old, "E-mail alterado", "O e-mail da sua conta foi alterado.");
        mailer.notice(
                user.getEmail(),
                "Novo e-mail confirmado",
                "Este endereço agora está associado à sua conta.");
        return user.getEmail();
    }

    @Transactional
    public void deleteAccount(UUID userId, String password, String code) {
        UserEntity user = verifyPassword(userId, password);
        twoFactor.verifySensitive(userId, code);
        String email = user.getEmail();
        List<AuditTarget> ownedProjects = jdbc.query("SELECT organization_id, id FROM projects WHERE owner_id = ?",
                (rs, row) -> new AuditTarget(rs.getObject("organization_id", UUID.class),
                        rs.getObject("id", UUID.class)), userId);
        for (AuditTarget project : ownedProjects)
            auditEvents.append(project.organizationId(), userId, "PROJECT_DELETED", "PROJECT", project.targetId());
        List<UUID> organizations = jdbc.query("SELECT organization_id FROM organization_memberships "
                        + "WHERE user_id = ? AND state = 'ACTIVE'",
                (rs, row) -> rs.getObject("organization_id", UUID.class), userId);
        for (UUID organizationId : organizations)
            auditEvents.append(organizationId, userId, "MEMBERSHIP_REVOKED", "MEMBERSHIP", userId);
        projects.deleteByOwner_Id(userId);
        refresh.deleteByUser_Id(userId);
        sessionRepo.deleteByUser_Id(userId);
        tokens.deleteByUserId(userId);
        recovery.deleteByUserId(userId);
        factors.deleteById(userId);
        users.delete(user);
        mailer.notice(email, "Conta encerrada", "Sua conta e seus projetos foram excluídos.");
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
}

package br.com.ites.server.services.User.Auth;

import br.com.ites.server.models.User.EmailTokenEntity;
import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.repositories.User.EmailTokenRepository;
import br.com.ites.server.repositories.User.UserRepository;
import br.com.ites.server.repositories.Organization.OrganizationRepository;
import br.com.ites.server.services.Organization.OrganizationAuthorizationService;
import br.com.ites.server.services.Organization.OrganizationFeatureService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.function.Consumer;

/** Conduz o cadastro por link de e-mail e cria a conta após consumir o link. */
@Service
public class SignupService {
    public record LinkSent(Instant resendAvailableAt) {}

    private final EmailTokenRepository tokens;
    private final UserRepository users;
    private final OrganizationRepository organizations;
    private final OrganizationAuthorizationService authorization;
    private final OrganizationFeatureService organizationFeatures;
    private final AuthService auth;
    private final AuthMailer mailer;
    private final PasswordPolicy policy;
    private final PasswordEncoder passwords;
    private final AuthRateLimiter limits;
    private final Clock clock;
    private final Duration ttl;
    private final Duration cooldown;

    public SignupService(
            EmailTokenRepository tokens,
            UserRepository users,
            OrganizationRepository organizations,
            OrganizationAuthorizationService authorization,
            OrganizationFeatureService organizationFeatures,
            AuthService auth,
            AuthMailer mailer,
            PasswordPolicy policy,
            PasswordEncoder passwords,
            AuthRateLimiter limits,
            Clock clock,
            @Value("${auth.signup-link-ttl}") Duration ttl,
            @Value("${auth.resend-cooldown}") Duration cooldown) {
        this.tokens = tokens;
        this.users = users;
        this.organizations = organizations;
        this.authorization = authorization;
        this.organizationFeatures = organizationFeatures;
        this.auth = auth;
        this.mailer = mailer;
        this.policy = policy;
        this.passwords = passwords;
        this.limits = limits;
        this.clock = clock;
        this.ttl = ttl;
        this.cooldown = cooldown;
    }

    @Transactional
    public LinkSent start(String rawEmail, ClientInfo client, boolean resend) {
        String email = TokenTools.email(rawEmail);
        Instant now = clock.instant();
        limits.check("signup-ip", client.ip(), 10, Duration.ofHours(1));
        Instant available =
                tokens.findFirstByEmailAndPurposeOrderByCreatedAtDesc(
                                email, EmailTokenEntity.Purpose.SIGNUP)
                        .map(t -> t.getCreatedAt().plus(cooldown))
                        .orElse(now);
        if (available.isAfter(now)) {
            if (resend)
                throw new AuthProblem(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "RESEND_COOLDOWN",
                        "Aguarde antes de reenviar.");
            return new LinkSent(available);
        }
        limits.check("signup-email", email, 5, Duration.ofHours(1));
        String raw = TokenTools.newToken();
        tokens.save(
                new EmailTokenEntity(
                        EmailTokenEntity.Purpose.SIGNUP,
                        TokenTools.hash(raw),
                        email,
                        null,
                        now,
                        now.plus(ttl),
                        client.ip()));
        if (users.existsByEmailIgnoreCase(email)) mailer.accountExists(email);
        else mailer.signup(email, raw);
        return new LinkSent(now.plus(cooldown));
    }

    @Transactional(readOnly = true)
    public String verify(String raw, ClientInfo client) {
        limits.check("token-ip", client.ip(), 30, Duration.ofMinutes(5));
        EmailTokenEntity token = usable(raw);
        if (users.existsByEmailIgnoreCase(token.getEmail())) throw AuthProblem.invalidToken();
        return token.getEmail();
    }

    @Transactional
    public AuthService.TokenPair complete(
            String raw,
            String firstName,
            String lastName,
            String password,
            boolean acceptTerms,
            ClientInfo client) {
        return complete(raw, firstName, lastName, password, acceptTerms, client, id -> {});
    }

    @Transactional
    public AuthService.TokenPair complete(
            String raw,
            String firstName,
            String lastName,
            String password,
            boolean acceptTerms,
            ClientInfo client,
            Consumer<UUID> guard) {
        limits.check("token-ip", client.ip(), 30, Duration.ofMinutes(5));
        EmailTokenEntity token = usable(raw);
        if (!acceptTerms)
            throw new AuthProblem(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "TERMS_REQUIRED",
                    "Aceite os termos para criar a conta.");
        policy.validate(password, token.getEmail(), firstName, lastName);
        guard.accept(null);
        if (tokens.consume(token.getId(), clock.instant()) != 1) throw AuthProblem.invalidToken();
        UserEntity user = createAccount(token.getEmail(), firstName, lastName, password, true);
        mailer.notice(
                user.getEmail(), "Bem-vindo ao ITES", "Sua conta foi criada com sucesso.");
        return auth.open(user, client);
    }

    /** Cria uma conta verificada por solicitação administrativa, sem exigir envio de e-mail. */
    @Transactional
    public UserEntity provision(String rawEmail, String firstName, String lastName, String password) {
        String email = TokenTools.email(rawEmail);
        policy.validate(password, email, firstName, lastName);
        return createAccount(email, firstName, lastName, password, false);
    }

    private UserEntity createAccount(
            String email, String firstName, String lastName, String password, boolean acceptTerms) {
        if (users.existsByEmailIgnoreCase(email))
            throw new AuthProblem(HttpStatus.CONFLICT, "EMAIL_TAKEN", "E-mail já cadastrado.");
        Instant now = clock.instant();
        UserEntity user =
                new UserEntity(
                        firstName.strip(),
                        lastName.strip(),
                        email,
                        passwords.encode(password));
        user.verifyEmail(now);
        if (acceptTerms) user.acceptTerms(now);
        user.changePassword(user.getPasswordHash(), now);
        try {
            user = users.insert(user);
            UUID organizationId = organizations.createPersonalFor(user);
            organizationFeatures.initializeDefaults(organizationId);
            authorization.initializeOwner(user.getId(), organizationId);
        } catch (DataIntegrityViolationException e) {
            throw new AuthProblem(HttpStatus.CONFLICT, "EMAIL_TAKEN", "E-mail já cadastrado.");
        }
        return user;
    }

    private EmailTokenEntity usable(String raw) {
        EmailTokenEntity token =
                tokens.findByTokenHashAndPurpose(
                                TokenTools.hash(raw), EmailTokenEntity.Purpose.SIGNUP)
                        .orElseThrow(AuthProblem::invalidToken);
        if (token.getConsumedAt() != null) throw AuthProblem.invalidToken();
        if (!clock.instant().isBefore(token.getExpiresAt())) throw AuthProblem.expiredToken();
        return token;
    }
}

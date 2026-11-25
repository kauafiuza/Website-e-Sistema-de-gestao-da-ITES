package br.com.ites.server.services.Ites;

import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.repositories.User.UserRepository;
import br.com.ites.server.services.User.Auth.SignupService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Provisiona o administrador inicial a partir das variáveis de ambiente configuradas. */
@Component
@Order(0)
public class InitialAdministratorProvisioner implements ApplicationRunner {
    private final String email;
    private final String password;
    private final SignupService accounts;
    private final UserRepository users;
    private final JdbcTemplate jdbc;

    public InitialAdministratorProvisioner(
            @Value("${app.initial-admin.email:}") String email,
            @Value("${app.initial-admin.password:}") String password,
            SignupService accounts,
            UserRepository users,
            JdbcTemplate jdbc) {
        this.email = email;
        this.password = password;
        this.accounts = accounts;
        this.users = users;
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        boolean hasEmail = email != null && !email.isBlank();
        boolean hasPassword = password != null && !password.isBlank();
        if (!hasEmail && !hasPassword) return;
        if (!hasEmail || !hasPassword)
            throw new IllegalStateException(
                    "INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD devem ser configurados juntos.");

        String normalizedEmail = email.trim().toLowerCase(java.util.Locale.ROOT);
        UserEntity admin =
                users.findByEmailIgnoreCase(normalizedEmail)
                        .orElseGet(
                                () ->
                                        accounts.provision(
                                                normalizedEmail, "Admin", "Portal", password));
        if (!admin.isActive())
            throw new IllegalStateException("A conta configurada como administrador está inativa.");
        if (admin.getEmailVerifiedAt() == null) {
            admin.verifyEmail(Instant.now());
            users.update(admin);
        }

        UUID roleId =
                jdbc.queryForObject(
                        "SELECT id FROM app_roles WHERE code = 'ADMINISTRATOR'", UUID.class);
        int assigned =
                jdbc.update(
                        "INSERT INTO app_user_roles(user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                        admin.getId(),
                        roleId);
        if (assigned > 0)
            jdbc.update(
                    "INSERT INTO app_grant_events(actor_id, subject_id, role_id, action) VALUES (?, ?, ?, 'GRANT')",
                    admin.getId(),
                    admin.getId(),
                    roleId);
    }
}

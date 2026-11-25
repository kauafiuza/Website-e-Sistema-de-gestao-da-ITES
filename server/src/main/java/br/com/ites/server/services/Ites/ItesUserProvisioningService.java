package br.com.ites.server.services.Ites;

import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.services.User.Auth.SignupService;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cria contas de solicitantes sem depender de confirmação por e-mail. */
@Service
public class ItesUserProvisioningService {
    public record CreatedUser(UUID id, String firstName, String lastName, String email) {}

    private final SignupService accounts;
    private final JdbcTemplate jdbc;

    public ItesUserProvisioningService(SignupService accounts, JdbcTemplate jdbc) {
        this.accounts = accounts;
        this.jdbc = jdbc;
    }

    @Transactional
    public CreatedUser create(
            UUID actorId, String firstName, String lastName, String email, String password) {
        UserEntity user = accounts.provision(email, firstName, lastName, password);
        UUID requesterRoleId =
                jdbc.queryForObject(
                        "SELECT id FROM app_roles WHERE code = 'REQUESTER'", UUID.class);
        jdbc.update(
                "INSERT INTO app_user_roles(user_id, role_id) VALUES (?, ?)",
                user.getId(),
                requesterRoleId);
        jdbc.update(
                "INSERT INTO app_grant_events(actor_id, subject_id, role_id, action) VALUES (?, ?, ?, 'GRANT')",
                actorId,
                user.getId(),
                requesterRoleId);
        return new CreatedUser(
                user.getId(), user.getFirstName(), user.getLastName(), user.getEmail());
    }
}

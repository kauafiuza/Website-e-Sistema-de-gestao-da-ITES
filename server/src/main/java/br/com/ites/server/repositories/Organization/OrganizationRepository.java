package br.com.ites.server.repositories.Organization;

import br.com.ites.server.models.User.UserEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class OrganizationRepository {
    private final JdbcTemplate jdbc;

    public OrganizationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UUID createPersonalFor(UserEntity user) {
        UUID organizationId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        String organizationName = user.getCompanyName() == null || user.getCompanyName().isBlank()
                ? user.getFullName() + " workspace"
                : user.getCompanyName().strip();
        if (organizationName.length() > 150) organizationName = organizationName.substring(0, 150);
        jdbc.update("INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)",
                organizationId, organizationName, now);
        jdbc.update("INSERT INTO organization_memberships (organization_id, user_id, role, is_default, created_at) VALUES (?, ?, 'OWNER', true, ?)",
                organizationId, user.getId(), now);
        return organizationId;
    }

    public Optional<UUID> findDefaultOrganizationId(UUID userId) {
        return jdbc.query(
                "SELECT organization_id FROM organization_memberships WHERE user_id = ? AND is_default AND state = 'ACTIVE'",
                (rs, row) -> rs.getObject("organization_id", UUID.class), userId).stream().findFirst();
    }

    public List<Membership> findMemberships(UUID userId) {
        return jdbc.query("""
                SELECT o.id, o.name, m.role, m.is_default
                FROM organization_memberships m
                JOIN organizations o ON o.id = m.organization_id
                WHERE m.user_id = ? AND m.state = 'ACTIVE'
                ORDER BY m.is_default DESC, o.name, o.id
                """, (rs, row) -> new Membership(
                rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("role"),
                rs.getBoolean("is_default")), userId);
    }

    public List<Membership> findAllForAdministrator() {
        return jdbc.query("""
                SELECT o.id, o.name, 'ADMINISTRATOR' AS role, false AS is_default
                FROM organizations o ORDER BY o.name, o.id
                """, (rs, row) -> new Membership(rs.getObject("id", UUID.class), rs.getString("name"),
                rs.getString("role"), rs.getBoolean("is_default")));
    }

    public record Membership(UUID id, String name, String role, boolean isDefault) {}
}

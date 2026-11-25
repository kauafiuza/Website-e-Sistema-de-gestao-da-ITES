package br.com.ites.server.repositories.Organization;

import br.com.ites.server.models.Organization.GrantScopeType;
import br.com.ites.server.models.Organization.PermissionAction;
import br.com.ites.server.models.Organization.PermissionGrant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PermissionGrantRepository {
    private final JdbcTemplate jdbc;

    public PermissionGrantRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean isMember(UUID userId, UUID organizationId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = ? AND organization_id = ? AND state = 'ACTIVE')",
                Boolean.class, userId, organizationId));
    }

    public boolean organizationExists(UUID organizationId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM organizations WHERE id = ?)", Boolean.class, organizationId));
    }

    public boolean lockActiveMembership(UUID userId, UUID organizationId) {
        return !jdbc.query("""
                SELECT user_id FROM organization_memberships
                WHERE user_id = ? AND organization_id = ? AND state = 'ACTIVE'
                FOR SHARE
                """, (rs, row) -> rs.getObject("user_id", UUID.class), userId, organizationId).isEmpty();
    }

    public boolean allows(UUID userId, UUID organizationId, PermissionAction action,
            GrantScopeType scopeType, UUID resourceId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM organization_permission_grants g
                    WHERE g.beneficiary_user_id = ? AND g.organization_id = ?
                      AND g.action = ? AND g.state = 'ACTIVE'
                      AND (g.valid_until IS NULL OR g.valid_until > now())
                      AND ((g.scope_type = 'ORGANIZATION' AND g.scope_id = g.organization_id)
                           OR (g.scope_type = ? AND g.scope_id = ?))
                      AND NOT EXISTS (
                          WITH RECURSIVE ancestors AS (
                              SELECT parent_grant_id AS id
                              FROM organization_permission_grants WHERE id = g.id
                              UNION ALL
                              SELECT parent.parent_grant_id
                              FROM organization_permission_grants parent
                              JOIN ancestors child ON parent.id = child.id
                              WHERE parent.parent_grant_id IS NOT NULL
                          )
                          SELECT 1 FROM ancestors a
                          JOIN organization_permission_grants parent ON parent.id = a.id
                          WHERE parent.organization_id <> g.organization_id OR parent.state <> 'ACTIVE'
                             OR (parent.valid_until IS NOT NULL AND parent.valid_until <= now())
                      )
                      AND NOT EXISTS (
                          WITH RECURSIVE grant_lineage(id, authority_grant_id, issuer_user_id) AS (
                              SELECT id, authority_grant_id, issuer_user_id
                              FROM organization_permission_grants WHERE id = g.id
                              UNION ALL
                              SELECT parent.id, parent.authority_grant_id, parent.issuer_user_id
                              FROM organization_permission_grants child_row
                              JOIN grant_lineage child ON child.id = child_row.id
                              JOIN organization_permission_grants parent ON parent.id = child_row.parent_grant_id
                          )
                          SELECT 1 FROM grant_lineage lineage
                          JOIN organization_permission_grants authority ON authority.id = lineage.authority_grant_id
                          WHERE authority.organization_id <> g.organization_id
                             OR authority.action <> 'ORGANIZATION_GRANTS_MANAGE'
                             OR authority.scope_type <> 'ORGANIZATION'
                             OR authority.scope_id <> g.organization_id
                             OR authority.beneficiary_user_id <> lineage.issuer_user_id
                             OR authority.state <> 'ACTIVE'
                             OR (authority.valid_until IS NOT NULL AND authority.valid_until <= now())
                             OR EXISTS (
                                 WITH RECURSIVE authority_ancestors(id) AS (
                                     SELECT authority.parent_grant_id
                                     WHERE authority.parent_grant_id IS NOT NULL
                                     UNION ALL
                                     SELECT parent.parent_grant_id
                                     FROM organization_permission_grants parent
                                     JOIN authority_ancestors child ON parent.id = child.id
                                     WHERE parent.parent_grant_id IS NOT NULL
                                 )
                                 SELECT 1 FROM authority_ancestors ancestor
                                 JOIN organization_permission_grants parent ON parent.id = ancestor.id
                                 WHERE parent.organization_id <> g.organization_id OR parent.state <> 'ACTIVE'
                                    OR (parent.valid_until IS NOT NULL AND parent.valid_until <= now())
                             )
                      )
                )
                """, Boolean.class, userId, organizationId, action.name(), scopeType.name(), resourceId));
    }

    public List<UUID> findActiveProjectScopeIds(UUID userId, UUID organizationId, PermissionAction action) {
        return jdbc.query("""
                SELECT DISTINCT g.scope_id
                FROM organization_permission_grants g
                JOIN projects p ON p.id = g.scope_id AND p.organization_id = g.organization_id
                WHERE g.beneficiary_user_id = ? AND g.organization_id = ? AND g.action = ?
                  AND g.scope_type = 'PROJECT' AND g.state = 'ACTIVE'
                  AND (g.valid_until IS NULL OR g.valid_until > now())
                ORDER BY g.scope_id
                """, (rs, row) -> rs.getObject("scope_id", UUID.class),
                userId, organizationId, action.name());
    }

    public Optional<PermissionGrant> findForUpdate(UUID grantId, UUID organizationId) {
        return jdbc.query("SELECT * FROM organization_permission_grants WHERE id = ? AND organization_id = ? FOR UPDATE",
                (rs, row) -> map(rs), grantId, organizationId).stream().findFirst();
    }

    public Optional<PermissionGrant> find(UUID grantId, UUID organizationId) {
        return jdbc.query("SELECT * FROM organization_permission_grants WHERE id = ? AND organization_id = ?",
                (rs, row) -> map(rs), grantId, organizationId).stream().findFirst();
    }

    public List<PermissionGrant> list(UUID organizationId, int limit, int offset) {
        return jdbc.query("""
                SELECT * FROM organization_permission_grants WHERE organization_id = ?
                ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
                """, (rs, row) -> map(rs), organizationId, limit, offset);
    }

    public long count(UUID organizationId) {
        Long count = jdbc.queryForObject("SELECT count(*) FROM organization_permission_grants WHERE organization_id = ?",
                Long.class, organizationId);
        return count == null ? 0 : count;
    }

    public OffsetDateTime validityBound(UUID grantId) {
        return jdbc.queryForObject("""
                WITH RECURSIVE lineage(id) AS (
                    SELECT ?::uuid
                    UNION ALL
                    SELECT parent.parent_grant_id
                    FROM organization_permission_grants child
                    JOIN lineage ancestor ON ancestor.id = child.id
                    JOIN organization_permission_grants parent ON parent.id = child.parent_grant_id
                )
                SELECT min(g2.valid_until)
                FROM lineage JOIN organization_permission_grants g2 ON g2.id = lineage.id
                """, OffsetDateTime.class, grantId);
    }

    public void create(PermissionGrant grant) {
        jdbc.update("""
                INSERT INTO organization_permission_grants
                    (id, beneficiary_user_id, organization_id, action, scope_type, scope_id,
                     issuer_user_id, valid_until, state, can_delegate, parent_grant_id, authority_grant_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, now())
                """, grant.id(), grant.beneficiaryUserId(), grant.organizationId(), grant.action().name(),
                grant.scopeType().name(), grant.scopeId(), grant.issuerUserId(), grant.validUntil(),
                grant.canDelegate(), grant.parentGrantId(), grant.authorityGrantId());
    }

    public List<UUID> revokeTree(UUID grantId, UUID organizationId) {
        return jdbc.query("""
                WITH RECURSIVE descendants(id) AS (
                    SELECT id FROM organization_permission_grants WHERE id = ? AND organization_id = ?
                    UNION
                    SELECT child.id FROM organization_permission_grants child
                    JOIN descendants parent ON child.parent_grant_id = parent.id OR child.authority_grant_id = parent.id
                    WHERE child.organization_id = ?
                ), revoked AS (
                    UPDATE organization_permission_grants SET state = 'REVOKED', revoked_at = COALESCE(revoked_at, now())
                    WHERE id IN (SELECT id FROM descendants) AND state <> 'REVOKED'
                    RETURNING id
                )
                SELECT id FROM revoked ORDER BY id
                """, (rs, row) -> rs.getObject("id", UUID.class), grantId, organizationId, organizationId);
    }

    public Set<UUID> lockActiveMemberships(UUID actorId, UUID beneficiaryId, UUID organizationId) {
        return jdbc.query("""
                SELECT user_id, state FROM organization_memberships
                WHERE organization_id = ? AND (user_id = ? OR user_id = ?)
                ORDER BY user_id FOR UPDATE
                """, (rs, row) -> "ACTIVE".equals(rs.getString("state"))
                        ? rs.getObject("user_id", UUID.class) : null,
                organizationId, actorId, beneficiaryId).stream()
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
    }

    public boolean resourceExists(GrantScopeType scopeType, UUID resourceId, UUID organizationId) {
        String table = scopeType == GrantScopeType.PROJECT ? "projects" : "themes";
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM " + table + " WHERE id = ? AND organization_id = ?)",
                Boolean.class, resourceId, organizationId));
    }

    private static PermissionGrant map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new PermissionGrant(rs.getObject("id", UUID.class), rs.getObject("beneficiary_user_id", UUID.class),
                rs.getObject("organization_id", UUID.class), PermissionAction.valueOf(rs.getString("action")),
                GrantScopeType.valueOf(rs.getString("scope_type")), rs.getObject("scope_id", UUID.class),
                rs.getObject("issuer_user_id", UUID.class), rs.getObject("valid_until", OffsetDateTime.class),
                rs.getString("state"), rs.getBoolean("can_delegate"), rs.getObject("parent_grant_id", UUID.class),
                rs.getObject("authority_grant_id", UUID.class),
                rs.getObject("created_at", OffsetDateTime.class), rs.getObject("revoked_at", OffsetDateTime.class));
    }
}

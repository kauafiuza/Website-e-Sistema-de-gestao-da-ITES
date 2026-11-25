package br.com.ites.server.repositories.Organization;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class OrganizationAdministrationRepository {
    private final JdbcTemplate jdbc;

    public OrganizationAdministrationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Member> listMembers(UUID organizationId) {
        return jdbc.query("""
                SELECT u.id, u.first_name, u.last_name, u.email, m.role, m.state, m.created_at
                FROM organization_memberships m JOIN users u ON u.id = m.user_id
                WHERE m.organization_id = ?
                ORDER BY (m.state = 'ACTIVE') DESC, u.last_name, u.first_name, u.id
                """, (rs, row) -> new Member(rs.getObject("id", UUID.class), rs.getString("first_name"),
                rs.getString("last_name"), rs.getString("email"), rs.getString("role"),
                rs.getString("state"), rs.getObject("created_at", OffsetDateTime.class)), organizationId);
    }

    public List<Invitation> listInvitations(UUID organizationId) {
        return jdbc.query("""
                SELECT * FROM organization_invitations WHERE organization_id = ?
                ORDER BY created_at DESC, id DESC
                """, (rs, row) -> mapInvitation(rs), organizationId);
    }

    public Optional<String> organizationName(UUID organizationId) {
        return jdbc.query("SELECT name FROM organizations WHERE id = ?",
                (rs, row) -> rs.getString(1), organizationId).stream().findFirst();
    }

    public void lockOrganization(UUID organizationId) {
        jdbc.query("SELECT id FROM organizations WHERE id = ? FOR UPDATE",
                (rs, row) -> rs.getObject(1, UUID.class), organizationId);
    }

    public Optional<UUID> activeMemberIdByEmail(UUID organizationId, String email) {
        return jdbc.query("""
                SELECT m.user_id FROM organization_memberships m JOIN users u ON u.id = m.user_id
                WHERE m.organization_id = ? AND lower(u.email) = ? AND m.state = 'ACTIVE'
                """, (rs, row) -> rs.getObject(1, UUID.class), organizationId, email).stream().findFirst();
    }

    public boolean hasPendingInvitation(UUID organizationId, String email) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM organization_invitations
                WHERE organization_id = ? AND lower(email) = ? AND state = 'PENDING' AND expires_at > now())
                """, Boolean.class, organizationId, email));
    }

    public void expireInvitations(UUID organizationId) {
        jdbc.update("UPDATE organization_invitations SET state = 'EXPIRED' "
                + "WHERE organization_id = ? AND state = 'PENDING' AND expires_at <= now()", organizationId);
    }

    public Invitation createInvitation(UUID organizationId, String email, String tokenHash,
            UUID invitedBy, OffsetDateTime expiresAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO organization_invitations
                    (id, organization_id, email, role, token_hash, state, invited_by_user_id, expires_at)
                VALUES (?, ?, ?, 'MEMBER', ?, 'PENDING', ?, ?)
                """, id, organizationId, email, tokenHash, invitedBy, expiresAt);
        return findInvitation(id, organizationId).orElseThrow();
    }

    public Optional<Invitation> findInvitation(UUID id, UUID organizationId) {
        return jdbc.query("SELECT * FROM organization_invitations WHERE id = ? AND organization_id = ?",
                (rs, row) -> mapInvitation(rs), id, organizationId).stream().findFirst();
    }

    public Optional<Invitation> findInvitationByTokenForUpdate(String tokenHash) {
        return jdbc.query("SELECT * FROM organization_invitations WHERE token_hash = ? FOR UPDATE",
                (rs, row) -> mapInvitation(rs), tokenHash).stream().findFirst();
    }

    public Optional<Invitation> findInvitationByToken(String tokenHash) {
        return jdbc.query("SELECT * FROM organization_invitations WHERE token_hash = ?",
                (rs, row) -> mapInvitation(rs), tokenHash).stream().findFirst();
    }

    public int revokeInvitation(UUID invitationId, UUID organizationId) {
        return jdbc.update("""
                UPDATE organization_invitations SET state = 'REVOKED', revoked_at = now()
                WHERE id = ? AND organization_id = ? AND state = 'PENDING' AND expires_at > now()
                """, invitationId, organizationId);
    }

    public int consumeInvitation(UUID invitationId, UUID userId) {
        return jdbc.update("""
                UPDATE organization_invitations
                SET state = 'ACCEPTED', accepted_user_id = ?, accepted_at = now()
                WHERE id = ? AND state = 'PENDING' AND expires_at > now()
                """, userId, invitationId);
    }

    public boolean isActiveMember(UUID organizationId, UUID userId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM organization_memberships
                WHERE organization_id = ? AND user_id = ? AND state = 'ACTIVE')
                """, Boolean.class, organizationId, userId));
    }

    public void activateMembership(UUID organizationId, UUID userId) {
        jdbc.update("""
                INSERT INTO organization_memberships (organization_id, user_id, role, is_default, created_at, state)
                VALUES (?, ?, 'MEMBER', false, now(), 'ACTIVE')
                ON CONFLICT (organization_id, user_id) DO UPDATE
                    SET role = 'MEMBER', state = 'ACTIVE'
                    WHERE organization_memberships.state = 'REVOKED'
                """, organizationId, userId);
    }

    public int revokeMembership(UUID organizationId, UUID userId) {
        return jdbc.update("""
                UPDATE organization_memberships SET state = 'REVOKED', is_default = false
                WHERE organization_id = ? AND user_id = ? AND state = 'ACTIVE'
                """, organizationId, userId);
    }

    public List<UUID> grantIdsFor(UUID organizationId, UUID userId) {
        return jdbc.query("""
                SELECT id FROM organization_permission_grants
                WHERE organization_id = ? AND beneficiary_user_id = ? AND state <> 'REVOKED'
                """, (rs, row) -> rs.getObject(1, UUID.class), organizationId, userId);
    }

    public List<UUID> revokeGrantTree(UUID grantId, UUID organizationId) {
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

    public record Member(UUID userId, String firstName, String lastName, String email, String role,
                         String state, OffsetDateTime createdAt) {}

    public record Invitation(UUID id, UUID organizationId, String email, String role, String state,
                             UUID invitedByUserId, UUID acceptedUserId, OffsetDateTime createdAt,
                             OffsetDateTime expiresAt, OffsetDateTime acceptedAt, OffsetDateTime revokedAt,
                             String tokenHash) {}

    private static Invitation mapInvitation(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Invitation(rs.getObject("id", UUID.class), rs.getObject("organization_id", UUID.class),
                rs.getString("email"), rs.getString("role"), rs.getString("state"),
                rs.getObject("invited_by_user_id", UUID.class), rs.getObject("accepted_user_id", UUID.class),
                rs.getObject("created_at", OffsetDateTime.class), rs.getObject("expires_at", OffsetDateTime.class),
                rs.getObject("accepted_at", OffsetDateTime.class), rs.getObject("revoked_at", OffsetDateTime.class),
                rs.getString("token_hash"));
    }
}

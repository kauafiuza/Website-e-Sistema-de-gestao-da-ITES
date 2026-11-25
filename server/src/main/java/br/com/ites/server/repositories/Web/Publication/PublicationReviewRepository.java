package br.com.ites.server.repositories.Web.Publication;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PublicationReviewRepository {
    public record ReviewRequest(UUID id, UUID projectId, UUID projectRevisionId, long projectRevision,
            String operation, Integer targetVersion, UUID requesterUserId, UUID approverUserId,
            String state, OffsetDateTime createdAt, OffsetDateTime decidedAt, OffsetDateTime consumedAt) {}
    public record InboxRequest(ReviewRequest request, String projectName) {}

    private final JdbcTemplate jdbc;

    public PublicationReviewRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void create(UUID id, UUID projectId, UUID projectRevisionId, String operation, Integer targetVersion,
            UUID requesterUserId) {
        jdbc.update("""
                INSERT INTO publication_review_requests
                    (id, project_id, project_revision_id, operation, target_version, requester_user_id)
                VALUES (?, ?, ?, ?, ?, ?)
                """, id, projectId, projectRevisionId, operation, targetVersion, requesterUserId);
    }

    public List<ReviewRequest> list(UUID organizationId, UUID projectId) {
        return jdbc.query("""
                SELECT r.*, pr.revision_number
                FROM publication_review_requests r
                JOIN projects p ON p.id = r.project_id
                JOIN project_revisions pr ON pr.id = r.project_revision_id
                WHERE p.organization_id = ? AND r.project_id = ?
                ORDER BY r.created_at DESC, r.id DESC
                """, (rs, row) -> map(rs), organizationId, projectId);
    }

    public List<InboxRequest> listPendingForOrganization(UUID organizationId, UUID actorId) {
        return jdbc.query("""
                SELECT r.*, pr.revision_number, p.name AS project_name
                FROM publication_review_requests r
                JOIN projects p ON p.id = r.project_id
                JOIN project_revisions pr ON pr.id = r.project_revision_id
                WHERE p.organization_id = ? AND r.state = 'PENDING' AND r.requester_user_id <> ?
                ORDER BY r.created_at DESC, r.id DESC
                """, (rs, row) -> new InboxRequest(map(rs), rs.getString("project_name")), organizationId, actorId);
    }

    public Optional<ReviewRequest> findForUpdate(UUID organizationId, UUID projectId, UUID requestId) {
        return jdbc.query("""
                SELECT r.*, pr.revision_number
                FROM publication_review_requests r
                JOIN projects p ON p.id = r.project_id
                JOIN project_revisions pr ON pr.id = r.project_revision_id
                WHERE p.organization_id = ? AND r.project_id = ? AND r.id = ?
                FOR UPDATE OF r
                """, (rs, row) -> map(rs), organizationId, projectId, requestId).stream().findFirst();
    }

    public Optional<ReviewRequest> find(UUID organizationId, UUID projectId, UUID requestId) {
        return jdbc.query("""
                SELECT r.*, pr.revision_number
                FROM publication_review_requests r
                JOIN projects p ON p.id = r.project_id
                JOIN project_revisions pr ON pr.id = r.project_revision_id
                WHERE p.organization_id = ? AND r.project_id = ? AND r.id = ?
                """, (rs, row) -> map(rs), organizationId, projectId, requestId).stream().findFirst();
    }

    public int decide(UUID requestId, UUID approverId, boolean approved) {
        return jdbc.update("""
                UPDATE publication_review_requests
                SET state = ?, approver_user_id = ?, decided_at = now()
                WHERE id = ? AND state = 'PENDING' AND requester_user_id <> ?
                """, approved ? "APPROVED" : "REJECTED", approverId, requestId, approverId);
    }

    public int consume(UUID requestId) {
        return jdbc.update("""
                UPDATE publication_review_requests SET consumed_at = now()
                WHERE id = ? AND state = 'APPROVED' AND consumed_at IS NULL
                """, requestId);
    }

    private static ReviewRequest map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ReviewRequest(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getObject("project_revision_id", UUID.class), rs.getLong("revision_number"),
                rs.getString("operation"), (Integer) rs.getObject("target_version"),
                rs.getObject("requester_user_id", UUID.class), rs.getObject("approver_user_id", UUID.class),
                rs.getString("state"), rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("decided_at", OffsetDateTime.class), rs.getObject("consumed_at", OffsetDateTime.class));
    }
}

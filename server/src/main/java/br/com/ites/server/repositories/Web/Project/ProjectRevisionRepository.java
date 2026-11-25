package br.com.ites.server.repositories.Web.Project;

import br.com.ites.server.utils.pagination.PageRequest;
import br.com.ites.server.utils.pagination.PageResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ProjectRevisionRepository {
    public record DraftRevision(UUID id, long revision, OffsetDateTime createdAt) {}

    public record RevisionSnapshot(UUID id, UUID projectId, long revision, String documentJson,
                                   String routeBlueprintJson) {}

    private final JdbcTemplate jdbc;

    public ProjectRevisionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UUID createDraft(UUID projectId, long revision, String document, String routeBlueprint, UUID actorId) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO project_revisions
                    (id, project_id, revision_number, revision_kind, document, route_blueprint, created_by)
                VALUES (?, ?, ?, 'DRAFT', ?::jsonb, ?::jsonb, ?)
                """, id, projectId, revision, document, routeBlueprint, actorId);
        return id;
    }

    public PageResponse<DraftRevision> findDraftHistory(UUID organizationId, UUID projectId, PageRequest page) {
        List<DraftRevision> items = jdbc.query("""
                SELECT r.id, r.revision_number, r.created_at
                FROM project_revisions r
                JOIN projects p ON p.id = r.project_id
                WHERE p.organization_id = ? AND r.project_id = ? AND r.revision_kind = 'DRAFT'
                ORDER BY r.revision_number DESC, r.id DESC
                LIMIT ? OFFSET ?
                """, (rs, row) -> new DraftRevision(rs.getObject("id", UUID.class),
                rs.getLong("revision_number"), rs.getObject("created_at", OffsetDateTime.class)),
                organizationId, projectId, page.size(), page.offset());
        Long total = jdbc.queryForObject("""
                SELECT count(*) FROM project_revisions r
                JOIN projects p ON p.id = r.project_id
                WHERE p.organization_id = ? AND r.project_id = ? AND r.revision_kind = 'DRAFT'
                """, Long.class, organizationId, projectId);
        return PageResponse.of(items, page, total == null ? 0 : total);
    }

    public Optional<RevisionSnapshot> findDraft(UUID organizationId, UUID projectId, UUID revisionId) {
        return jdbc.query("""
                SELECT r.id, r.project_id, r.revision_number, r.document::text, r.route_blueprint::text
                FROM project_revisions r
                JOIN projects p ON p.id = r.project_id
                WHERE p.organization_id = ? AND r.project_id = ? AND r.id = ?
                  AND r.revision_kind = 'DRAFT'
                """, (rs, row) -> new RevisionSnapshot(rs.getObject("id", UUID.class),
                rs.getObject("project_id", UUID.class), rs.getLong("revision_number"),
                rs.getString(4), rs.getString(5)), organizationId, projectId, revisionId)
                .stream().findFirst();
    }

    public Optional<RevisionSnapshot> findForReview(UUID organizationId, UUID projectId, UUID revisionId) {
        return jdbc.query("""
                SELECT r.id, r.project_id, r.revision_number, r.document::text, r.route_blueprint::text
                FROM project_revisions r
                JOIN projects p ON p.id = r.project_id
                WHERE p.organization_id = ? AND r.project_id = ? AND r.id = ?
                """, (rs, row) -> new RevisionSnapshot(rs.getObject("id", UUID.class),
                rs.getObject("project_id", UUID.class), rs.getLong("revision_number"),
                rs.getString(4), rs.getString(5)), organizationId, projectId, revisionId)
                .stream().findFirst();
    }

    public Optional<RevisionSnapshot> findDraft(UUID projectId, long revision) {
        return jdbc.query("""
                SELECT id, project_id, revision_number, document::text, route_blueprint::text
                FROM project_revisions
                WHERE project_id = ? AND revision_number = ? AND revision_kind = 'DRAFT'
                """, (rs, row) -> new RevisionSnapshot(rs.getObject("id", UUID.class),
                rs.getObject("project_id", UUID.class), rs.getLong("revision_number"),
                rs.getString(4), rs.getString(5)), projectId, revision).stream().findFirst();
    }
}

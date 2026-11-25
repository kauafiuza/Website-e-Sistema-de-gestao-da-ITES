package br.com.ites.server.repositories.Web.Project;

import br.com.ites.server.models.Web.Project.ProjectEntity;
import br.com.ites.server.utils.pagination.PageRequest;
import br.com.ites.server.utils.pagination.PageResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ProjectRepository {
    public interface Summary {
        UUID getId();
        String getName();
        long getRevision();
        LocalDateTime getCreatedAt();
        LocalDateTime getUpdatedAt();
        String getPreviewPageJson();
        String getPreviewThemeJson();
        Boolean getPublicationActive();
    }

    private static final String SUMMARY_SQL = """
            SELECT p.id AS id, p.name AS name, p.revision AS revision,
                   p.created_at AS "createdAt", p.updated_at AS "updatedAt",
                   COALESCE((
                       SELECT jsonb_build_object(
                           'pageName', page.value ->> 'name',
                           'blocks', COALESCE((
                               SELECT jsonb_agg(preview_block.block ORDER BY preview_block.ordinal)
                               FROM (
                                   SELECT block_entry.value AS block, block_entry.ordinal
                                   FROM jsonb_array_elements(COALESCE(page.value -> 'blocks', '[]'::jsonb))
                                       WITH ORDINALITY AS block_entry(value, ordinal)
                                   ORDER BY block_entry.ordinal LIMIT 3
                               ) preview_block
                           ), '[]'::jsonb)
                       )
                       FROM jsonb_array_elements(COALESCE(p.document -> 'pages', '[]'::jsonb)) AS page(value)
                       WHERE page.value ->> 'id' = p.document ->> 'activePageId'
                       LIMIT 1
                   ), '{"pageName":"","blocks":[]}'::jsonb)::text AS "previewPageJson",
                   COALESCE(p.document -> 'theme', 'null'::jsonb)::text AS "previewThemeJson",
                   pub.active AS "publicationActive"
            FROM projects p LEFT JOIN publications pub ON pub.project_id = p.id
            WHERE p.organization_id = ?
            """;

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public ProjectRepository(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public PageResponse<Summary> listByOrganization(UUID organizationId, String query, String sort, PageRequest page) {
        String orderBy = switch (sort) {
            case "old" -> " ORDER BY p.updated_at ASC, p.id ASC";
            case "name" -> " ORDER BY lower(p.name) ASC, p.id ASC";
            default -> " ORDER BY p.updated_at DESC, p.id DESC";
        };
        String filter = " AND (? = '' OR strpos(lower(p.name), lower(?)) > 0)";
        List<Object> parameters = List.of(organizationId, query, query, page.size(), page.offset());
        List<Summary> items = jdbc.query(SUMMARY_SQL + filter + orderBy + " LIMIT ? OFFSET ?", (rs, row) -> new SummaryRow(
                rs.getObject("id", UUID.class), rs.getString("name"), rs.getLong("revision"),
                rs.getObject("createdAt", LocalDateTime.class), rs.getObject("updatedAt", LocalDateTime.class),
                rs.getString("previewPageJson"), rs.getString("previewThemeJson"), (Boolean) rs.getObject("publicationActive")), parameters.toArray());
        Long total = jdbc.queryForObject("SELECT count(*) FROM projects p WHERE p.organization_id = ?" + filter,
                Long.class, organizationId, query, query);
        return PageResponse.of(items, page, total == null ? 0 : total);
    }

    public ProjectEntity insert(UUID ownerId, UUID organizationId, String name, JsonNode document, JsonNode routeBlueprint, UUID themeId) {
        UUID id = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        jdbc.update("INSERT INTO projects (id, owner_id, organization_id, name, document, route_blueprint, theme_id, revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, 1, ?, ?)",
                id, ownerId, organizationId, name, document.toString(), routeBlueprint.toString(), themeId, now, now);
        return findByIdAndOrganization_Id(id, organizationId).orElseThrow();
    }

    public Optional<ProjectEntity> findByIdAndOrganization_Id(UUID id, UUID organizationId) {
        List<ProjectEntity> rows = jdbc.query("SELECT id, owner_id, name, document::text, route_blueprint::text, revision, created_at, updated_at, theme_id FROM projects WHERE id = ? AND organization_id = ?",
                (rs, row) -> new ProjectEntity(rs.getObject("id", UUID.class), rs.getObject("owner_id", UUID.class),
                        rs.getString("name"), read(rs.getString("document")), read(rs.getString("route_blueprint")),
                        rs.getLong("revision"), rs.getObject("created_at", LocalDateTime.class),
                        rs.getObject("updated_at", LocalDateTime.class), rs.getObject("theme_id", UUID.class)), id, organizationId);
        return rows.stream().findFirst();
    }

    public boolean existsByTheme_Id(UUID themeId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM projects WHERE theme_id = ?)", Boolean.class, themeId));
    }

    public boolean existsByIdAndOrganization_Id(UUID id, UUID organizationId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM projects WHERE id = ? AND organization_id = ?)", Boolean.class, id, organizationId));
    }

    public boolean isRoot(UUID id) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM projects WHERE id = ? AND site_role = 'ROOT')", Boolean.class, id));
    }

    public void deleteByOwner_Id(UUID ownerId) { jdbc.update("DELETE FROM projects WHERE owner_id = ?", ownerId); }

    private JsonNode read(String value) {
        try { return json.readTree(value); }
        catch (Exception e) { throw new IllegalStateException("JSON de projeto inválido no banco", e); }
    }

    private record SummaryRow(UUID id, String name, long revision, LocalDateTime createdAt,
                              LocalDateTime updatedAt, String previewPageJson,
                              String previewThemeJson, Boolean publicationActive) implements Summary {
        @Override public UUID getId() { return id; }
        @Override public String getName() { return name; }
        @Override public long getRevision() { return revision; }
        @Override public LocalDateTime getCreatedAt() { return createdAt; }
        @Override public LocalDateTime getUpdatedAt() { return updatedAt; }
        @Override public String getPreviewPageJson() { return previewPageJson; }
        @Override public String getPreviewThemeJson() { return previewThemeJson; }
        @Override public Boolean getPublicationActive() { return publicationActive; }
    }
}

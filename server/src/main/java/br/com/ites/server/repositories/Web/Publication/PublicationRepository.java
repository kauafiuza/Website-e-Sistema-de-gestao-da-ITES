package br.com.ites.server.repositories.Web.Publication;

import br.com.ites.server.utils.pagination.PageRequest;
import br.com.ites.server.utils.pagination.PageResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class PublicationRepository {
    public record SummaryRow(
            UUID projectId,
            String projectName,
            String publicKey,
            boolean active,
            int currentVersion,
            long views,
            long clicks,
            long interactions,
            String previewJson,
            String versionsJson) {}

    private static final String SUMMARY_SELECT = """
            SELECT p.project_id, pr.name AS project_name, p.public_key, p.active, p.current_version,
                   COALESCE(events.views, 0) AS views,
                   COALESCE(events.clicks, 0) AS clicks,
                   COALESCE(events.interactions, 0) AS interactions,
                   COALESCE(preview.value::text, '{"blocks":[],"theme":null}') AS preview_json,
                   COALESCE(versions.value::text, '[]') AS versions_json
            FROM publications p
            JOIN projects pr ON pr.id = p.project_id
            LEFT JOIN LATERAL (
                SELECT count(*) FILTER (WHERE event_type = 'view') AS views,
                       count(*) FILTER (WHERE event_type = 'click') AS clicks,
                       count(*) FILTER (WHERE event_type = 'interaction') AS interactions
                FROM publication_events e WHERE e.publication_id = p.id
            ) events ON true
            LEFT JOIN LATERAL (
                SELECT jsonb_build_object(
                    'blocks', COALESCE((SELECT jsonb_agg(b.value ORDER BY b.ordinal)
                        FROM jsonb_array_elements(v.document -> 'pages') page(value)
                        CROSS JOIN LATERAL jsonb_array_elements(page.value -> 'blocks') WITH ORDINALITY b(value, ordinal)
                        WHERE page.value ->> 'id' = v.document ->> 'activePageId' AND b.ordinal <= 3), '[]'::jsonb),
                    'theme', v.document -> 'theme') AS value
                FROM publication_versions v
                WHERE v.publication_id = p.id AND v.version_number = p.current_version
            ) preview ON true
            LEFT JOIN LATERAL (
                SELECT jsonb_agg(jsonb_build_object(
                    'number', v.version_number,
                    'projectRevision', v.project_revision,
                    'projectRevisionId', v.project_revision_id,
                    'publishedAt', v.published_at,
                    'expiresAt', v.expires_at
                ) ORDER BY v.version_number DESC) AS value
                FROM publication_versions v
                WHERE v.publication_id = p.id AND (v.expires_at IS NULL OR v.expires_at > now())
            ) versions ON true
            """;

    private final JdbcTemplate jdbc;

    public PublicationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public PageResponse<SummaryRow> findByOrganization(UUID organizationId, String query, String sort, PageRequest page) {
        String orderBy = switch (sort) {
            case "old" -> " ORDER BY (SELECT v.published_at FROM publication_versions v WHERE v.publication_id = p.id AND v.version_number = p.current_version) ASC, p.id ASC";
            case "name" -> " ORDER BY lower(pr.name) ASC, p.id ASC";
            default -> " ORDER BY (SELECT v.published_at FROM publication_versions v WHERE v.publication_id = p.id AND v.version_number = p.current_version) DESC, p.id DESC";
        };
        String filter = " WHERE pr.organization_id = ? AND (? = '' OR strpos(lower(pr.name), lower(?)) > 0)";
        List<SummaryRow> items = jdbc.query(SUMMARY_SELECT + filter + orderBy + " LIMIT ? OFFSET ?",
                (rs, row) -> map(rs.getObject("project_id", UUID.class), rs.getString("project_name"),
                        rs.getString("public_key"), rs.getBoolean("active"), rs.getInt("current_version"),
                        rs.getLong("views"), rs.getLong("clicks"), rs.getLong("interactions"),
                        rs.getString("preview_json"), rs.getString("versions_json")),
                organizationId, query, query, page.size(), page.offset());
        Long total = jdbc.queryForObject("SELECT count(*) FROM publications p JOIN projects pr ON pr.id = p.project_id" + filter,
                Long.class, organizationId, query, query);
        return PageResponse.of(items, page, total == null ? 0 : total);
    }

    public Optional<SummaryRow> findByOrganizationAndProject(UUID organizationId, UUID projectId) {
        return jdbc.query(SUMMARY_SELECT + " WHERE p.project_id = ? AND pr.organization_id = ?",
                (rs, row) -> map(rs.getObject("project_id", UUID.class), rs.getString("project_name"),
                        rs.getString("public_key"), rs.getBoolean("active"), rs.getInt("current_version"),
                        rs.getLong("views"), rs.getLong("clicks"), rs.getLong("interactions"),
                        rs.getString("preview_json"), rs.getString("versions_json")),
                projectId, organizationId).stream().findFirst();
    }

    public Optional<UUID> findActiveOrganizationIdByPublicKey(String publicKey) {
        return jdbc.query("""
                SELECT pr.organization_id
                FROM publications p JOIN projects pr ON pr.id = p.project_id
                WHERE p.public_key = ? AND p.active = true
                """, (rs, row) -> rs.getObject("organization_id", UUID.class), publicKey).stream().findFirst();
    }

    private static SummaryRow map(UUID projectId, String projectName, String publicKey, boolean active,
                                  int currentVersion, long views, long clicks, long interactions,
                                  String previewJson, String versionsJson) {
        return new SummaryRow(projectId, projectName, publicKey, active, currentVersion,
                views, clicks, interactions, previewJson, versionsJson);
    }
}

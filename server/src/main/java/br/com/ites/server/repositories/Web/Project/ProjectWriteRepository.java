package br.com.ites.server.repositories.Web.Project;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public class ProjectWriteRepository {
    private final JdbcTemplate jdbc;

    public ProjectWriteRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int updateDocument(
            UUID organizationId, UUID projectId, long revision, String name, String document, String routeBlueprint, UUID themeId) {
        return jdbc.update(
                """
                UPDATE projects SET document = CAST(? AS jsonb), route_blueprint = CAST(? AS jsonb), name = ?, theme_id = ?,
                    revision = revision + 1, updated_at = LOCALTIMESTAMP
                WHERE id = ? AND organization_id = ? AND revision = ?
                """,
                document,
                routeBlueprint,
                name,
                themeId,
                projectId,
                organizationId,
                revision);
    }

    public int rename(UUID organizationId, UUID projectId, long revision, String name) {
        return jdbc.update(
                """
                UPDATE projects SET name = ?,
                    document = jsonb_set(document, '{name}', to_jsonb(CAST(? AS text)), true),
                    revision = revision + 1, updated_at = LOCALTIMESTAMP
                WHERE id = ? AND organization_id = ? AND revision = ?
                """,
                name,
                name,
                projectId,
                organizationId,
                revision);
    }

    public int delete(UUID organizationId, UUID projectId) {
        return jdbc.update(
                "DELETE FROM projects WHERE id = ? AND organization_id = ?", projectId, organizationId);
    }
}

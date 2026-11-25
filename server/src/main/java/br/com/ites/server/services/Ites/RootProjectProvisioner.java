package br.com.ites.server.services.Ites;

import br.com.ites.server.services.Web.Project.ProjectService;
import br.com.ites.server.utils.dtos.Web.Project.CreateProjectDTO;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

/** Importa a página institucional publicada como projeto raiz do editor principal. */
@Component
@Order(2)
public class RootProjectProvisioner implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final ProjectService projects;

    public RootProjectProvisioner(JdbcTemplate jdbc, ObjectMapper json, ProjectService projects) {
        this.jdbc = jdbc;
        this.json = json;
        this.projects = projects;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) throws Exception {
        jdbc.queryForList("SELECT pg_advisory_xact_lock(18304001)");
        Boolean exists = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM projects WHERE site_role='ROOT')", Boolean.class);
        if (Boolean.TRUE.equals(exists)) return;
        var administrators = jdbc.query("""
                SELECT u.id, m.organization_id FROM users u
                JOIN app_user_roles ur ON ur.user_id=u.id
                JOIN app_roles r ON r.id=ur.role_id AND r.code='ADMINISTRATOR'
                JOIN organization_memberships m ON m.user_id=u.id AND m.is_default AND m.state='ACTIVE'
                WHERE u.active ORDER BY u.created_at, u.id LIMIT 1
                """, (row, index) -> new UUID[] { row.getObject(1, UUID.class), row.getObject(2, UUID.class) });
        if (administrators.isEmpty()) return;
        var source = jdbc.query("""
                SELECT v.document::text FROM institutional_pages p
                JOIN institutional_page_versions v ON v.id=p.published_version_id
                WHERE p.slug='inicio'
                """, (row, index) -> row.getString(1));
        if (source.isEmpty()) return;
        UUID actor = administrators.getFirst()[0];
        UUID organizationId = administrators.getFirst()[1];
        ObjectNode document = (ObjectNode) json.readTree(source.getFirst());
        document.put("name", "ITES");
        UUID projectId = projects.create(actor, organizationId, new CreateProjectDTO("ITES", document)).id();
        jdbc.update("UPDATE projects SET site_role='ROOT' WHERE id=?", projectId);
        UUID publicationId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO publications(id,project_id,organization_id,public_key,active,current_version)
                VALUES(?,?,?,'ites-root',true,1)
                """, publicationId, projectId, organizationId);
        jdbc.update("""
                INSERT INTO publication_versions(id,publication_id,project_id,version_number,document,
                    route_blueprint,project_revision,project_revision_id,form_references)
                SELECT gen_random_uuid(), ?,p.id,1,p.document,p.route_blueprint,p.revision,r.id,'[]'::jsonb
                FROM projects p JOIN project_revisions r ON r.project_id=p.id AND r.revision_kind='DRAFT'
                WHERE p.id=? AND r.revision_number=p.revision
                """, publicationId, projectId);
    }
}

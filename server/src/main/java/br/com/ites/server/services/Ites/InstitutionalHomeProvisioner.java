package br.com.ites.server.services.Ites;

import java.io.InputStream;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/** Publica a configuração inicial do portal somente quando ainda não existe uma versão publicada. */
@Component
@Order(1)
public class InstitutionalHomeProvisioner implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public InstitutionalHomeProvisioner(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        var pages = jdbc.queryForList(
                """
                SELECT p.id,p.published_version_id,
                  EXISTS(SELECT 1 FROM institutional_page_versions v WHERE v.page_id=p.id) AS has_versions
                FROM institutional_pages p WHERE p.slug='inicio' FOR UPDATE
                """);
        if (pages.isEmpty() || pages.getFirst().get("published_version_id") != null
                || Boolean.TRUE.equals(pages.getFirst().get("has_versions"))) return;
        Boolean hasAdministrator = jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM users u JOIN app_user_roles ur ON ur.user_id=u.id
                JOIN app_roles r ON r.id=ur.role_id WHERE r.code='ADMINISTRATOR' AND u.active)
                """, Boolean.class);
        if (!Boolean.TRUE.equals(hasAdministrator)) return;
        UUID actor = jdbc.queryForObject("""
                SELECT u.id FROM users u JOIN app_user_roles ur ON ur.user_id=u.id
                JOIN app_roles r ON r.id=ur.role_id WHERE r.code='ADMINISTRATOR' AND u.active
                ORDER BY u.created_at LIMIT 1
                """, UUID.class);
        UUID pageId = (UUID) pages.getFirst().get("id");
        Integer revision = jdbc.queryForObject(
                "SELECT COALESCE(max(revision),0)+1 FROM institutional_page_versions WHERE page_id=?", Integer.class, pageId);
        String document;
        try (InputStream input = new ClassPathResource("ites-homepage.json").getInputStream()) {
            document = json.readTree(input).toString();
        }
        UUID versionId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO institutional_page_versions(id,page_id,revision,document,author_id)
                VALUES(?,?,?,?::jsonb,?)
                """, versionId, pageId, revision, document, actor);
        jdbc.update("UPDATE institutional_pages SET published_version_id=? WHERE id=?", versionId, pageId);
        jdbc.update("""
                INSERT INTO institutional_page_events(page_id,version_id,actor_id,action)
                VALUES(?,?,?,'PUBLISH')
                """, pageId, versionId, actor);
    }
}

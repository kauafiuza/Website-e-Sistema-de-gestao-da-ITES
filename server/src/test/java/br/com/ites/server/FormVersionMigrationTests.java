package br.com.ites.server;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class FormVersionMigrationTests {
    private static final String OLD_SCHEMA = """
            [{"id":"email","label":"E-mail","type":"email","required":true}]
            """.strip();
    private static final String CURRENT_SCHEMA = """
            [{"id":"email","label":"E-mail corporativo","type":"email","required":true},
             {"id":"message","label":"Mensagem","type":"textarea","required":false}]
            """.strip();

    @Test
    void backfillsAnUnretainedSubmissionAgainstItsExistingTenantForm() throws Exception {
        PostgreSQLContainer postgres = new PostgreSQLContainer(DockerImageName.parse("postgres:16-alpine"));
        String sessionId = System.getenv("AO_SESSION_ID");
        if (sessionId != null && !sessionId.isBlank()) postgres.withLabel("ao.session", sessionId);
        postgres.start();
        try {
            Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .locations("classpath:db/migration").target(MigrationVersion.fromVersion("17")).load().migrate();
            JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl(),
                    postgres.getUsername(), postgres.getPassword()));
            UUID userId = UUID.randomUUID();
            UUID organizationId = UUID.randomUUID();
            UUID projectId = UUID.randomUUID();
            UUID publicationId = UUID.randomUUID();
            UUID publicationKey = UUID.randomUUID();
            UUID revisionId = UUID.randomUUID();
            UUID oldSubmissionId = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO users (id, first_name, last_name, email, password_hash, created_at, updated_at)
                    VALUES (?, 'Test', 'Owner', ?, 'hash', now(), now())
                    """, userId, "form-migration-" + userId + "@example.com");
            jdbc.update("INSERT INTO organizations (id, name, created_at) VALUES (?, 'Tenant legado', now())",
                    organizationId);
            jdbc.update("""
                    INSERT INTO projects (id, owner_id, organization_id, name, document, route_blueprint, revision, created_at, updated_at)
                    VALUES (?, ?, ?, 'Projeto legado', ?::jsonb, '[]'::jsonb, 2, now(), now())
                    """, projectId, userId, organizationId, document(CURRENT_SCHEMA));
            jdbc.update("""
                    INSERT INTO project_revisions
                        (id, project_id, revision_number, revision_kind, document, route_blueprint, created_by)
                    VALUES (?, ?, 2, 'DRAFT', ?::jsonb, '[]'::jsonb, ?)
                    """, revisionId, projectId, document(CURRENT_SCHEMA), userId);
            jdbc.update("INSERT INTO publications (id, project_id, public_key, current_version) VALUES (?, ?, ?, 2)",
                    publicationId, projectId, "form-migration-" + publicationKey);
            jdbc.update("""
                    INSERT INTO publication_versions
                        (id, publication_id, version_number, document, route_blueprint, project_revision, project_revision_id)
                    VALUES (?, ?, 1, ?::jsonb, '[]'::jsonb, 1, ?), (?, ?, 2, ?::jsonb, '[]'::jsonb, 2, ?)
                    """, UUID.randomUUID(), publicationId, document(OLD_SCHEMA), revisionId,
                    UUID.randomUUID(), publicationId, document(CURRENT_SCHEMA), revisionId);
            jdbc.update("DELETE FROM publication_versions WHERE publication_id = ? AND version_number = 1", publicationId);
            jdbc.update("""
                    INSERT INTO form_submissions
                        (id, publication_id, version_number, page_id, block_id, form_name, fields, field_schema, occurred_at)
                    VALUES (?, ?, 1, 'page-1', 'block-1', 'Contato', '{"email":"legacy@example.com"}'::jsonb, ?::jsonb, now())
                    """, oldSubmissionId, publicationId, OLD_SCHEMA);

            Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .locations("classpath:db/migration").load().migrate();

            UUID formVersionId = jdbc.queryForObject(
                    "SELECT form_version_id FROM form_submissions WHERE id = ?", UUID.class, oldSubmissionId);
            assertNotNull(formVersionId);
            JsonNode schema = new ObjectMapper().readTree(jdbc.queryForObject(
                    "SELECT field_schema::text FROM organization_form_versions WHERE id = ?", String.class,
                    formVersionId));
            assertEquals("E-mail", schema.get(0).get("label").asText());
            assertTrue(jdbc.queryForObject("""
                    SELECT EXISTS (
                        SELECT 1 FROM organization_form_versions version
                        JOIN organization_forms form ON form.id = version.form_id
                        WHERE version.id = ? AND form.organization_id = ? AND form.project_id = ?
                    )
                    """, Boolean.class, formVersionId, organizationId, projectId));
        } finally {
            postgres.stop();
        }
    }

    private static String document(String schema) {
        return """
                {"version":1,"name":"Projeto legado","activePageId":"page-1","pages":[{"id":"page-1","name":"Home","slug":"home","blocks":[{"id":"block-1","definitionId":"form-classic","props":{"title":"Contato","formFields":%s}}]}]}
                """.formatted(schema);
    }
}

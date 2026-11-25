package br.com.ites.server.services.Web.Publication;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;

/** Cria recursos do tenant a partir dos formulários presentes no snapshot publicado. */
@Service
public class FormResourceVersionService {
    private final JdbcTemplate db;
    private final ObjectMapper json;

    public FormResourceVersionService(JdbcTemplate db, ObjectMapper json) {
        this.db = db;
        this.json = json;
    }

    public record FormVersionReference(String pageId, String blockId, UUID formId,
            UUID formVersionId, int formVersion) {}

    public record FormVersion(UUID formId, UUID id, String name, String definitionId,
            JsonNode fieldSchema) {}

    public JsonNode snapshotReferences(UUID organizationId, UUID projectId, JsonNode document) {
        ArrayNode references = json.createArrayNode();
        for (JsonNode page : document.path("pages")) {
            String pageId = page.path("id").asText();
            for (JsonNode block : page.path("blocks")) {
                String definition = block.path("definitionId").asText();
                if (!FormFieldSchema.DEFINITIONS.contains(definition)) continue;
                JsonNode schema = FormFieldSchema.fields(block, json);
                String blockId = block.path("id").asText();
                String name = block.path("props").path("title").asText(definition);
                if (name.length() > 200) name = name.substring(0, 200);
                UUID formId = db.queryForObject("""
                        INSERT INTO organization_forms
                            (id, organization_id, project_id, source_page_id, source_block_id, name, definition_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (project_id, source_page_id, source_block_id)
                        DO UPDATE SET name = EXCLUDED.name, definition_id = EXCLUDED.definition_id, updated_at = now()
                        RETURNING id
                        """, UUID.class, UUID.randomUUID(), organizationId, projectId, pageId, blockId, name, definition);

                List<FormVersionReference> latest = db.query("""
                        SELECT version.id, version.version_number, version.name,
                               version.definition_id, version.field_schema::text
                        FROM organization_form_versions version
                        WHERE version.form_id = ? AND version.organization_id = ?
                        ORDER BY version.version_number DESC
                        LIMIT 1 FOR UPDATE
                        """, (rs, row) -> new FormVersionReference(pageId, blockId, formId,
                        rs.getObject(1, UUID.class), rs.getInt(2)), formId, organizationId);
                UUID versionId;
                int versionNumber;
                boolean unchanged = false;
                if (!latest.isEmpty()) {
                    FormVersionReference current = latest.getFirst();
                    String[] currentSchema = db.queryForObject("""
                            SELECT name, definition_id, field_schema::text FROM organization_form_versions
                            WHERE id = ? AND organization_id = ?
                            """, (rs, row) -> new String[] {rs.getString(1), rs.getString(2), rs.getString(3)},
                            current.formVersionId(), organizationId);
                    unchanged = name.equals(currentSchema[0]) && definition.equals(currentSchema[1])
                            && schema.toString().equals(json.readTree(currentSchema[2]).toString());
                    if (unchanged) {
                        versionId = current.formVersionId();
                        versionNumber = current.formVersion();
                    } else {
                        versionNumber = current.formVersion() + 1;
                        versionId = UUID.randomUUID();
                    }
                } else {
                    versionNumber = 1;
                    versionId = UUID.randomUUID();
                }
                if (!unchanged) {
                    db.update("""
                            INSERT INTO organization_form_versions
                                (id, form_id, organization_id, version_number, name, definition_id, field_schema)
                            VALUES (?, ?, ?, ?, ?, ?, ?::jsonb)
                            """, versionId, formId, organizationId, versionNumber, name, definition, schema.toString());
                }
                references.add(json.createObjectNode().put("pageId", pageId).put("blockId", blockId)
                        .put("formId", formId.toString()).put("formVersionId", versionId.toString())
                        .put("formVersion", versionNumber));
            }
        }
        return references;
    }

    public FormVersion resolve(UUID organizationId, UUID projectId, UUID formId,
            UUID formVersionId) {
        return db.query("""
                SELECT form.id, version.id, version.name, version.definition_id, version.field_schema::text
                FROM organization_forms form
                JOIN organization_form_versions version
                  ON version.form_id = form.id AND version.organization_id = form.organization_id
                WHERE form.id = ? AND version.id = ?
                  AND form.organization_id = ? AND form.project_id = ?
                """, (rs, row) -> {
                    try {
                        return new FormVersion(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class),
                                rs.getString(3), rs.getString(4), json.readTree(rs.getString(5)));
                    } catch (Exception exception) {
                        throw new IllegalStateException("Versão do formulário inválida", exception);
                    }
                }, formId, formVersionId, organizationId, projectId).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Referência de formulário inválida"));
    }

    public List<FormVersionReference> references(JsonNode formReferences) {
        List<FormVersionReference> result = new ArrayList<>();
        for (JsonNode reference : formReferences) {
            try {
                result.add(new FormVersionReference(reference.path("pageId").asText(),
                        reference.path("blockId").asText(), UUID.fromString(reference.path("formId").asText()),
                        UUID.fromString(reference.path("formVersionId").asText()),
                        reference.path("formVersion").asInt()));
            } catch (RuntimeException exception) {
                throw new IllegalStateException("Referência de formulário do snapshot inválida", exception);
            }
        }
        return result;
    }
}

package br.com.ites.server.services.Web.Publication;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import br.com.ites.server.utils.pagination.PageRequest;
import br.com.ites.server.utils.pagination.PageResponse;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import br.com.ites.server.repositories.Organization.OrganizationRepository;
import br.com.ites.server.repositories.Web.Publication.PublicationRepository;
import br.com.ites.server.models.Organization.PermissionAction;
import br.com.ites.server.models.Organization.GrantScopeType;
import br.com.ites.server.models.Organization.OrganizationFeature;
import br.com.ites.server.services.Organization.OrganizationAuthorizationService;
import br.com.ites.server.services.Organization.OrganizationAuditEventService;
import br.com.ites.server.services.Organization.OrganizationFeatureService;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class FormSubmissionService {
    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final OrganizationRepository organizations;
    private final PublicationRepository publications;
    private final OrganizationAuthorizationService authorization;
    private final OrganizationFeatureService features;
    private final FormResourceVersionService formVersions;
    private final OrganizationAuditEventService auditEvents;

    public FormSubmissionService(JdbcTemplate db, ObjectMapper json, OrganizationRepository organizations,
                                 PublicationRepository publications,
                                 OrganizationAuthorizationService authorization,
                                 OrganizationFeatureService features,
                                 FormResourceVersionService formVersions,
                                 OrganizationAuditEventService auditEvents) {
        this.db = db;
        this.json = json;
        this.organizations = organizations;
        this.publications = publications;
        this.authorization = authorization;
        this.features = features;
        this.formVersions = formVersions;
        this.auditEvents = auditEvents;
    }

    public record Submission(UUID id, int version, String pageId, String blockId,
                             String formName, JsonNode fields, JsonNode fieldSchema, OffsetDateTime occurredAt) {}

    @Transactional
    public void receive(String key, String pageId, String blockId, int version, UUID requestedFormVersionId,
                        Map<String, String> fields) {
        if (pageId == null || blockId == null || pageId.length() > 100 || blockId.length() > 100 || fields == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formulário inválido");
        UUID organizationId = activePublicationOrganization(key);
        features.requireEnabled(organizationId, OrganizationFeature.PUBLICATIONS);
        features.requireEnabled(organizationId, OrganizationFeature.FORM_RESPONSES);
        List<PublicationSnapshot> snapshots = db.query("""
                SELECT p.id, p.project_id, p.current_version, v.document::text, v.form_references::text
                FROM publications p JOIN publication_versions v
                  ON v.publication_id = p.id AND v.version_number = p.current_version
                WHERE p.public_key = ? AND p.active = true FOR UPDATE OF p
                """, (rs, row) -> new PublicationSnapshot(UUID.fromString(rs.getString(1)),
                UUID.fromString(rs.getString(2)), rs.getInt(3), rs.getString(4), rs.getString(5)), key);
        if (snapshots.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        PublicationSnapshot snapshot = snapshots.getFirst();
        if (version != snapshot.version()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Página desatualizada");
        JsonNode references = json.readTree(snapshot.formReferences());
        FormResourceVersionService.FormVersionReference reference = formVersions.references(references).stream()
                .filter(item -> item.pageId().equals(pageId) && item.blockId().equals(blockId))
                .findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Formulário inválido"));
        if (requestedFormVersionId != null && !requestedFormVersionId.equals(reference.formVersionId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Versão do formulário desatualizada");
        FormResourceVersionService.FormVersion formVersion = formVersions.resolve(organizationId, snapshot.projectId(),
                reference.formId(), reference.formVersionId());
        long recent = db.queryForObject("SELECT count(*) FROM form_submissions WHERE publication_id = ? AND occurred_at >= now() - interval '1 minute'", Long.class, snapshot.id());
        if (recent >= 60) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Limite de envios atingido");
        JsonNode document = json.readTree(snapshot.document());
        JsonNode block = null;
        for (JsonNode page : document.path("pages")) {
            if (!pageId.equals(page.path("id").asText())) continue;
            for (JsonNode candidate : page.path("blocks")) {
                if (blockId.equals(candidate.path("id").asText())) block = candidate;
            }
        }
        if (block == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formulário inválido");
        if (!formVersion.definitionId().equals(block.path("definitionId").asText()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Referência de formulário inválida");
        JsonNode schema = formVersion.fieldSchema();
        FormFieldSchema.validateValues(schema, fields);
        db.update("INSERT INTO form_submissions(id, publication_id, version_number, page_id, block_id, form_name, fields, field_schema, form_version_id, organization_id) VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?)",
                UUID.randomUUID(), snapshot.id(), version, pageId, blockId, formVersion.name(),
                json.writeValueAsString(fields), schema.toString(), formVersion.id(), organizationId);
        db.update("INSERT INTO publication_events(publication_id, version_number, event_type, target) VALUES (?, ?, 'interaction', ?)",
                snapshot.id(), version, "form: " + blockId);
    }

    @Transactional
    public PageResponse<Submission> list(UUID ownerId, UUID selectedOrganizationId, UUID projectId, int page, int size) {
        return list(ownerId,selectedOrganizationId,projectId,page,size,null);
    }

    @Transactional
    public PageResponse<Submission> list(UUID ownerId, UUID selectedOrganizationId, UUID projectId, int page, int size, String search) {
        UUID organizationId = selectedOrganizationId == null
                ? organizations.findDefaultOrganizationId(ownerId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN))
                : selectedOrganizationId;
        boolean projectInOrganization = Boolean.TRUE.equals(db.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM projects WHERE id = ? AND organization_id = ?)",
                Boolean.class, projectId, organizationId));
        if (projectInOrganization) {
            authorization.requireResource(ownerId, organizationId,
                    PermissionAction.PUBLICATION_SUBMISSIONS_READ, GrantScopeType.PROJECT, projectId);
        } else {
            authorization.requireOrganization(ownerId, organizationId,
                    PermissionAction.PUBLICATION_SUBMISSIONS_READ);
        }
        if (projectInOrganization)
            auditEvents.append(organizationId, ownerId, "SUBMISSIONS_READ", "SUBMISSIONS", projectId);
        PageRequest request = PageRequest.of(page, size, 10);
        List<Submission> items = db.query("""
                SELECT s.id, s.version_number, s.page_id, s.block_id, s.form_name, s.fields::text, s.field_schema::text, s.occurred_at
                FROM form_submissions s JOIN publications p ON p.id = s.publication_id
                JOIN projects pr ON pr.id = p.project_id
                WHERE p.project_id = ? AND pr.organization_id = ?
                  AND (CAST(? AS text) IS NULL OR s.form_name ILIKE ? OR s.fields::text ILIKE ? OR s.field_schema::text ILIKE ?)
                ORDER BY s.occurred_at DESC, s.id DESC LIMIT ? OFFSET ?
                """, (rs, row) -> new Submission(UUID.fromString(rs.getString(1)), rs.getInt(2), rs.getString(3),
                rs.getString(4), rs.getString(5), json.readTree(rs.getString(6)),
                rs.getString(7) == null ? null : json.readTree(rs.getString(7)), rs.getObject(8, OffsetDateTime.class)),
                projectId, organizationId, normalizedSearch(search), searchPattern(search), searchPattern(search), searchPattern(search), request.size(), request.offset());
        Long total = db.queryForObject("""
                SELECT count(*) FROM form_submissions s
                JOIN publications p ON p.id = s.publication_id
                JOIN projects pr ON pr.id = p.project_id
                WHERE p.project_id = ? AND pr.organization_id = ?
                  AND (CAST(? AS text) IS NULL OR s.form_name ILIKE ? OR s.fields::text ILIKE ? OR s.field_schema::text ILIKE ?)
                """, Long.class, projectId, organizationId, normalizedSearch(search), searchPattern(search), searchPattern(search), searchPattern(search));
        return PageResponse.of(items, request, total == null ? 0 : total);
    }

    private static String normalizedSearch(String search) {
        if (search == null || search.isBlank()) return null;
        String normalized = search.trim();
        if (normalized.length() > 200)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Busca de respostas muito extensa");
        return normalized;
    }

    private static String searchPattern(String search) {
        String value = normalizedSearch(search);
        return value == null ? null : "%" + value + "%";
    }

    @Transactional
    public String exportCsv(UUID userId, UUID selectedOrganizationId, UUID projectId) {
        return exportCsv(userId,selectedOrganizationId,projectId,null);
    }

    @Transactional
    public String exportCsv(UUID userId, UUID selectedOrganizationId, UUID projectId, String search) {
        UUID organizationId = selectedOrganizationId == null
                ? organizations.findDefaultOrganizationId(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN))
                : selectedOrganizationId;
        boolean projectInOrganization = Boolean.TRUE.equals(db.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM projects WHERE id = ? AND organization_id = ?)",
                Boolean.class, projectId, organizationId));
        if (projectInOrganization) {
            authorization.requireResource(userId, organizationId,
                    PermissionAction.PUBLICATION_SUBMISSIONS_EXPORT, GrantScopeType.PROJECT, projectId);
        } else {
            authorization.requireOrganization(userId, organizationId,
                    PermissionAction.PUBLICATION_SUBMISSIONS_EXPORT);
        }
        if (projectInOrganization)
            auditEvents.append(organizationId, userId, "SUBMISSIONS_EXPORTED", "SUBMISSIONS", projectId);
        List<Submission> submissions = db.query("""
                SELECT s.id, s.version_number, s.page_id, s.block_id, s.form_name, s.fields::text,
                       s.field_schema::text, s.occurred_at
                FROM form_submissions s JOIN publications p ON p.id = s.publication_id
                JOIN projects pr ON pr.id = p.project_id
                WHERE p.project_id = ? AND pr.organization_id = ?
                  AND (CAST(? AS text) IS NULL OR s.form_name ILIKE ? OR s.fields::text ILIKE ? OR s.field_schema::text ILIKE ?)
                ORDER BY s.occurred_at, s.id
                """, (rs, row) -> new Submission(UUID.fromString(rs.getString(1)), rs.getInt(2), rs.getString(3),
                rs.getString(4), rs.getString(5), json.readTree(rs.getString(6)),
                rs.getString(7) == null ? null : json.readTree(rs.getString(7)), rs.getObject(8, OffsetDateTime.class)),
                projectId, organizationId, normalizedSearch(search), searchPattern(search), searchPattern(search), searchPattern(search));
        StringBuilder csv = new StringBuilder("occurredAt,formName,fields\r\n");
        for (Submission submission : submissions) {
            String fields = csvFields(submission.fields());
            csv.append(csvCell(submission.occurredAt().toString())).append(',')
                    .append(csvCell(submission.formName())).append(',')
                    .append(csvCell(fields)).append("\r\n");
        }
        return csv.toString();
    }

    private String csvFields(JsonNode fields) {
        var safeFields = json.createObjectNode();
        fields.properties().forEach(entry -> safeFields.put(entry.getKey(), neutralizeFormula(entry.getValue().asText())));
        return safeFields.toString();
    }

    private static String csvCell(String value) {
        String safeValue = neutralizeFormula(value);
        return "\"" + safeValue.replace("\"", "\"\"") + "\"";
    }

    private static String neutralizeFormula(String value) {
        if (value.startsWith("\t") || value.startsWith("\r") || value.startsWith("\n")
                || value.matches("^[\\s]*[=+\\-@].*")) {
            return "'" + value;
        }
        return value;
    }

    private record PublicationSnapshot(UUID id, UUID projectId, int version, String document, String formReferences) {}

    private UUID activePublicationOrganization(String key) {
        return publications.findActiveOrganizationIdByPublicKey(key)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}

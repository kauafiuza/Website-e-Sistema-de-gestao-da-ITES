package br.com.ites.server.services.Organization;

import br.com.ites.server.repositories.Organization.PageTemplateRepository;
import br.com.ites.server.services.Web.Project.BlockContractCatalog;
import br.com.ites.server.repositories.Organization.PageTemplateRepository.VersionedTemplate;
import br.com.ites.server.utils.dtos.Organization.CreatePageTemplateVersionDTO;
import br.com.ites.server.utils.dtos.Organization.PageTemplateResponseDTO;
import br.com.ites.server.utils.dtos.Organization.SavePageTemplateDTO;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Mantém modelos de página isolados por tenant, com versões imutáveis e autoria explícita. */
@Service
public class PageTemplateService {
    private static final int MAX_CONTENT_BYTES = 1_000_000;
    private static final int MAX_DEPTH = 64;
    private static final int MAX_BLOCKS = 1_000;

    private final PageTemplateRepository templates;
    private final OrganizationAuthorizationService authorization;
    private final ObjectMapper json;
    private final BlockContractCatalog blockContracts;
    private final OrganizationAuditEventService auditEvents;

    public PageTemplateService(PageTemplateRepository templates,
            OrganizationAuthorizationService authorization, ObjectMapper json,
            BlockContractCatalog blockContracts, OrganizationAuditEventService auditEvents) {
        this.templates = templates;
        this.authorization = authorization;
        this.json = json;
        this.blockContracts = blockContracts;
        this.auditEvents = auditEvents;
    }

    @Transactional(readOnly = true)
    public List<PageTemplateResponseDTO> list(UUID actorId, UUID organizationId) {
        authorization.requireActiveMembership(actorId, organizationId);
        return templates.listCurrent(organizationId).stream().map(this::response).toList();
    }

    @Transactional
    public PageTemplateResponseDTO create(UUID actorId, UUID organizationId, SavePageTemplateDTO request) {
        authorization.requireActiveMembershipForMutation(actorId, organizationId);
        JsonNode content = validateContent(request.content());
        UUID id = UUID.randomUUID();
        UUID versionId = UUID.randomUUID();
        if (!templates.create(id, versionId, organizationId, actorId,
                request.name().strip(), content.toString())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Já existe um modelo ativo com esse nome nesta organização");
        }
        auditEvents.append(organizationId, actorId, "PAGE_TEMPLATE_CREATED", "PAGE_TEMPLATE", id);
        return templates.listVersions(organizationId, id).stream().findFirst()
                .map(this::response).orElseThrow(IllegalStateException::new);
    }

    @Transactional
    public PageTemplateResponseDTO createVersion(UUID actorId, UUID organizationId,
            UUID templateId, CreatePageTemplateVersionDTO request) {
        authorization.requireActiveMembershipForMutation(actorId, organizationId);
        JsonNode content = validateContent(request.content());
        var current = templates.lockForUpdate(organizationId, templateId)
                .orElseThrow(PageTemplateService::notFound);
        requireAuthor(current.createdBy(), actorId);
        if (current.currentVersion() != request.expectedVersion())
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "O modelo foi atualizado por outra sessão. Recarregue a versão atual.");
        UUID versionId = UUID.randomUUID();
        templates.createVersion(templateId, versionId, organizationId, actorId,
                current.currentVersion() + 1, content.toString());
        auditEvents.append(organizationId, actorId, "PAGE_TEMPLATE_VERSION_CREATED", "PAGE_TEMPLATE", templateId);
        return templates.listVersions(organizationId, templateId).stream().findFirst()
                .map(this::response).orElseThrow(IllegalStateException::new);
    }

    @Transactional(readOnly = true)
    public List<PageTemplateResponseDTO> versions(UUID actorId, UUID organizationId, UUID templateId) {
        authorization.requireActiveMembership(actorId, organizationId);
        List<VersionedTemplate> versions = templates.listVersions(organizationId, templateId);
        if (versions.isEmpty()) throw notFound();
        return versions.stream().map(this::response).toList();
    }

    @Transactional
    public void archive(UUID actorId, UUID organizationId, UUID templateId) {
        authorization.requireActiveMembershipForMutation(actorId, organizationId);
        var current = templates.lockForUpdate(organizationId, templateId)
                .orElseThrow(PageTemplateService::notFound);
        requireAuthor(current.createdBy(), actorId);
        templates.archive(organizationId, templateId, actorId);
        auditEvents.append(organizationId, actorId, "PAGE_TEMPLATE_ARCHIVED", "PAGE_TEMPLATE", templateId);
    }

    private JsonNode validateContent(JsonNode content) {
        if (content == null || !content.isObject() || !content.has("blocks")
                || !content.get("blocks").isArray() || content.get("blocks").size() > MAX_BLOCKS)
            throw badRequest("O conteúdo do modelo deve conter uma lista válida de blocos");
        for (JsonNode block : content.get("blocks")) {
            JsonNode definitionId = block.get("definitionId");
            if (!block.isObject() || definitionId == null || !definitionId.isTextual()
                    || definitionId.asText().isBlank() || definitionId.asText().length() > 200
                    || block.get("props") == null || !block.get("props").isObject())
                throw badRequest("Cada bloco do modelo deve conter definitionId e props válidos");
            try {
                blockContracts.validate(block);
            } catch (ResponseStatusException exception) {
                throw badRequest("As propriedades de um bloco do modelo são inválidas");
            }
        }
        validateComposition(content);
        String encoded = content.toString();
        if (encoded.getBytes(StandardCharsets.UTF_8).length > MAX_CONTENT_BYTES)
            throw badRequest("O conteúdo do modelo excede o limite permitido");
        ArrayDeque<NodeDepth> pending = new ArrayDeque<>();
        pending.push(new NodeDepth(content, 1));
        while (!pending.isEmpty()) {
            NodeDepth current = pending.pop();
            if (current.depth() > MAX_DEPTH) throw badRequest("O conteúdo do modelo é profundo demais");
            for (JsonNode child : current.node())
                pending.push(new NodeDepth(child, current.depth() + 1));
        }
        return content;
    }

    private void validateComposition(JsonNode content) {
        JsonNode composition = content.get("composition");
        if (composition == null) return;
        if (!composition.isObject()) throw badRequest("A composição do modelo é inválida");
        JsonNode allowed = composition.get("allowedDefinitionIds");
        java.util.Set<String> allowedIds = null;
        if (allowed != null) {
            if (!allowed.isArray() || allowed.size() > MAX_BLOCKS)
                throw badRequest("A lista de blocos permitidos é inválida");
            allowedIds = new java.util.HashSet<>();
            for (JsonNode definitionId : allowed)
                if (!definitionId.isTextual() || definitionId.asText().isBlank()
                        || definitionId.asText().length() > 200 || !allowedIds.add(definitionId.asText()))
                    throw badRequest("A lista de blocos permitidos é inválida");
            for (JsonNode block : content.path("blocks"))
                if (!allowedIds.contains(block.path("definitionId").asText()))
                    throw badRequest("A lista permitida não inclui os blocos do modelo");
        }
        JsonNode protectedRegions = composition.get("protectedRegions");
        if (protectedRegions != null) {
            if (!protectedRegions.isArray() || protectedRegions.size() > 2)
                throw badRequest("As áreas compartilhadas do modelo são inválidas");
            java.util.Set<String> regions = new java.util.HashSet<>();
            JsonNode snapshots = content.path("regions");
            for (JsonNode region : protectedRegions) {
                if (!region.isTextual() || !java.util.Set.of("navbar", "footer").contains(region.asText())
                        || !regions.add(region.asText()))
                    throw badRequest("As áreas compartilhadas do modelo são inválidas");
                JsonNode block = snapshots.get(region.asText());
                JsonNode definitionId = block == null ? null : block.get("definitionId");
                String category = definitionId != null && definitionId.isTextual()
                        ? blockContracts.category(definitionId.asText()) : null;
                if (block == null || !block.isObject() || block.path("props").isMissingNode()
                        || !block.path("props").isObject()
                        || definitionId == null || !definitionId.isTextual()
                        || definitionId.asText().isBlank() || category == null
                        || !category.equals(region.asText()))
                    throw badRequest("O snapshot da área compartilhada é inválido");
                blockContracts.validate(block);
            }
        }
    }

    private PageTemplateResponseDTO response(VersionedTemplate template) {
        try {
            return new PageTemplateResponseDTO(template.id(), template.name(), template.versionId(),
                    template.version(), json.readTree(template.content()), template.createdBy(),
                    template.versionCreatedBy(), template.createdAt(), template.versionCreatedAt());
        } catch (Exception exception) {
            throw new IllegalStateException("JSON de modelo inválido no banco", exception);
        }
    }

    private static void requireAuthor(UUID authorId, UUID actorId) {
        if (authorId == null || !authorId.equals(actorId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Somente a pessoa autora pode versionar ou arquivar este modelo");
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Modelo não encontrado");
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private record NodeDepth(JsonNode node, int depth) {}
}

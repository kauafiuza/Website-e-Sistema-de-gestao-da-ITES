package br.com.ites.server.services.Web.Project;

import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.models.Web.Theme.ThemeEntity;
import br.com.ites.server.repositories.Web.Theme.ThemeRepository;
import br.com.ites.server.repositories.User.UserRepository;
import br.com.ites.server.repositories.Web.Project.ProjectRepository;
import br.com.ites.server.repositories.Web.Project.ProjectRevisionRepository;
import br.com.ites.server.repositories.Web.Project.ProjectWriteRepository;
import br.com.ites.server.repositories.Organization.PageTemplateRepository;
import br.com.ites.server.repositories.Organization.OrganizationRepository;
import br.com.ites.server.models.Organization.PermissionAction;
import br.com.ites.server.models.Organization.GrantScopeType;
import br.com.ites.server.services.Organization.OrganizationAuthorizationService;
import br.com.ites.server.services.Organization.OrganizationAuditEventService;
import br.com.ites.server.utils.dtos.Web.Project.CreateProjectDTO;
import br.com.ites.server.utils.dtos.Web.Project.AdoptProjectRegionsDTO;
import br.com.ites.server.utils.dtos.Web.Project.ProjectResponseDTO;
import br.com.ites.server.utils.dtos.Web.Project.ProjectSummaryDTO;
import br.com.ites.server.utils.dtos.Web.Project.RenameProjectDTO;
import br.com.ites.server.utils.dtos.Web.Project.UpdateProjectDTO;
import br.com.ites.server.utils.pagination.PageRequest;
import br.com.ites.server.utils.pagination.PageResponse;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.Map;
import tools.jackson.databind.node.ObjectNode;

/** Mantém projetos por organização e exige revisão atual nas alterações concorrentes. */
@Service
public class ProjectService {

    private static final int MAX_DOCUMENT_BYTES = 10_000_000;
    private static final int MAX_DEPTH = 64;

    private final ProjectRepository projects;
    private final ProjectRevisionRepository revisions;
    private final UserRepository users;
    private final ProjectWriteRepository writes;
    private final ThemeRepository themes;
    private final OrganizationRepository organizations;
    private final OrganizationAuthorizationService authorization;
    private final PageTemplateRepository pageTemplates;
    private final BlockContractCatalog blockContracts;
    private final ObjectMapper json;
    private final OrganizationAuditEventService auditEvents;

    public ProjectService(
            ProjectRepository projects,
            ProjectRevisionRepository revisions,
            UserRepository users,
            ProjectWriteRepository writes,
            ThemeRepository themes,
            OrganizationRepository organizations,
            OrganizationAuthorizationService authorization,
            PageTemplateRepository pageTemplates,
            BlockContractCatalog blockContracts,
            ObjectMapper json,
            OrganizationAuditEventService auditEvents) {
        this.projects = projects;
        this.revisions = revisions;
        this.users = users;
        this.writes = writes;
        this.themes = themes;
        this.organizations = organizations;
        this.authorization = authorization;
        this.pageTemplates = pageTemplates;
        this.blockContracts = blockContracts;
        this.json = json;
        this.auditEvents = auditEvents;
    }

    @Transactional
    public ProjectResponseDTO create(UUID ownerId, UUID selectedOrganizationId, CreateProjectDTO request) {
        activeOwner(ownerId);
        UUID organizationId = organizationId(ownerId, selectedOrganizationId, PermissionAction.PROJECT_CREATE);
        String projectName = validName(request.name());
        validateDocument(request.document(), organizationId, null);
        JsonNode routeBlueprint = routeBlueprint(request.document());

        if (!projectName.equals(request.document().get("name").asText()))
            throw badRequest("O nome do projeto deve corresponder ao nome do documento");

        ThemeEntity theme = linkedTheme(organizationId, ownerId, request.document());
        var project = projects.insert(ownerId, organizationId, projectName, request.document(), routeBlueprint,
                theme == null ? null : theme.getId());
        revisions.createDraft(project.getId(), project.getRevision(), serialize(project.getDocument()),
                serialize(project.getRouteBlueprint()), ownerId);
        return ProjectResponseDTO.from(project);
    }

    @Transactional(readOnly = true)
    public PageResponse<ProjectSummaryDTO> list(UUID ownerId, UUID selectedOrganizationId, int page, int size, String query, String sort) {
        activeOwner(ownerId);
        UUID organizationId = organizationId(ownerId, selectedOrganizationId, PermissionAction.PROJECT_READ);
        String cleanQuery = query == null ? "" : query.strip();
        if (cleanQuery.length() > 120 || !Set.of("recent", "old", "name").contains(sort))
            throw badRequest("Filtro de projetos inválido");
        PageRequest pageRequest = PageRequest.of(page, size, 10);
        return projects.listByOrganization(organizationId, cleanQuery, sort, pageRequest)
                .map(summary -> ProjectSummaryDTO.from(summary, json));
    }

    @Transactional(readOnly = true)
    public ProjectResponseDTO get(UUID ownerId, UUID selectedOrganizationId, UUID projectId) {
        activeOwner(ownerId);
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        var project = projects.findByIdAndOrganization_Id(projectId, organizationId)
                .orElseThrow(ProjectService::notFound);
        authorization.requireResource(ownerId, organizationId, PermissionAction.PROJECT_READ, GrantScopeType.PROJECT, projectId);
        return ProjectResponseDTO.from(project);
    }

    /** Atualiza o documento apenas se a revisão e a organização ainda corresponderem. */
    @Transactional
    public ProjectResponseDTO updateDocument(
            UUID ownerId, UUID selectedOrganizationId, UUID projectId, UpdateProjectDTO request) {
        activeOwner(ownerId);
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        requireProject(ownerId, organizationId, projectId, PermissionAction.PROJECT_UPDATE);
        authorization.requireResource(ownerId, organizationId, PermissionAction.PROJECT_READ, GrantScopeType.PROJECT, projectId);
        validRevision(request.revision());
        var previous = projects.findByIdAndOrganization_Id(projectId, organizationId)
                .orElseThrow(ProjectService::notFound);
        if (previous.getRevision() != request.revision())
            throw missingOrConflict(organizationId, projectId);
        validateDocument(request.document(), organizationId, previous.getDocument(), Set.of());
        JsonNode routeBlueprint = routeBlueprint(request.document());
        String name = validName(request.document().get("name").asText());
        String encoded = serialize(request.document());
        ThemeEntity theme = linkedTheme(organizationId, ownerId, request.document());

        int changed = writes.updateDocument(organizationId, projectId, request.revision(), name, encoded, serialize(routeBlueprint), theme == null ? null : theme.getId());

        if (changed == 0) throw missingOrConflict(organizationId, projectId);

        revisions.createDraft(projectId, request.revision() + 1, encoded, serialize(routeBlueprint), ownerId);

        return get(ownerId, selectedOrganizationId, projectId);
    }

    /** Adota áreas diretamente de um snapshot ativo do tenant; o cliente seleciona, mas não envia conteúdo. */
    @Transactional
    public ProjectResponseDTO adoptTemplateRegions(UUID actorId, UUID selectedOrganizationId,
            UUID projectId, AdoptProjectRegionsDTO request) {
        activeOwner(actorId);
        UUID organizationId = organizationId(actorId, selectedOrganizationId);
        requireProject(actorId, organizationId, projectId, PermissionAction.PROJECT_UPDATE);
        authorization.requireResource(actorId, organizationId, PermissionAction.PROJECT_READ,
                GrantScopeType.PROJECT, projectId);
        validRevision(request.revision());
        if (request.regions() == null || request.regions().isEmpty()
                || !Set.of("navbar", "footer").containsAll(request.regions()))
            throw badRequest("Selecione áreas compartilhadas válidas");

        var previous = projects.findByIdAndOrganization_Id(projectId, organizationId)
                .orElseThrow(ProjectService::notFound);
        if (previous.getRevision() != request.revision())
            throw missingOrConflict(organizationId, projectId);
        JsonNode document = previous.getDocument().deepCopy();
        if (!document.isObject()) throw badRequest("O documento do projeto é inválido");
        PageTemplateRepository.TemplateSnapshot stored = pageTemplates.findCurrentVersionSnapshot(
                organizationId, request.templateId(), request.versionId()).orElseThrow(ProjectService::notFound);
        JsonNode snapshot;
        try {
            snapshot = json.readTree(stored.content());
        } catch (Exception exception) {
            throw badRequest("Snapshot de modelo inválido");
        }
        JsonNode composition = snapshot.path("composition");
        JsonNode protectedRegions = composition.path("protectedRegions");
        ObjectNode origin = json.createObjectNode();
        origin.put("source", "ORGANIZATION");
        origin.put("templateId", request.templateId().toString());
        origin.put("versionId", request.versionId().toString());
        origin.put("version", stored.version());

        ObjectNode mutableDocument = (ObjectNode) document;
        ObjectNode origins = mutableDocument.path("regionOrigins").isObject()
                ? ((ObjectNode) mutableDocument.get("regionOrigins")).deepCopy() : json.createObjectNode();
        for (String region : request.regions()) {
            JsonNode source = snapshot.path("regions").get(region);
            if (!containsText(protectedRegions, region) || source == null || !source.isObject())
                throw badRequest("O modelo não define esta área compartilhada para adoção");
            JsonNode adopted = source.deepCopy();
            if (region.equals("navbar")) adopted = adoptedNavbar(adopted, document);
            ((ObjectNode) adopted).put("id", UUID.randomUUID().toString());
            mutableDocument.set(region, adopted);
            origins.set(region, origin.deepCopy());
        }
        mutableDocument.set("regionOrigins", origins);
        validateDocument(document, organizationId, previous.getDocument(), request.regions());
        JsonNode routeBlueprint = routeBlueprint(document);
        String name = validName(document.path("name").asText());
        ThemeEntity theme = linkedTheme(organizationId, actorId, document);
        int changed = writes.updateDocument(organizationId, projectId, request.revision(), name,
                serialize(document), serialize(routeBlueprint), theme == null ? null : theme.getId());
        if (changed == 0) throw missingOrConflict(organizationId, projectId);
        revisions.createDraft(projectId, request.revision() + 1, serialize(document),
                serialize(routeBlueprint), actorId);
        return get(actorId, selectedOrganizationId, projectId);
    }

    private JsonNode adoptedNavbar(JsonNode source, JsonNode document) {
        JsonNode items = source.path("props").get("items");
        if (items == null || !items.isArray()) return source;
        var remapped = json.createArrayNode();
        for (JsonNode item : items)
            if (!item.path("href").asText().startsWith("page:")) remapped.add(item.deepCopy());
        int count = Math.min(50, document.path("pages").size());
        for (int index = 0; index < count; index++) {
            JsonNode page = document.path("pages").get(index);
            var item = json.createObjectNode();
            item.put("id", page.path("id").asText());
            item.put("title", page.path("name").asText());
            item.put("description", "");
            item.put("href", "page:" + page.path("id").asText());
            item.put("value", "");
            var features = item.putArray("features");
            if (page.path("parentPageId").isTextual()) features.add(page.path("parentPageId").asText());
            remapped.add(item);
        }
        ((ObjectNode) source.path("props")).set("items", remapped);
        return source;
    }

    @Transactional
    public ProjectResponseDTO rename(UUID ownerId, UUID selectedOrganizationId, UUID projectId, RenameProjectDTO request) {
        activeOwner(ownerId);
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        requireProject(ownerId, organizationId, projectId, PermissionAction.PROJECT_UPDATE);
        authorization.requireResource(ownerId, organizationId, PermissionAction.PROJECT_READ, GrantScopeType.PROJECT, projectId);
        validRevision(request.revision());
        String normalized = validName(request.name());

        int changed = writes.rename(organizationId, projectId, request.revision(), normalized);

        if (changed == 0) throw missingOrConflict(organizationId, projectId);

        var renamed = projects.findByIdAndOrganization_Id(projectId, organizationId)
                .orElseThrow(() -> missingOrConflict(organizationId, projectId));
        revisions.createDraft(projectId, renamed.getRevision(), serialize(renamed.getDocument()),
                serialize(renamed.getRouteBlueprint()), ownerId);

        return get(ownerId, selectedOrganizationId, projectId);
    }

    @Transactional(readOnly = true)
    public PageResponse<ProjectRevisionRepository.DraftRevision> revisions(
            UUID actorId, UUID selectedOrganizationId, UUID projectId, int page, int size) {
        activeOwner(actorId);
        UUID organizationId = organizationId(actorId, selectedOrganizationId);
        requireProject(actorId, organizationId, projectId, PermissionAction.PROJECT_READ);
        return revisions.findDraftHistory(organizationId, projectId, PageRequest.of(page, size, 50));
    }

    @Transactional
    public ProjectResponseDTO restoreRevision(UUID actorId, UUID selectedOrganizationId,
            UUID projectId, UUID revisionId) {
        activeOwner(actorId);
        UUID organizationId = organizationId(actorId, selectedOrganizationId);
        requireProject(actorId, organizationId, projectId, PermissionAction.PROJECT_UPDATE);
        authorization.requireResource(actorId, organizationId, PermissionAction.PROJECT_READ,
                GrantScopeType.PROJECT, projectId);
        var previous = projects.findByIdAndOrganization_Id(projectId, organizationId)
                .orElseThrow(ProjectService::notFound);
        validRevision(previous.getRevision());
        var snapshot = revisions.findDraft(organizationId, projectId, revisionId)
                .orElseThrow(ProjectService::notFound);
        JsonNode document = readSnapshot(snapshot.documentJson());
        // O snapshot já foi persistido para este projeto; compare-o com os modelos imutáveis do tenant,
        // mas não com a versão atual, pois a restauração pode reverter uma adoção ou página vinculada.
        validateDocument(document, organizationId, null);
        JsonNode routeBlueprint = routeBlueprint(document);
        String name = validName(document.path("name").asText());
        ThemeEntity theme = linkedTheme(organizationId, actorId, document);
        String encoded = serialize(document);
        String encodedRoutes = serialize(routeBlueprint);

        int changed = writes.updateDocument(organizationId, projectId, previous.getRevision(), name,
                encoded, encodedRoutes, theme == null ? null : theme.getId());
        if (changed == 0) throw missingOrConflict(organizationId, projectId);
        revisions.createDraft(projectId, previous.getRevision() + 1, encoded, encodedRoutes, actorId);
        auditEvents.append(organizationId, actorId, "PROJECT_REVISION_RESTORED", "PROJECT", projectId);
        return get(actorId, selectedOrganizationId, projectId);
    }

    @Transactional
    public void delete(UUID ownerId, UUID selectedOrganizationId, UUID projectId) {
        activeOwner(ownerId);
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        requireProject(ownerId, organizationId, projectId, PermissionAction.PROJECT_DELETE);
        if (projects.isRoot(projectId))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O projeto raiz não pode ser excluído");
        int changed = writes.delete(organizationId, projectId);
        if (changed == 0) throw notFound();
        auditEvents.append(organizationId, ownerId, "PROJECT_DELETED", "PROJECT", projectId);
    }

    private ThemeEntity linkedTheme(UUID organizationId, UUID userId, JsonNode document) {
        JsonNode configuration = document.get("theme");
        JsonNode presetId = configuration == null ? null : configuration.get("presetId");
        if (presetId == null || presetId.isNull()) return null;
        if (!presetId.isTextual()) throw badRequest("Identificador do tema inválido");
        UUID id;
        try { id = UUID.fromString(presetId.asText()); }
        catch (IllegalArgumentException exception) { throw badRequest("Identificador do tema inválido"); }
        ThemeEntity theme = themes.findByIdAndOrganization_Id(id, organizationId).orElseThrow(ProjectService::notFound);
        authorization.requireResource(userId, organizationId, PermissionAction.THEME_READ, GrantScopeType.THEME, id);
        return theme;
    }

    private void requireProject(UUID userId, UUID organizationId, UUID projectId, PermissionAction action) {
        if (!projects.existsByIdAndOrganization_Id(projectId, organizationId)) throw notFound();
        authorization.requireResource(userId, organizationId, action, GrantScopeType.PROJECT, projectId);
    }

    private UUID organizationId(UUID userId, UUID selectedOrganizationId, PermissionAction action) {
        UUID organizationId = organizationId(userId, selectedOrganizationId);
        authorization.requireOrganization(userId, organizationId, action);
        return organizationId;
    }

    private UUID organizationId(UUID userId, UUID selectedOrganizationId) {
        if (selectedOrganizationId != null) return selectedOrganizationId;
        return organizations.findDefaultOrganizationId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
    }

    private UserEntity activeOwner(UUID ownerId) {
        return users.findById(ownerId)
                .filter(UserEntity::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private ResponseStatusException missingOrConflict(UUID organizationId, UUID projectId) {
        if (!projects.existsByIdAndOrganization_Id(projectId, organizationId)) return notFound();

        return new ResponseStatusException(
                HttpStatus.CONFLICT, "A revisão do projeto está desatualizada");
    }

    private static void validRevision(long revision) {
        if (revision < 1) throw badRequest("A revisão deve ser positiva");
    }

    private static String validName(String name) {
        if (name == null || name.isBlank()) throw badRequest("O nome é obrigatório");

        String normalized = name.strip();

        if (normalized.length() > 150) throw badRequest("O nome deve ter no máximo 150 caracteres");

        return normalized;
    }

    private String serialize(JsonNode document) {
        try {
            return json.writeValueAsString(document);
        } catch (Exception e) {
            throw badRequest("Documento JSON inválido");
        }
    }

    private JsonNode readSnapshot(String document) {
        try {
            return json.readTree(document);
        } catch (Exception exception) {
            throw new IllegalStateException("Revisão de projeto inválida no banco", exception);
        }
    }

    private void validateDocument(JsonNode document, UUID organizationId, JsonNode previousDocument) {
        validateDocument(document, organizationId, previousDocument, Set.of());
    }

    private void validateDocument(JsonNode document, UUID organizationId, JsonNode previousDocument,
            Set<String> explicitlyAdoptedRegions) {
        if (document == null || !document.isObject())
            throw badRequest("O documento deve ser um objeto JSON");

        String encoded = serialize(document);

        if (encoded.getBytes(StandardCharsets.UTF_8).length > MAX_DOCUMENT_BYTES)
            throw badRequest("O documento excede o tamanho máximo de 10 MB");

        ArrayDeque<NodeDepth> pending = new ArrayDeque<>();
        pending.add(new NodeDepth(document, 1));

        while (!pending.isEmpty()) {
            NodeDepth current = pending.removeLast();
            if (current.depth() > MAX_DEPTH)
                throw badRequest("O documento excede a profundidade permitida");
            for (JsonNode child : current.node())
                pending.add(new NodeDepth(child, current.depth() + 1));
        }
        JsonNode version = document.get("version");

        if (version == null || !version.isIntegralNumber() || version.intValue() != 1)
            throw badRequest("Versão do documento não suportada");
        JsonNode documentName = document.get("name");

        if (documentName == null || !documentName.isTextual())
            throw badRequest("Nome do documento inválido");

        validName(documentName.asText());
        JsonNode activePageId = document.get("activePageId");
        JsonNode pages = document.get("pages");

        if (activePageId == null
                || !activePageId.isTextual()
                || pages == null
                || !pages.isArray()
                || pages.isEmpty()
                || pages.size() > 100) throw badRequest("Páginas do documento inválidas");
        Set<String> ids = new HashSet<>();
        Set<String> pageIds = new HashSet<>();

        for (JsonNode page : pages) {
            if (!page.isObject() || !textField(page, "id") || !textField(page, "name"))
                throw badRequest("Página inválida");
            if (page.has("slug") && !page.get("slug").isTextual()) throw badRequest("Rota inválida no blueprint");
            if (page.has("parentPageId") && !page.get("parentPageId").isTextual()) throw badRequest("Página-pai inválida no blueprint de rotas");
            String pageId = page.get("id").asText();
            if (!ids.add(pageId)) throw badRequest("IDs duplicados no documento");
            pageIds.add(pageId);
            JsonNode blocks = page.get("blocks");
            if (blocks == null || !blocks.isArray() || blocks.size() > 1000)
                throw badRequest("Blocos da página inválidos");
            for (JsonNode block : blocks) {
                if (!block.isObject()
                        || !textField(block, "id")
                        || !textField(block, "definitionId")
                        || block.get("props") == null
                        || !block.get("props").isObject()) throw badRequest("Bloco inválido");
                blockContracts.validate(block);
                if (!ids.add(block.get("id").asText()))
                    throw badRequest("IDs duplicados no documento");
            }
        }
        JsonNode navbar = document.get("navbar");
        if (navbar != null && !navbar.isNull()) {
            if (!navbar.isObject() || !textField(navbar, "id") || !textField(navbar, "definitionId")
                    || navbar.get("props") == null || !navbar.get("props").isObject()
                    || !ids.add(navbar.get("id").asText())) throw badRequest("Navbar compartilhada inválida");
            validateRegionCategory(navbar, "navbar");
            blockContracts.validate(navbar);
        }
        JsonNode footer = document.get("footer");
        if (footer != null && !footer.isNull()) {
            if (!footer.isObject() || !textField(footer, "id") || !textField(footer, "definitionId")
                    || footer.get("props") == null || !footer.get("props").isObject()
                    || !ids.add(footer.get("id").asText())) throw badRequest("Rodapé compartilhado inválido");
            validateRegionCategory(footer, "footer");
            blockContracts.validate(footer);
        }
        if (!pageIds.contains(activePageId.asText())) throw badRequest("Página ativa inválida");
        br.com.ites.server.services.Web.Publication.FormFieldSchema.validateDocument(document);
        validateTemplateComposition(document, organizationId, previousDocument, explicitlyAdoptedRegions);
    }

    private void validateTemplateComposition(JsonNode document, UUID organizationId, JsonNode previousDocument,
            Set<String> explicitlyAdoptedRegions) {
        Map<String, JsonNode> oldPages = new java.util.HashMap<>();
        Set<String> requestedPageIds = new HashSet<>();
        for (JsonNode page : document.path("pages"))
            if (page.path("id").isTextual()) requestedPageIds.add(page.path("id").asText());
        if (previousDocument != null) {
            for (JsonNode page : previousDocument.path("pages"))
                if (page.path("id").isTextual()) oldPages.put(page.path("id").asText(), page);
        }
        boolean removesTemplatedPage = oldPages.entrySet().stream()
                .anyMatch(entry -> !requestedPageIds.contains(entry.getKey())
                        && entry.getValue().hasNonNull("templateOrigin"));
        boolean addsPage = false;
        for (JsonNode page : document.path("pages")) {
            if (!oldPages.containsKey(page.path("id").asText())) {
                addsPage = true;
                break;
            }
        }
        if (removesTemplatedPage && addsPage)
            throw badRequest("Salve a remoção da página vinculada antes de adicionar outra página");
        for (JsonNode page : document.path("pages")) {
            JsonNode origin = page.get("templateOrigin");
            JsonNode oldPage = oldPages.get(page.path("id").asText());
            JsonNode oldOrigin = oldPage == null ? null : oldPage.get("templateOrigin");
            if (oldPage != null && !sameOptionalNode(oldOrigin, origin)) {
                throw badRequest("A origem do modelo de uma página existente não pode ser alterada nesta operação");
            }
            if (origin == null || !origin.path("source").asText().equals("ORGANIZATION")) continue;

            JsonNode snapshot = templateSnapshot(organizationId, origin);
            JsonNode composition = snapshot.get("composition");
            if (composition == null) continue;
            JsonNode allowed = composition.get("allowedDefinitionIds");
            if (allowed != null) {
                Set<String> allowedIds = new HashSet<>();
                for (JsonNode definitionId : allowed) {
                    if (!definitionId.isTextual() || definitionId.asText().isBlank())
                        throw badRequest("Lista de blocos do modelo inválida");
                    allowedIds.add(definitionId.asText());
                }
                for (JsonNode block : page.path("blocks"))
                    if (!allowedIds.contains(block.path("definitionId").asText()))
                        throw badRequest("Este modelo não permite um dos blocos da página");
            }
            JsonNode pageComposition = page.get("composition");
            if (allowed != null && (pageComposition == null
                    || !allowed.equals(pageComposition.path("allowedDefinitionIds"))))
                throw badRequest("A composição da página não corresponde ao modelo selecionado");
        }

        JsonNode regionOrigins = document.get("regionOrigins");
        JsonNode previousOrigins = previousDocument == null ? null : previousDocument.get("regionOrigins");
        for (String region : Set.of("navbar", "footer")) {
            JsonNode requestedOrigin = regionOrigins == null ? null : regionOrigins.get(region);
            JsonNode previousOrigin = previousOrigins == null ? null : previousOrigins.get(region);
            if (previousDocument != null && !sameOptionalNode(previousOrigin, requestedOrigin)
                    && !explicitlyAdoptedRegions.contains(region))
                throw badRequest("A origem de uma área compartilhada não pode ser alterada nesta operação");
            if (requestedOrigin == null || requestedOrigin.isNull()) continue;

            JsonNode snapshot = templateSnapshot(organizationId, requestedOrigin);
            JsonNode composition = snapshot.get("composition");
            JsonNode protectedRegions = composition == null ? null : composition.get("protectedRegions");
            JsonNode regionSnapshot = snapshot.path("regions").get(region);
            if (protectedRegions == null || !containsText(protectedRegions, region)
                    || regionSnapshot == null || regionSnapshot.isNull())
                throw badRequest("O modelo não define esta área compartilhada");
            JsonNode documentRegion = document.get(region);
            if (!sameRegion(documentRegion, regionSnapshot, region, document))
                throw badRequest("A área compartilhada não corresponde à versão do modelo adotada");
        }
    }

    private static boolean sameOptionalNode(JsonNode left, JsonNode right) {
        if (left == null || left.isNull()) return right == null || right.isNull();
        return right != null && !right.isNull() && left.equals(right);
    }

    private JsonNode templateSnapshot(UUID organizationId, JsonNode origin) {
        if (!origin.isObject() || !origin.path("source").asText().equals("ORGANIZATION")
                || !origin.path("templateId").isTextual() || !origin.path("versionId").isTextual())
            throw badRequest("Origem de modelo inválida");
        try {
            UUID templateId = UUID.fromString(origin.path("templateId").asText());
            UUID versionId = UUID.fromString(origin.path("versionId").asText());
            PageTemplateRepository.TemplateSnapshot stored = pageTemplates.findVersionSnapshot(
                    organizationId, templateId, versionId)
                    .orElseThrow(ProjectService::notFound);
            if (!origin.path("version").isIntegralNumber()
                    || origin.path("version").intValue() != stored.version())
                throw badRequest("A versão da origem do modelo é inválida");
            JsonNode snapshot = json.readTree(stored.content());
            if (!snapshot.isObject()) throw badRequest("Snapshot de modelo inválido");
            return snapshot;
        } catch (IllegalArgumentException exception) {
            throw badRequest("Origem de modelo inválida");
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw badRequest("Snapshot de modelo inválido");
        }
    }

    private static boolean containsText(JsonNode values, String expected) {
        if (!values.isArray()) return false;
        for (JsonNode value : values) if (value.isTextual() && value.asText().equals(expected)) return true;
        return false;
    }

    private boolean sameRegion(JsonNode actual, JsonNode expected, String region, JsonNode document) {
        if (actual == null || !actual.isObject() || !expected.isObject()) return false;
        ObjectNode actualValue = ((ObjectNode) actual).deepCopy();
        ObjectNode expectedValue = ((ObjectNode) expected).deepCopy();
        actualValue.remove("id");
        expectedValue.remove("id");
        if (region.equals("navbar")) {
            JsonNode actualItems = actualValue.path("props").get("items");
            JsonNode sourceItems = expectedValue.path("props").get("items");
            ObjectNode actualProps = ((ObjectNode) actualValue.get("props")).deepCopy();
            ObjectNode expectedProps = ((ObjectNode) expectedValue.get("props")).deepCopy();
            actualProps.remove("items");
            expectedProps.remove("items");
            actualValue.set("props", actualProps);
            expectedValue.set("props", expectedProps);
            if (!actualValue.equals(expectedValue)) return false;
            return sameNavigationItems(actualItems, sourceItems, document);
        }
        return actualValue.equals(expectedValue);
    }

    private boolean sameNavigationItems(JsonNode actual, JsonNode source, JsonNode document) {
        if (actual == null || !actual.isArray()) return false;
        var expected = json.createArrayNode();
        if (source != null && source.isArray()) {
            for (JsonNode item : source)
                if (!item.path("href").asText().startsWith("page:")) expected.add(item);
        }
        int count = Math.min(50, document.path("pages").size());
        for (int index = 0; index < count; index++) {
            JsonNode page = document.path("pages").get(index);
            var item = json.createObjectNode();
            item.put("id", page.path("id").asText());
            item.put("title", page.path("name").asText());
            item.put("description", "");
            item.put("href", "page:" + page.path("id").asText());
            item.put("value", "");
            var features = item.putArray("features");
            if (page.path("parentPageId").isTextual()) features.add(page.path("parentPageId").asText());
            expected.add(item);
        }
        return actual.equals(expected);
    }

    private void validateRegionCategory(JsonNode region, String expectedCategory) {
        String category = blockContracts.category(region.path("definitionId").asText());
        if (category != null && !category.equals(expectedCategory))
            throw badRequest("A definição não pode ocupar esta área compartilhada");
    }

    private static boolean textField(JsonNode object, String field) {
        JsonNode value = object.get(field);
        return value != null && value.isTextual() && !value.asText().isBlank();
    }

    private JsonNode routeBlueprint(JsonNode document) {
        JsonNode pages = document.path("pages");
        Set<String> ids = new HashSet<>();
        java.util.Map<String, JsonNode> pagesById = new java.util.HashMap<>();
        for (JsonNode page : pages) {
            String id = page.path("id").asText();
            String slug = page.path("slug").asText(slugify(page.path("name").asText()));
            if (!slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*"))
                throw badRequest("Rota inválida no blueprint");
            ids.add(id);
            pagesById.put(id, page);
        }
        Set<String> paths = new HashSet<>();
        var routes = json.createArrayNode();
        for (JsonNode page : pages) {
            String parentId = page.path("parentPageId").asText("");
            if (!parentId.isBlank() && !ids.contains(parentId)) throw badRequest("Página-pai inválida no blueprint de rotas");
            java.util.ArrayDeque<String> segments = new java.util.ArrayDeque<>();
            JsonNode current = page;
            Set<String> visited = new HashSet<>();
            while (current != null) {
                String currentId = current.path("id").asText();
                if (!visited.add(currentId)) throw badRequest("Ciclo detectado no blueprint de rotas");
                segments.addFirst(current.path("slug").asText(slugify(current.path("name").asText())));
                String ancestorId = current.path("parentPageId").asText("");
                current = ancestorId.isBlank() ? null : pagesById.get(ancestorId);
            }
            String path = String.join("/", segments);
            if (!paths.add(path)) throw badRequest("Rotas duplicadas no blueprint");
            var route = json.createObjectNode();
            route.put("pageId", page.path("id").asText());
            route.put("slug", page.path("slug").asText(slugify(page.path("name").asText())));
            route.put("path", path);
            if (!parentId.isBlank()) route.put("parentPageId", parentId);
            routes.add(route);
        }
        return routes;
    }

    private static String slugify(String value) {
        String normalized = java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase().replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        return normalized.isBlank() ? "pagina" : normalized;
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    private record NodeDepth(JsonNode node, int depth) {}
}

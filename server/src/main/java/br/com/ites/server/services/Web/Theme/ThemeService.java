package br.com.ites.server.services.Web.Theme;

import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.repositories.User.UserRepository;
import br.com.ites.server.repositories.Web.Project.ProjectRepository;
import br.com.ites.server.repositories.Web.Theme.ThemeRepository;
import br.com.ites.server.repositories.Organization.OrganizationRepository;
import br.com.ites.server.models.Organization.PermissionAction;
import br.com.ites.server.models.Organization.GrantScopeType;
import br.com.ites.server.services.Organization.OrganizationAuthorizationService;
import br.com.ites.server.services.Organization.OrganizationAuditEventService;
import br.com.ites.server.models.Web.Theme.ThemeEntity;
import br.com.ites.server.utils.dtos.Web.Theme.CreateThemeDTO;
import br.com.ites.server.utils.dtos.Web.Theme.UpdateThemeDTO;
import br.com.ites.server.utils.dtos.Web.Theme.ThemeResponseDTO;
import br.com.ites.server.utils.pagination.PageRequest;
import br.com.ites.server.utils.pagination.PageResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import java.util.List;
import java.util.UUID;

@Service
public class ThemeService {
    private final ThemeRepository themes;
    private final UserRepository users;
    private final ProjectRepository projects;
    private final OrganizationRepository organizations;
    private final OrganizationAuthorizationService authorization;
    private final OrganizationAuditEventService auditEvents;

    public ThemeService(ThemeRepository themes, UserRepository users, ProjectRepository projects,
                        OrganizationRepository organizations, OrganizationAuthorizationService authorization,
                        OrganizationAuditEventService auditEvents) {
        this.themes = themes;
        this.users = users;
        this.projects = projects;
        this.organizations = organizations;
        this.authorization = authorization;
        this.auditEvents = auditEvents;
    }

    @Transactional(readOnly = true)
    public PageResponse<ThemeResponseDTO> list(UUID ownerId, UUID selectedOrganizationId, int page, int size) {
        activeOwner(ownerId);
        UUID organizationId = organizationId(ownerId, selectedOrganizationId, PermissionAction.THEME_READ);
        return themes.findByOrganization_IdOrderByUpdatedAtDescIdDesc(organizationId, PageRequest.of(page, size, 20))
                .map(ThemeResponseDTO::from);
    }

    @Transactional
    public ThemeResponseDTO create(UUID ownerId, UUID selectedOrganizationId, CreateThemeDTO request) {
        activeOwner(ownerId);
        UUID organizationId = organizationId(ownerId, selectedOrganizationId, PermissionAction.THEME_CREATE);
        String name = request.name().strip();
        if (themes.existsByOrganization_IdAndNameIgnoreCase(organizationId, name))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um tema com este nome");
        validateConfiguration(request.configuration());
        return ThemeResponseDTO.from(themes.insert(ownerId, organizationId, name, request.configuration()));
    }

    @Transactional
    public ThemeResponseDTO update(UUID ownerId, UUID selectedOrganizationId, UUID id, UpdateThemeDTO request) {
        activeOwner(ownerId);
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        ThemeEntity theme = themes.findByIdAndOrganization_Id(id, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        authorization.requireResource(ownerId, organizationId, PermissionAction.THEME_UPDATE, GrantScopeType.THEME, id);
        String name = request.name().strip();
        if (themes.existsByOrganization_IdAndNameIgnoreCase(organizationId, name)
                && !theme.getName().equalsIgnoreCase(name))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um tema com este nome");
        validateConfiguration(request.configuration());
        theme.update(name, request.configuration());
        return ThemeResponseDTO.from(themes.update(theme, organizationId));
    }

    @Transactional
    public void delete(UUID ownerId, UUID selectedOrganizationId, UUID id) {
        activeOwner(ownerId);
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        ThemeEntity theme = themes.findByIdAndOrganization_Id(id, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        authorization.requireResource(ownerId, organizationId, PermissionAction.THEME_DELETE, GrantScopeType.THEME, id);
        if (projects.existsByTheme_Id(id))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O tema está vinculado a um projeto");
        themes.deleteByIdAndOrganization_Id(theme.getId(), organizationId);
        auditEvents.append(organizationId, ownerId, "THEME_DELETED", "THEME", id);
    }

    private UUID organizationId(UUID userId, UUID selectedOrganizationId) {
        if (selectedOrganizationId != null) return selectedOrganizationId;
        return organizations.findDefaultOrganizationId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
    }

    private UUID organizationId(UUID userId, UUID selectedOrganizationId, PermissionAction action) {
        UUID organizationId = organizationId(userId, selectedOrganizationId);
        authorization.requireOrganization(userId, organizationId, action);
        return organizationId;
    }

    private UserEntity activeOwner(UUID ownerId) {
        return users.findById(ownerId).filter(UserEntity::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private static void validateConfiguration(JsonNode configuration) {
        if (configuration == null || !configuration.isObject() || configuration.toString().length() > 10000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Configuração do tema inválida");
        for (String mode : List.of("light", "dark")) {
            JsonNode palette = configuration.get(mode);
            if (palette == null || !palette.isObject())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paleta do tema inválida");
            for (String key : List.of("primary", "secondary", "accent", "background", "foreground", "card", "border", "muted", "success", "destructive")) {
                JsonNode color = palette.get(key);
                if (color == null || !color.isTextual() || !color.asText().matches("#[0-9a-fA-F]{6}"))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cor do tema inválida");
            }
        }
    }
}

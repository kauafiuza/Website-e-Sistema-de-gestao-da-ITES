package br.com.ites.server.services.Organization;

import br.com.ites.server.models.Organization.GrantScopeType;
import br.com.ites.server.models.Organization.OrganizationFeature;
import br.com.ites.server.models.Organization.PermissionAction;
import br.com.ites.server.models.Organization.PermissionGrant;
import br.com.ites.server.repositories.Organization.PermissionGrantRepository;
import br.com.ites.server.services.Ites.ItesAccessService;
import br.com.ites.server.utils.pagination.PageRequest;
import br.com.ites.server.utils.pagination.PageResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Resolve autoridade administrativa global e grants explícitos dentro do escopo organizacional. */
@Service
public class OrganizationAuthorizationService {
    private static final List<PermissionAction> OWNER_ACTIONS = List.of(
            PermissionAction.PROJECT_READ, PermissionAction.PROJECT_CREATE, PermissionAction.PROJECT_UPDATE,
            PermissionAction.PROJECT_DELETE, PermissionAction.THEME_READ, PermissionAction.THEME_CREATE,
            PermissionAction.THEME_UPDATE, PermissionAction.THEME_DELETE, PermissionAction.PUBLICATION_READ,
            PermissionAction.PUBLICATION_MANAGE, PermissionAction.PUBLICATION_ANALYTICS_READ,
            PermissionAction.PUBLICATION_SUBMISSIONS_READ, PermissionAction.PUBLICATION_ACTIVITY_READ,
            PermissionAction.ORGANIZATION_GRANTS_READ, PermissionAction.ORGANIZATION_GRANTS_MANAGE);
    private final PermissionGrantRepository grants;
    private final OrganizationFeatureService features;
    private final OrganizationAuditEventService auditEvents;
    private final ItesAccessService access;

    public OrganizationAuthorizationService(PermissionGrantRepository grants,
            OrganizationFeatureService features, OrganizationAuditEventService auditEvents,
            ItesAccessService access) {
        this.grants = grants;
        this.features = features;
        this.auditEvents = auditEvents;
        this.access = access;
    }

    public void requireOrganization(UUID userId, UUID organizationId, PermissionAction action) {
        require(userId, organizationId, action, GrantScopeType.ORGANIZATION, organizationId);
    }

    /** Verifica somente o vínculo ativo quando o domínio possui autoria própria e não usa grants. */
    public void requireActiveMembership(UUID userId, UUID organizationId) {
        if (isAdministrator(userId)) {
            requireOrganizationExists(organizationId);
            return;
        }
        if (!grants.isMember(userId, organizationId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    /** Mantém o vínculo ativo bloqueado contra revogação até o commit da mutação. */
    public void requireActiveMembershipForMutation(UUID userId, UUID organizationId) {
        if (isAdministrator(userId)) {
            requireOrganizationExists(organizationId);
            return;
        }
        if (!grants.lockActiveMembership(userId, organizationId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    public void requireResource(UUID userId, UUID organizationId, PermissionAction action,
            GrantScopeType scopeType, UUID resourceId) {
        require(userId, organizationId, action, scopeType, resourceId);
    }

    public boolean allowsResource(UUID userId, UUID organizationId, PermissionAction action,
            GrantScopeType scopeType, UUID resourceId) {
        if (isAdministrator(userId)) return resourceExists(scopeType, resourceId, organizationId);
        if (!grants.isMember(userId, organizationId)) return false;
        try {
            for (OrganizationFeature feature : featuresFor(action))
                features.requireEnabled(organizationId, feature);
        } catch (ResponseStatusException error) {
            if (error.getStatusCode() == HttpStatus.FORBIDDEN) return false;
            throw error;
        }
        return grants.allows(userId, organizationId, action, scopeType, resourceId);
    }

    public boolean allowsAnyProject(UUID userId, UUID organizationId, PermissionAction action) {
        if (isAdministrator(userId)) return grants.organizationExists(organizationId);
        if (!grants.isMember(userId, organizationId)) return false;
        try {
            for (OrganizationFeature feature : featuresFor(action))
                features.requireEnabled(organizationId, feature);
        } catch (ResponseStatusException error) {
            if (error.getStatusCode() == HttpStatus.FORBIDDEN) return false;
            throw error;
        }
        if (grants.allows(userId, organizationId, action, GrantScopeType.ORGANIZATION, organizationId))
            return true;
        return grants.findActiveProjectScopeIds(userId, organizationId, action).stream()
                .anyMatch(projectId -> grants.allows(userId, organizationId, action,
                        GrantScopeType.PROJECT, projectId));
    }

    private void require(UUID userId, UUID organizationId, PermissionAction action,
            GrantScopeType scopeType, UUID scopeId) {
        if (isAdministrator(userId)) {
            if (!resourceExists(scopeType, scopeId, organizationId))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            return;
        }
        if (!grants.isMember(userId, organizationId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        for (OrganizationFeature feature : featuresFor(action))
            features.requireEnabled(organizationId, feature);
        if (!grants.allows(userId, organizationId, action, scopeType, scopeId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    private boolean isAdministrator(UUID userId) {
        return access.isSystemAdministrator(userId);
    }

    private boolean resourceExists(GrantScopeType scopeType, UUID scopeId, UUID organizationId) {
        if (scopeType == GrantScopeType.ORGANIZATION)
            return organizationId.equals(scopeId) && grants.organizationExists(organizationId);
        return grants.resourceExists(scopeType, scopeId, organizationId);
    }

    private void requireOrganizationExists(UUID organizationId) {
        if (!grants.organizationExists(organizationId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    private static List<OrganizationFeature> featuresFor(PermissionAction action) {
        return switch (action) {
            case PROJECT_READ, PROJECT_CREATE, PROJECT_UPDATE, PROJECT_DELETE ->
                    List.of(OrganizationFeature.PROJECTS);
            case THEME_READ, THEME_CREATE, THEME_UPDATE, THEME_DELETE ->
                    List.of(OrganizationFeature.THEMES);
            case PUBLICATION_SUBMISSIONS_READ, PUBLICATION_SUBMISSIONS_EXPORT ->
                    List.of(OrganizationFeature.PUBLICATIONS, OrganizationFeature.FORM_RESPONSES);
            case PUBLICATION_READ, PUBLICATION_MANAGE, PUBLICATION_APPROVE, PUBLICATION_ANALYTICS_READ,
                    PUBLICATION_ACTIVITY_READ -> List.of(OrganizationFeature.PUBLICATIONS);
            case ORGANIZATION_GRANTS_READ, ORGANIZATION_GRANTS_MANAGE, ORGANIZATION_AUDIT_READ -> List.of();
        };
    }

    /** Provisiona as permissões base da conta nova sem usar o papel como bypass em runtime. */
    @Transactional
    public void initializeOwner(UUID userId, UUID organizationId) {
        for (PermissionAction action : OWNER_ACTIONS) {
            grants.create(new PermissionGrant(UUID.randomUUID(), userId, organizationId, action,
                    GrantScopeType.ORGANIZATION, organizationId, userId, null, "ACTIVE", true,
                    null, null, OffsetDateTime.now(), null));
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<PermissionGrant> list(UUID actorId, UUID organizationId, int page, int size) {
        requireOrganization(actorId, organizationId, PermissionAction.ORGANIZATION_GRANTS_READ);
        PageRequest request = PageRequest.of(page, size, 100);
        return PageResponse.of(grants.list(organizationId, request.size(), request.offset()), request,
                grants.count(organizationId));
    }

    @Transactional
    public PermissionGrant create(UUID actorId, UUID organizationId, UUID beneficiaryId,
            PermissionAction action, GrantScopeType scopeType, UUID scopeId,
            OffsetDateTime validUntil, boolean canDelegate, UUID parentGrantId, UUID authorityGrantId) {
        java.util.Set<UUID> activeMemberships = grants.lockActiveMemberships(actorId, beneficiaryId, organizationId);
        if (!activeMemberships.contains(actorId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (!activeMemberships.contains(beneficiaryId)) throw badRequest("Beneficiário não pertence à organização");
        if (action == PermissionAction.PUBLICATION_APPROVE) {
            if (parentGrantId != null) throw badRequest("A aprovação exige concessão explícita por autoridade de gestão");
            return createAuthorityRoot(actorId, organizationId, beneficiaryId, action, scopeType, scopeId,
                    validUntil, canDelegate, authorityGrantId);
        }
        if (action == PermissionAction.ORGANIZATION_AUDIT_READ && parentGrantId != null)
            throw badRequest("A leitura da auditoria exige uma concessão explícita por autoridade de gestão");
        if ((action == PermissionAction.PUBLICATION_SUBMISSIONS_EXPORT
                || action == PermissionAction.ORGANIZATION_AUDIT_READ) && parentGrantId == null) {
            return createAuthorityRoot(actorId, organizationId, beneficiaryId, action, scopeType, scopeId,
                    validUntil, canDelegate, authorityGrantId);
        }
        if (authorityGrantId != null) throw badRequest("A autoridade de origem só pode ser usada no grant raiz de exportação");
        if (parentGrantId == null) throw badRequest("Grant pai obrigatório");
        if (action == PermissionAction.PUBLICATION_SUBMISSIONS_EXPORT && scopeType == GrantScopeType.THEME)
            throw badRequest("Exportação só pode abranger a organização ou um projeto");
        if (scopeType == GrantScopeType.ORGANIZATION) {
            if (!organizationId.equals(scopeId)) throw badRequest("Escopo da organização inválido");
        } else if (!grants.resourceExists(scopeType, scopeId, organizationId)) {
            throw badRequest("Recurso não pertence à organização");
        }
        if (validUntil != null && !validUntil.isAfter(OffsetDateTime.now()))
            throw badRequest("A validade deve estar no futuro");

        PermissionGrant parent = grants.findForUpdate(parentGrantId, organizationId)
                .orElseThrow(() -> badRequest("Grant pai inválido"));
        if (!parent.beneficiaryUserId().equals(actorId) || !parent.canDelegate()
                || !"ACTIVE".equals(parent.state())
                || (parent.validUntil() != null && !parent.validUntil().isAfter(OffsetDateTime.now()))
                || !parent.action().equals(action)
                || !grants.allows(actorId, organizationId, parent.action(), parent.scopeType(), parent.scopeId())
                || (parent.validUntil() != null
                    && (validUntil == null || validUntil.isAfter(parent.validUntil())))
                || (canDelegate && !parent.canDelegate())
                || !scopeIsNarrower(parent, scopeType, scopeId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Grant excede os limites do grant pai");
        }
        PermissionGrant grant = new PermissionGrant(UUID.randomUUID(), beneficiaryId, organizationId,
                action, scopeType, scopeId, actorId, validUntil, "ACTIVE", canDelegate,
                parentGrantId, null, OffsetDateTime.now(), null);
        grants.create(grant);
        auditEvents.append(organizationId, actorId, "PERMISSION_GRANTED", "PERMISSION_GRANT", grant.id());
        return grant;
    }

    private PermissionGrant createAuthorityRoot(UUID actorId, UUID organizationId, UUID beneficiaryId,
            PermissionAction action, GrantScopeType scopeType, UUID scopeId,
            OffsetDateTime validUntil, boolean canDelegate, UUID authorityGrantId) {
        if (authorityGrantId == null) throw badRequest("Grant de gestão de origem obrigatório");
        if (action == PermissionAction.PUBLICATION_APPROVE && canDelegate)
            throw badRequest("A autoridade de aprovação não pode ser delegada");
        if (action == PermissionAction.ORGANIZATION_AUDIT_READ
                && (scopeType != GrantScopeType.ORGANIZATION || canDelegate))
            throw badRequest("A leitura da auditoria exige grant explícito para toda a organização sem delegação");
        if (scopeType == GrantScopeType.THEME)
            throw badRequest("A autoridade só pode abranger a organização ou um projeto");
        if (scopeType == GrantScopeType.ORGANIZATION) {
            if (!organizationId.equals(scopeId)) throw badRequest("Escopo da organização inválido");
        } else if (!grants.resourceExists(GrantScopeType.PROJECT, scopeId, organizationId)) {
            throw badRequest("Projeto não pertence à organização");
        }
        if (validUntil != null && !validUntil.isAfter(OffsetDateTime.now()))
            throw badRequest("A validade deve estar no futuro");

        PermissionGrant authority = grants.findForUpdate(authorityGrantId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Grant de gestão inválido"));
        OffsetDateTime authorityValidityBound = grants.validityBound(authorityGrantId);
        requireOrganization(actorId, organizationId, PermissionAction.ORGANIZATION_GRANTS_MANAGE);
        if (!authority.beneficiaryUserId().equals(actorId)
                || authority.action() != PermissionAction.ORGANIZATION_GRANTS_MANAGE
                || authority.scopeType() != GrantScopeType.ORGANIZATION
                || !authority.scopeId().equals(organizationId)
                || !authority.canDelegate()
                || !"ACTIVE".equals(authority.state())
                || (authority.validUntil() != null && !authority.validUntil().isAfter(OffsetDateTime.now()))
                || !grants.allows(actorId, organizationId, PermissionAction.ORGANIZATION_GRANTS_MANAGE,
                        GrantScopeType.ORGANIZATION, organizationId)
                || (authorityValidityBound != null
                        && (validUntil == null || validUntil.isAfter(authorityValidityBound)))
                || (canDelegate && !authority.canDelegate())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Grant excede os limites da autoridade de gestão");
        }
        PermissionGrant grant = new PermissionGrant(UUID.randomUUID(), beneficiaryId, organizationId,
                action, scopeType, scopeId, actorId, validUntil,
                "ACTIVE", canDelegate, null, authorityGrantId, OffsetDateTime.now(), null);
        grants.create(grant);
        auditEvents.append(organizationId, actorId, "PERMISSION_GRANTED", "PERMISSION_GRANT", grant.id());
        return grant;
    }

    @Transactional
    public void revoke(UUID actorId, UUID organizationId, UUID grantId) {
        requireOrganization(actorId, organizationId, PermissionAction.ORGANIZATION_GRANTS_MANAGE);
        if (grants.findForUpdate(grantId, organizationId).isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        for (UUID revokedGrantId : grants.revokeTree(grantId, organizationId))
            auditEvents.append(organizationId, actorId, "PERMISSION_REVOKED", "PERMISSION_GRANT", revokedGrantId);
    }

    private static boolean scopeIsNarrower(PermissionGrant parent, GrantScopeType childType, UUID childId) {
        if (parent.scopeType() == GrantScopeType.ORGANIZATION) return true;
        return parent.scopeType() == childType && parent.scopeId().equals(childId);
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}

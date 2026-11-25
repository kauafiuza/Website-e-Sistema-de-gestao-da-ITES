package br.com.ites.server.services.Organization;

import br.com.ites.server.models.Organization.PermissionAction;
import br.com.ites.server.services.Organization.OrganizationAuditEventService.AuditEvent;
import br.com.ites.server.utils.pagination.PageResponse;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationAuditQueryService {
    private final OrganizationAuthorizationService authorization;
    private final OrganizationAuditEventService auditEvents;

    public OrganizationAuditQueryService(OrganizationAuthorizationService authorization,
            OrganizationAuditEventService auditEvents) {
        this.authorization = authorization;
        this.auditEvents = auditEvents;
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditEvent> list(UUID actorUserId, UUID organizationId, int page, int size) {
        authorization.requireOrganization(actorUserId, organizationId, PermissionAction.ORGANIZATION_AUDIT_READ);
        return auditEvents.list(organizationId, page, size);
    }
}

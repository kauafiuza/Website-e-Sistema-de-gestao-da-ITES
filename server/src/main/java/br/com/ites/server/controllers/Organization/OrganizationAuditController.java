package br.com.ites.server.controllers.Organization;

import br.com.ites.server.services.Organization.OrganizationAuditEventService.AuditEvent;
import br.com.ites.server.services.Organization.OrganizationAuditQueryService;
import br.com.ites.server.utils.pagination.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/organizations/{organizationId}/audit-events")
@SecurityRequirement(name = "bearerAuth")
public class OrganizationAuditController {
    private final OrganizationAuditQueryService auditQuery;

    public OrganizationAuditController(OrganizationAuditQueryService auditQuery) {
        this.auditQuery = auditQuery;
    }

    @GetMapping
    @Operation(summary = "Lista a trilha de auditoria da organização")
    public PageResponse<AuditEvent> list(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return auditQuery.list(UUID.fromString(jwt.getSubject()), organizationId, page, size);
    }
}

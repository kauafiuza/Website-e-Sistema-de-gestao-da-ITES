package br.com.ites.server.controllers.Organization;

import br.com.ites.server.models.Organization.PermissionGrant;
import br.com.ites.server.services.Organization.OrganizationAuthorizationService;
import br.com.ites.server.utils.dtos.Organization.CreatePermissionGrantDTO;
import br.com.ites.server.utils.dtos.Organization.PermissionGrantResponseDTO;
import br.com.ites.server.utils.pagination.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/organizations/{organizationId}/grants")
@Tag(name = "Permissões da organização", description = "Consulta, concessão delegável e revogação de grants.")
@SecurityRequirement(name = "bearerAuth")
public class OrganizationGrantController {
    private final OrganizationAuthorizationService authorization;

    public OrganizationGrantController(OrganizationAuthorizationService authorization) {
        this.authorization = authorization;
    }

    @GetMapping
    @Operation(summary = "Lista grants da organização")
    public PageResponse<PermissionGrantResponseDTO> list(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return authorization.list(userId(jwt), organizationId, page, size)
                .map(PermissionGrantResponseDTO::from);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Concede um grant derivado de um grant delegável")
    public PermissionGrantResponseDTO create(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId, @Valid @RequestBody CreatePermissionGrantDTO request) {
        PermissionGrant grant = authorization.create(userId(jwt), organizationId,
                request.beneficiaryUserId(), request.action(), request.scopeType(), request.scopeId(),
                request.validUntil(), request.canDelegate(), request.parentGrantId(), request.authorityGrantId());
        return PermissionGrantResponseDTO.from(grant);
    }

    @DeleteMapping("/{grantId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoga um grant e todos os seus dependentes")
    public void revoke(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @PathVariable UUID grantId) {
        authorization.revoke(userId(jwt), organizationId, grantId);
    }

    private static UUID userId(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}

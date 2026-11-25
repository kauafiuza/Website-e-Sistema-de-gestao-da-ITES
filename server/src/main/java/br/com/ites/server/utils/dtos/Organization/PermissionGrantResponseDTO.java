package br.com.ites.server.utils.dtos.Organization;

import br.com.ites.server.models.Organization.GrantScopeType;
import br.com.ites.server.models.Organization.PermissionAction;
import br.com.ites.server.models.Organization.PermissionGrant;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PermissionGrantResponseDTO(
        UUID id,
        UUID beneficiaryUserId,
        UUID organizationId,
        PermissionAction action,
        GrantScopeType scopeType,
        UUID scopeId,
        UUID issuerUserId,
        OffsetDateTime validUntil,
        String state,
        boolean canDelegate,
        UUID parentGrantId,
        UUID authorityGrantId,
        OffsetDateTime createdAt,
        OffsetDateTime revokedAt) {
    public static PermissionGrantResponseDTO from(PermissionGrant grant) {
        return new PermissionGrantResponseDTO(grant.id(), grant.beneficiaryUserId(), grant.organizationId(),
                grant.action(), grant.scopeType(), grant.scopeId(), grant.issuerUserId(), grant.validUntil(),
                grant.state(), grant.canDelegate(), grant.parentGrantId(), grant.authorityGrantId(), grant.createdAt(), grant.revokedAt());
    }
}

package br.com.ites.server.models.Organization;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PermissionGrant(
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
        OffsetDateTime revokedAt) {}

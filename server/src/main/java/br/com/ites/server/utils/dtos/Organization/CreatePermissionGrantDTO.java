package br.com.ites.server.utils.dtos.Organization;

import br.com.ites.server.models.Organization.GrantScopeType;
import br.com.ites.server.models.Organization.PermissionAction;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CreatePermissionGrantDTO(
        @NotNull UUID beneficiaryUserId,
        @NotNull PermissionAction action,
        @NotNull GrantScopeType scopeType,
        @NotNull UUID scopeId,
        OffsetDateTime validUntil,
        @NotNull Boolean canDelegate,
        UUID parentGrantId,
        UUID authorityGrantId) {}

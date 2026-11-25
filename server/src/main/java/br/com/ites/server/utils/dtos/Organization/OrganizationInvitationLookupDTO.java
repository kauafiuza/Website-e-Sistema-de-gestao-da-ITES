package br.com.ites.server.utils.dtos.Organization;

import java.time.OffsetDateTime;
import java.util.UUID;

public record OrganizationInvitationLookupDTO(
        UUID organizationId,
        String organizationName,
        String email,
        String state,
        OffsetDateTime expiresAt) {}

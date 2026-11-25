package br.com.ites.server.utils.dtos.Organization;

import java.time.OffsetDateTime;
import java.util.UUID;

public record OrganizationInvitationResponseDTO(
        UUID id,
        UUID organizationId,
        String email,
        String role,
        String state,
        UUID invitedByUserId,
        UUID acceptedUserId,
        OffsetDateTime createdAt,
        OffsetDateTime expiresAt,
        OffsetDateTime acceptedAt,
        OffsetDateTime revokedAt) {}

package br.com.ites.server.utils.dtos.Organization;

import java.time.OffsetDateTime;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

public record PageTemplateResponseDTO(
        UUID id,
        String name,
        UUID versionId,
        int version,
        JsonNode content,
        UUID createdBy,
        UUID versionCreatedBy,
        OffsetDateTime createdAt,
        OffsetDateTime versionCreatedAt) {
}

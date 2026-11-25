package br.com.ites.server.utils.dtos.Organization;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import tools.jackson.databind.JsonNode;

public record CreatePageTemplateVersionDTO(
        @Positive int expectedVersion,
        @NotNull JsonNode content) {
}

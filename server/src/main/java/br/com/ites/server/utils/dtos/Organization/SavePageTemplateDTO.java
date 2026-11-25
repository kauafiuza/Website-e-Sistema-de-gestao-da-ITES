package br.com.ites.server.utils.dtos.Organization;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

public record SavePageTemplateDTO(
        @NotBlank @Size(max = 150) String name,
        @NotNull JsonNode content) {
}

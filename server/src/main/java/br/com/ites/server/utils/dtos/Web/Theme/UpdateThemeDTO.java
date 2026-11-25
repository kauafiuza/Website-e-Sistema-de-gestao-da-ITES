package br.com.ites.server.utils.dtos.Web.Theme;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

public record UpdateThemeDTO(
    @NotBlank
    @Size(max = 80)
    String name,
    @NotNull
    JsonNode configuration
) {}

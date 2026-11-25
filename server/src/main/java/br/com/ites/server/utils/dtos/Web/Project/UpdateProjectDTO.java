package br.com.ites.server.utils.dtos.Web.Project;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import tools.jackson.databind.JsonNode;

public record UpdateProjectDTO(@NotNull @Min(1) Long revision, @NotNull JsonNode document) {}

package br.com.ites.server.utils.dtos.Web.Project;

import br.com.ites.server.models.Web.Project.ProjectEntity;

import tools.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.UUID;

public record ProjectResponseDTO(
        UUID id,
        String name,
        long revision,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        JsonNode document,
        UUID themeId,
        JsonNode routeBlueprint) {

    public static ProjectResponseDTO from(ProjectEntity project) {
        return new ProjectResponseDTO(
                project.getId(),
                project.getName(),
                project.getRevision(),
                project.getCreatedAt(),
                project.getUpdatedAt(),
                project.getDocument(),
                project.getThemeId(),
                project.getRouteBlueprint());
    }
}

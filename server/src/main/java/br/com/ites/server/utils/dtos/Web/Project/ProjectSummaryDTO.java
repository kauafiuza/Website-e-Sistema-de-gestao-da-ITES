package br.com.ites.server.utils.dtos.Web.Project;

import br.com.ites.server.repositories.Web.Project.ProjectRepository;

import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.UUID;

public record ProjectSummaryDTO(
        UUID id,
        String name,
        long revision,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        ProjectPreviewDTO preview,
        Boolean publicationActive) {

    public static ProjectSummaryDTO from(ProjectRepository.Summary project, ObjectMapper json) {
        return new ProjectSummaryDTO(
                project.getId(),
                project.getName(),
                project.getRevision(),
                project.getCreatedAt(),
                project.getUpdatedAt(),
                ProjectPreviewDTO.from(
                        project.getPreviewPageJson(), project.getPreviewThemeJson(), json),
                project.getPublicationActive());
    }
}

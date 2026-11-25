package br.com.ites.server.controllers.Web.Project;

import br.com.ites.server.services.Web.Project.ProjectService;
import br.com.ites.server.repositories.Web.Project.ProjectRevisionRepository;
import br.com.ites.server.utils.dtos.Web.Project.CreateProjectDTO;
import br.com.ites.server.utils.dtos.Web.Project.AdoptProjectRegionsDTO;
import br.com.ites.server.utils.dtos.Web.Project.ProjectResponseDTO;
import br.com.ites.server.utils.dtos.Web.Project.ProjectSummaryDTO;
import br.com.ites.server.utils.dtos.Web.Project.RenameProjectDTO;
import br.com.ites.server.utils.dtos.Web.Project.UpdateProjectDTO;
import br.com.ites.server.utils.pagination.PageResponse;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/projects")
@Tag(name = "Projetos", description = "Criação, edição, listagem e exclusão de projetos da organização ativa.")
@SecurityRequirement(name = "bearerAuth")
public class ProjectController {
    private final ProjectService projects;

    public ProjectController(ProjectService projects) {
        this.projects = projects;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponseDTO create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @Valid @RequestBody CreateProjectDTO request) {
        return projects.create(ownerId(jwt), organizationId, request);
    }

    @GetMapping
    public PageResponse<ProjectSummaryDTO> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "recent") String sort) {
        return projects.list(ownerId(jwt), organizationId, page, size, q, sort);
    }

    @GetMapping("/{id}")
    public ProjectResponseDTO get(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID id) {
        return projects.get(ownerId(jwt), organizationId, id);
    }

    @GetMapping("/{id}/revisions")
    public PageResponse<ProjectRevisionRepository.DraftRevision> revisions(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return projects.revisions(ownerId(jwt), organizationId, id, page, size);
    }

    @PatchMapping("/{id}")
    public ProjectResponseDTO update(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateProjectDTO request) {
        return projects.updateDocument(ownerId(jwt), organizationId, id, request);
    }

    @PatchMapping("/{id}/regions/adoption")
    public ProjectResponseDTO adoptRegions(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID id,
            @Valid @RequestBody AdoptProjectRegionsDTO request) {
        return projects.adoptTemplateRegions(ownerId(jwt), organizationId, id, request);
    }

    @PatchMapping("/{id}/name")
    public ProjectResponseDTO rename(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID id,
            @Valid @RequestBody RenameProjectDTO request) {
        return projects.rename(ownerId(jwt), organizationId, id, request);
    }

    @PostMapping("/{id}/revisions/{revisionId}/restore")
    public ProjectResponseDTO restoreRevision(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID id,
            @PathVariable UUID revisionId) {
        return projects.restoreRevision(ownerId(jwt), organizationId, id, revisionId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID id) {
        projects.delete(ownerId(jwt), organizationId, id);
    }

    private static UUID ownerId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}

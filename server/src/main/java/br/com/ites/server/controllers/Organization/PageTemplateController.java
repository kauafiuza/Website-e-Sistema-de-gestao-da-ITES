package br.com.ites.server.controllers.Organization;

import br.com.ites.server.services.Organization.PageTemplateService;
import br.com.ites.server.utils.dtos.Organization.CreatePageTemplateVersionDTO;
import br.com.ites.server.utils.dtos.Organization.PageTemplateResponseDTO;
import br.com.ites.server.utils.dtos.Organization.SavePageTemplateDTO;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/organizations/{organizationId}/templates")
@Tag(name = "Modelos de página", description = "Modelos versionados de cada organização.")
@SecurityRequirement(name = "bearerAuth")
public class PageTemplateController {
    private final PageTemplateService templates;

    public PageTemplateController(PageTemplateService templates) {
        this.templates = templates;
    }

    @GetMapping
    public List<PageTemplateResponseDTO> list(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId) {
        return templates.list(actorId(jwt), organizationId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PageTemplateResponseDTO create(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId, @Valid @RequestBody SavePageTemplateDTO request) {
        return templates.create(actorId(jwt), organizationId, request);
    }

    @GetMapping("/{templateId}/versions")
    public List<PageTemplateResponseDTO> versions(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId, @PathVariable UUID templateId) {
        return templates.versions(actorId(jwt), organizationId, templateId);
    }

    @PostMapping("/{templateId}/versions")
    public PageTemplateResponseDTO createVersion(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId, @PathVariable UUID templateId,
            @Valid @RequestBody CreatePageTemplateVersionDTO request) {
        return templates.createVersion(actorId(jwt), organizationId, templateId, request);
    }

    @DeleteMapping("/{templateId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId, @PathVariable UUID templateId) {
        templates.archive(actorId(jwt), organizationId, templateId);
    }

    private static UUID actorId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}

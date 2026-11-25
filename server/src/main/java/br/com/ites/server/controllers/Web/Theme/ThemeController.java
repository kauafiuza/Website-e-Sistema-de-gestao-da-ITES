package br.com.ites.server.controllers.Web.Theme;

import br.com.ites.server.services.Web.Theme.ThemeService;
import br.com.ites.server.utils.dtos.Web.Theme.CreateThemeDTO;
import br.com.ites.server.utils.dtos.Web.Theme.UpdateThemeDTO;
import br.com.ites.server.utils.dtos.Web.Theme.ThemeResponseDTO;
import br.com.ites.server.utils.pagination.PageResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/themes")
@Tag(name = "Temas", description = "Temas visuais salvos na organização ativa.")
@SecurityRequirement(name = "bearerAuth")
public class ThemeController {
    private final ThemeService themes;
    public ThemeController(ThemeService themes) { this.themes = themes; }

    @GetMapping
    public PageResponse<ThemeResponseDTO> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return themes.list(UUID.fromString(jwt.getSubject()), organizationId, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ThemeResponseDTO create(@AuthenticationPrincipal Jwt jwt,
                                   @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
                                   @Valid @RequestBody CreateThemeDTO request) {
        return themes.create(UUID.fromString(jwt.getSubject()), organizationId, request);
    }

    @PutMapping("/{id}")
    public ThemeResponseDTO update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                   @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
                                   @Valid @RequestBody UpdateThemeDTO request) {
        return themes.update(UUID.fromString(jwt.getSubject()), organizationId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt,
                       @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
                       @PathVariable UUID id) {
        themes.delete(UUID.fromString(jwt.getSubject()), organizationId, id);
    }
}

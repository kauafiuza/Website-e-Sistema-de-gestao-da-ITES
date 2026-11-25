package br.com.ites.server.controllers.Web.Publication;

import br.com.ites.server.services.Web.Publication.PublicationService;
import br.com.ites.server.services.Web.Publication.FormSubmissionService;
import br.com.ites.server.services.Web.Publication.PublicationService.PublicPage;
import br.com.ites.server.services.Web.Publication.PublicationService.Publication;
import br.com.ites.server.utils.pagination.PageResponse;
import br.com.ites.server.utils.dtos.Web.Publication.PublicationReviewRequestResponseDTO;
import br.com.ites.server.utils.dtos.Web.Publication.PublicationReviewInboxItemResponseDTO;
import br.com.ites.server.utils.dtos.Web.Publication.PublicationReviewPreviewResponseDTO;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@Tag(name = "Publicações", description = "Publicação de projetos, histórico, métricas e conteúdo público.")
public class PublicationController {
    private final PublicationService publications;
    private final FormSubmissionService forms;

    public PublicationController(PublicationService publications, FormSubmissionService forms) {
        this.publications = publications;
        this.forms = forms;
    }

    @GetMapping("/publications")
    @SecurityRequirement(name = "bearerAuth")
    public PageResponse<Publication> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "recent") String sort) {
        return publications.list(owner(jwt), organizationId, page, size, q, sort);
    }

    @GetMapping("/publications/analytics")
    @SecurityRequirement(name = "bearerAuth")
    public List<PublicationService.DailyActivity> overview(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId) {
        return publications.overview(owner(jwt), organizationId);
    }

    @GetMapping("/projects/{projectId}/publication")
    @SecurityRequirement(name = "bearerAuth")
    public Publication get(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID projectId) {
        return publications.get(owner(jwt), organizationId, projectId);
    }

    @PostMapping("/projects/{projectId}/publication")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Publica a revisão do projeto", description = "Exige PUBLICATION_MANAGE. O projeto raiz pode ser publicado diretamente pelo administrador do sistema; outros projetos exigem reviewRequestId aprovado por outra pessoa.")
    public Publication publish(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID projectId, @jakarta.validation.Valid @RequestBody(required = false) PublishRequest request) {
        return publications.publish(owner(jwt), organizationId, projectId,
                request == null ? null : request.reviewRequestId());
    }

    @GetMapping("/projects/{projectId}/publication/review-requests")
    @SecurityRequirement(name = "bearerAuth")
    public List<PublicationReviewRequestResponseDTO> reviewRequests(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID projectId) {
        UUID actorId = owner(jwt);
        return publications.listReviewRequests(actorId, organizationId, projectId).stream()
                .map(request -> PublicationReviewRequestResponseDTO.from(request,
                        publications.canDecideReview(actorId, organizationId, request))).toList();
    }

    @PostMapping("/projects/{projectId}/publication/review-requests")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Solicita revisão para publicar ou restaurar", description = "Vincula o pedido a uma revisão imutável; RESTORE também exige a versão de destino.")
    public PublicationReviewRequestResponseDTO requestReview(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID projectId, @jakarta.validation.Valid @RequestBody ReviewRequestBody request) {
        UUID actorId = owner(jwt);
        var review = publications.requestReview(actorId, organizationId,
                projectId, request.projectRevisionId(), request.operation(), request.targetVersion());
        return PublicationReviewRequestResponseDTO.from(review,
                publications.canDecideReview(actorId, organizationId, review));
    }

    @PostMapping("/projects/{projectId}/publication/review-requests/{reviewRequestId}/decision")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Aprova ou rejeita uma solicitação", description = "Exige PUBLICATION_APPROVE no escopo e impede que a pessoa solicitante decida seu próprio pedido.")
    public PublicationReviewRequestResponseDTO decideReview(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID projectId, @PathVariable UUID reviewRequestId,
            @jakarta.validation.Valid @RequestBody ReviewDecisionBody request) {
        UUID actorId = owner(jwt);
        var review = publications.decideReview(actorId, organizationId,
                projectId, reviewRequestId, request.approved());
        return PublicationReviewRequestResponseDTO.from(review,
                publications.canDecideReview(actorId, organizationId, review));
    }

    @GetMapping("/publication/review-requests")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Lista a caixa de entrada de revisões autorizadas",
            description = "Retorna somente solicitações pendentes em projetos da organização selecionada nos quais o ator possui PUBLICATION_APPROVE.")
    public List<PublicationReviewInboxItemResponseDTO> reviewInbox(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId) {
        return publications.listReviewInbox(owner(jwt), organizationId).stream()
                .map(PublicationReviewInboxItemResponseDTO::from).toList();
    }

    @GetMapping("/projects/{projectId}/publication/review-requests/{reviewRequestId}/preview")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Pré-visualiza somente a revisão solicitada",
            description = "Exige PUBLICATION_APPROVE para o projeto e uma solicitação pendente de outra pessoa; retorna o documento imutável vinculado ao pedido.")
    public PublicationReviewPreviewResponseDTO reviewPreview(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID projectId, @PathVariable UUID reviewRequestId) {
        var preview = publications.reviewPreview(owner(jwt), organizationId, projectId, reviewRequestId);
        return new PublicationReviewPreviewResponseDTO(preview.projectRevision(), preview.document());
    }

    @PatchMapping("/projects/{projectId}/publication")
    @SecurityRequirement(name = "bearerAuth")
    public Publication setActive(@AuthenticationPrincipal Jwt jwt,
                                 @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
                                 @PathVariable UUID projectId,
                                 @jakarta.validation.Valid @RequestBody StatusRequest request) {
        return publications.setActive(owner(jwt), organizationId, projectId, request.active());
    }

    @PostMapping("/projects/{projectId}/publication/versions/{version}/restore")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Restaura uma versão publicada", description = "Exige PUBLICATION_MANAGE e aprovação de revisão para o snapshot e a versão exatos.", requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true))
    public Publication restore(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID projectId, @PathVariable int version,
            @jakarta.validation.Valid @RequestBody(required = false) PublishRequest request) {
        return publications.restore(owner(jwt), organizationId, projectId, version,
                request == null ? null : request.reviewRequestId());
    }

    @GetMapping("/projects/{projectId}/publication/analytics")
    @SecurityRequirement(name = "bearerAuth")
    public PublicationService.Analytics analytics(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID projectId) {
        return publications.analytics(owner(jwt), organizationId, projectId);
    }

    @GetMapping("/projects/{projectId}/publication/submissions")
    @SecurityRequirement(name = "bearerAuth")
    public PageResponse<FormSubmissionService.Submission> submissions(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search) {
        return forms.list(owner(jwt), organizationId, projectId, page, size, search);
    }

    @GetMapping(value = "/projects/{projectId}/publication/submissions/export", produces = "text/csv")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<String> exportSubmissions(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID projectId,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=publication-submissions.csv")
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .body(forms.exportCsv(owner(jwt), organizationId, projectId, search));
    }

    @GetMapping("/projects/{projectId}/publication/activity")
    @SecurityRequirement(name = "bearerAuth")
    public PageResponse<PublicationService.ActivityEvent> activity(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Organization-Id", required = false) UUID organizationId,
            @PathVariable UUID projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return publications.activity(owner(jwt), organizationId, projectId, page, size);
    }

    @PostMapping("/public/{key}/submissions")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public void submit(@PathVariable String key, @jakarta.validation.Valid @RequestBody SubmissionRequest request) {
        forms.receive(key, request.pageId(), request.blockId(), request.version(),
                request.formVersionId(), request.fields());
    }

    @GetMapping({"/public/{key}", "/public/{key}/**"})
    public PublicPage page(@PathVariable String key, jakarta.servlet.http.HttpServletRequest request) {
        String prefix = "/public/" + key;
        return publications.publicPage(key, request.getRequestURI().substring(prefix.length()));
    }

    @PostMapping("/public/{key}/interaction")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void interaction(@PathVariable String key, @jakarta.validation.Valid @RequestBody InteractionRequest request) {
        publications.interaction(key, request.type(), request.path(), request.target());
    }

    public record StatusRequest(@jakarta.validation.constraints.NotNull Boolean active) {}
    public record PublishRequest(UUID reviewRequestId) {}
    public record ReviewRequestBody(@jakarta.validation.constraints.NotNull UUID projectRevisionId,
                                    @jakarta.validation.constraints.NotNull PublicationService.ReviewOperation operation,
                                    Integer targetVersion) {}
    public record ReviewDecisionBody(@jakarta.validation.constraints.NotNull Boolean approved) {}
    public record InteractionRequest(@jakarta.validation.constraints.NotBlank String type,
                                     String path, String target) {}
    public record SubmissionRequest(@jakarta.validation.constraints.NotBlank String pageId,
                                    @jakarta.validation.constraints.NotBlank String blockId,
                                    int version, UUID formVersionId, Map<String, String> fields) {}
    private static UUID owner(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}

package br.com.ites.server.utils.dtos.Web.Publication;

import br.com.ites.server.repositories.Web.Publication.PublicationReviewRepository.ReviewRequest;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PublicationReviewRequestResponseDTO(
        UUID id,
        UUID projectId,
        UUID projectRevisionId,
        long projectRevision,
        String operation,
        Integer targetVersion,
        UUID requesterUserId,
        UUID approverUserId,
        String state,
        boolean canDecide,
        OffsetDateTime createdAt,
        OffsetDateTime decidedAt,
        OffsetDateTime consumedAt) {

    public static PublicationReviewRequestResponseDTO from(ReviewRequest request, boolean canDecide) {
        return new PublicationReviewRequestResponseDTO(request.id(), request.projectId(), request.projectRevisionId(),
                request.projectRevision(), request.operation(), request.targetVersion(), request.requesterUserId(),
                request.approverUserId(), request.state(), canDecide, request.createdAt(), request.decidedAt(),
                request.consumedAt());
    }
}

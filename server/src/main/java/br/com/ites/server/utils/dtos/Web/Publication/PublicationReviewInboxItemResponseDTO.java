package br.com.ites.server.utils.dtos.Web.Publication;

import br.com.ites.server.repositories.Web.Publication.PublicationReviewRepository.InboxRequest;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PublicationReviewInboxItemResponseDTO(
        UUID id,
        UUID projectId,
        String projectName,
        UUID projectRevisionId,
        long projectRevision,
        String operation,
        Integer targetVersion,
        String state,
        boolean canDecide,
        OffsetDateTime createdAt) {

    public static PublicationReviewInboxItemResponseDTO from(InboxRequest item) {
        var request = item.request();
        return new PublicationReviewInboxItemResponseDTO(request.id(), request.projectId(), item.projectName(),
                request.projectRevisionId(), request.projectRevision(), request.operation(), request.targetVersion(),
                request.state(), true, request.createdAt());
    }
}

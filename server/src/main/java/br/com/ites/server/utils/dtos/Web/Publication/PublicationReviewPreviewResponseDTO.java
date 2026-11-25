package br.com.ites.server.utils.dtos.Web.Publication;

import tools.jackson.databind.JsonNode;

public record PublicationReviewPreviewResponseDTO(long projectRevision, JsonNode document) {}

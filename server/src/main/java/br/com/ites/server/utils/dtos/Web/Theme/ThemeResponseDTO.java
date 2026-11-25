package br.com.ites.server.utils.dtos.Web.Theme;

import br.com.ites.server.models.Web.Theme.ThemeEntity;
import tools.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.UUID;

public record ThemeResponseDTO(
    UUID id, 
    String name, 
    JsonNode configuration, 
    LocalDateTime createdAt, 
    LocalDateTime updatedAt
) {
    public static ThemeResponseDTO from(ThemeEntity theme) {
        return new ThemeResponseDTO(
            theme.getId(), 
            theme.getName(), 
            theme.getConfiguration(), 
            theme.getCreatedAt(), 
            theme.getUpdatedAt()
        );
    }
}

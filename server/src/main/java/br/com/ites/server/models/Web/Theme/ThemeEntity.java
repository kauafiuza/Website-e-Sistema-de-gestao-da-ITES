package br.com.ites.server.models.Web.Theme;

import tools.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.UUID;

public class ThemeEntity {
    private UUID id;
    private UUID ownerId;
    private String name;
    private JsonNode configuration;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ThemeEntity(UUID ownerId, String name, JsonNode configuration) {
        this.ownerId = ownerId;
        this.name = name;
        this.configuration = configuration;
    }
    public ThemeEntity(UUID id, UUID ownerId, String name, JsonNode configuration,
                       LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.ownerId = ownerId;
        this.name = name;
        this.configuration = configuration;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public String getName() { return name; }
    public JsonNode getConfiguration() { return configuration; }
    public void update(String name, JsonNode configuration) {
        this.name = name;
        this.configuration = configuration;
    }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}

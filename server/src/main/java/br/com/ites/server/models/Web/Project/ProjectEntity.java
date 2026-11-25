package br.com.ites.server.models.Web.Project;

import java.time.LocalDateTime;
import java.util.UUID;

import tools.jackson.databind.JsonNode;

public class ProjectEntity {
    private UUID id;
    private UUID ownerId;
    private UUID themeId;
    private String name;
    private JsonNode document;
    private JsonNode routeBlueprint;
    private long revision = 1L;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ProjectEntity(UUID ownerId, String name, JsonNode document, JsonNode routeBlueprint, UUID themeId) {
        this.ownerId = ownerId;
        this.themeId = themeId;
        this.name = name;
        this.document = document;
        this.routeBlueprint = routeBlueprint;
    }

    public ProjectEntity(UUID id, UUID ownerId, String name, JsonNode document, JsonNode routeBlueprint,
                         long revision, LocalDateTime createdAt, LocalDateTime updatedAt, UUID themeId) {
        this.id = id;
        this.ownerId = ownerId;
        this.name = name;
        this.document = document;
        this.routeBlueprint = routeBlueprint;
        this.revision = revision;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.themeId = themeId;
    }

    public UUID getThemeId() { return themeId; }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public JsonNode getDocument() {
        return document;
    }

    public JsonNode getRouteBlueprint() { return routeBlueprint; }

    public long getRevision() {
        return revision;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}

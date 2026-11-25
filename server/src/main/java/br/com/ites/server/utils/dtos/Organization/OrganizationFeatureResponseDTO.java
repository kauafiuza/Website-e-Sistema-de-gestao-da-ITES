package br.com.ites.server.utils.dtos.Organization;

public record OrganizationFeatureResponseDTO(
        String featureKey,
        int version,
        String name,
        String description,
        boolean enabled) {}

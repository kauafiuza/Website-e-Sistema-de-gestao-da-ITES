package br.com.ites.server.utils.dtos.Organization;

import java.util.UUID;

public record OrganizationMembershipResponseDTO(UUID id, String name, String role, boolean isDefault) {}

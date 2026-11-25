package br.com.ites.server.utils.dtos.Organization;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InviteMemberRequestDTO(
        @NotBlank @Email @Size(max = 254) String email) {}

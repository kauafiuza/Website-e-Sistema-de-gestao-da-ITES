package br.com.ites.server.utils.dtos.Web.Project;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RenameProjectDTO(
        @NotNull @Min(1) Long revision, @NotBlank @Size(max = 150) String name) {}

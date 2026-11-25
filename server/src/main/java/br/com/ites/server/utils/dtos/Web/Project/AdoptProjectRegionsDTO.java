package br.com.ites.server.utils.dtos.Web.Project;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.Set;
import java.util.UUID;

/** Seleciona snapshots persistidos para adoção explícita de áreas compartilhadas. */
public record AdoptProjectRegionsDTO(
        @NotNull @Min(1) Long revision,
        @NotNull UUID templateId,
        @NotNull UUID versionId,
        @NotEmpty Set<String> regions) {}

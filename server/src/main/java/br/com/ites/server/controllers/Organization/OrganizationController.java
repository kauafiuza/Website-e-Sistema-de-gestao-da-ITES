package br.com.ites.server.controllers.Organization;

import br.com.ites.server.repositories.Organization.OrganizationRepository;
import br.com.ites.server.services.Organization.OrganizationFeatureService;
import br.com.ites.server.services.Ites.ItesAccessService;
import br.com.ites.server.utils.dtos.Organization.OrganizationFeatureResponseDTO;
import br.com.ites.server.utils.dtos.Organization.OrganizationMembershipResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/organizations")
@Tag(name = "Organizações", description = "Organizações acessíveis pela conta autenticada.")
@SecurityRequirement(name = "bearerAuth")
public class OrganizationController {
    private final OrganizationRepository organizations;
    private final OrganizationFeatureService features;
    private final ItesAccessService access;

    public OrganizationController(OrganizationRepository organizations, OrganizationFeatureService features,
            ItesAccessService access) {
        this.organizations = organizations;
        this.features = features;
        this.access = access;
    }

    @GetMapping
    public List<OrganizationMembershipResponseDTO> list(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        var memberships = access.isSystemAdministrator(userId)
                ? organizations.findAllForAdministrator() : organizations.findMemberships(userId);
        return memberships.stream()
                .map(membership -> new OrganizationMembershipResponseDTO(
                        membership.id(), membership.name(), membership.role(), membership.isDefault()))
                .toList();
    }

    @GetMapping("/{organizationId}/features")
    @Operation(summary = "Lista a disponibilidade das funcionalidades da organização",
            description = "Exige acesso à organização; a resposta não concede permissões individuais.")
    public List<OrganizationFeatureResponseDTO> features(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return features.list(UUID.fromString(jwt.getSubject()), organizationId);
    }

}

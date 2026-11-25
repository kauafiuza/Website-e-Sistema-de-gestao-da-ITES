package br.com.ites.server.controllers.Organization;

import br.com.ites.server.services.Organization.OrganizationMembershipService;
import br.com.ites.server.utils.dtos.Organization.AcceptOrganizationInvitationDTO;
import br.com.ites.server.utils.dtos.Organization.InviteMemberRequestDTO;
import br.com.ites.server.utils.dtos.Organization.OrganizationInvitationLookupDTO;
import br.com.ites.server.utils.dtos.Organization.OrganizationInvitationResponseDTO;
import br.com.ites.server.utils.dtos.Organization.OrganizationMemberResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/organizations")
@Tag(name = "Administração da organização", description = "Membros, convites e permissões da organização.")
public class OrganizationAdministrationController {
    private final OrganizationMembershipService memberships;

    public OrganizationAdministrationController(OrganizationMembershipService memberships) {
        this.memberships = memberships;
    }

    @GetMapping("/{organizationId}/members")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Lista memberships da organização")
    public List<OrganizationMemberResponseDTO> listMembers(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId) {
        return memberships.listMembers(userId(jwt), organizationId);
    }

    @GetMapping("/{organizationId}/invitations")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Lista convites da organização")
    public List<OrganizationInvitationResponseDTO> listInvitations(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId) {
        return memberships.listInvitations(userId(jwt), organizationId);
    }

    @PostMapping("/{organizationId}/invitations")
    @SecurityRequirement(name = "bearerAuth")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Convida uma pessoa por e-mail")
    public OrganizationInvitationResponseDTO invite(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId, @Valid @RequestBody InviteMemberRequestDTO request) {
        return memberships.invite(userId(jwt), organizationId, request.email());
    }

    @DeleteMapping("/{organizationId}/invitations/{invitationId}")
    @SecurityRequirement(name = "bearerAuth")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoga um convite pendente")
    public void revokeInvitation(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @PathVariable UUID invitationId) {
        memberships.revokeInvitation(userId(jwt), organizationId, invitationId);
    }

    @DeleteMapping("/{organizationId}/members/{memberId}")
    @SecurityRequirement(name = "bearerAuth")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoga um membership e seus grants")
    public void revokeMember(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @PathVariable UUID memberId) {
        memberships.revokeMember(userId(jwt), organizationId, memberId);
    }

    @GetMapping("/invitations/lookup")
    @Operation(summary = "Consulta o estado de um convite pelo token")
    public OrganizationInvitationLookupDTO lookup(@RequestParam String token) {
        return memberships.lookup(token);
    }

    @PostMapping("/invitations/accept")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Aceita um convite com a conta autenticada")
    public OrganizationInvitationResponseDTO accept(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AcceptOrganizationInvitationDTO request) {
        return memberships.accept(userId(jwt), request.token());
    }

    private static UUID userId(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}

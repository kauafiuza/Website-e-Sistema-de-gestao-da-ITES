package br.com.ites.server.services.Organization;

import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.repositories.Organization.OrganizationAdministrationRepository;
import br.com.ites.server.repositories.Organization.OrganizationAdministrationRepository.Invitation;
import br.com.ites.server.repositories.Organization.OrganizationAdministrationRepository.Member;
import br.com.ites.server.repositories.User.UserRepository;
import br.com.ites.server.services.User.Auth.AuthMailer;
import br.com.ites.server.services.User.Auth.TokenTools;
import br.com.ites.server.utils.dtos.Organization.OrganizationInvitationResponseDTO;
import br.com.ites.server.utils.dtos.Organization.OrganizationInvitationLookupDTO;
import br.com.ites.server.utils.dtos.Organization.OrganizationMemberResponseDTO;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrganizationMembershipService {
    private static final long INVITATION_TTL_DAYS = 7;

    private final OrganizationAdministrationRepository organizations;
    private final OrganizationAuthorizationService authorization;
    private final UserRepository users;
    private final AuthMailer mailer;
    private final OrganizationAuditEventService auditEvents;

    public OrganizationMembershipService(OrganizationAdministrationRepository organizations,
            OrganizationAuthorizationService authorization, UserRepository users, AuthMailer mailer,
            OrganizationAuditEventService auditEvents) {
        this.organizations = organizations;
        this.authorization = authorization;
        this.users = users;
        this.mailer = mailer;
        this.auditEvents = auditEvents;
    }

    @Transactional(readOnly = true)
    public List<OrganizationMemberResponseDTO> listMembers(UUID actorId, UUID organizationId) {
        authorization.requireOrganization(actorId, organizationId,
                br.com.ites.server.models.Organization.PermissionAction.ORGANIZATION_GRANTS_READ);
        return organizations.listMembers(organizationId).stream().map(OrganizationMembershipService::memberDto).toList();
    }

    @Transactional
    public List<OrganizationInvitationResponseDTO> listInvitations(UUID actorId, UUID organizationId) {
        authorization.requireOrganization(actorId, organizationId,
                br.com.ites.server.models.Organization.PermissionAction.ORGANIZATION_GRANTS_READ);
        organizations.expireInvitations(organizationId);
        return organizations.listInvitations(organizationId).stream().map(OrganizationMembershipService::invitationDto).toList();
    }

    @Transactional
    public OrganizationInvitationResponseDTO invite(UUID actorId, UUID organizationId, String rawEmail) {
        authorizeManagement(actorId, organizationId);
        organizations.lockOrganization(organizationId);
        String email = TokenTools.email(rawEmail);
        organizations.expireInvitations(organizationId);
        if (organizations.activeMemberIdByEmail(organizationId, email).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A pessoa já pertence à organização");
        if (organizations.hasPendingInvitation(organizationId, email))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um convite pendente para este e-mail");

        String token = TokenTools.newToken();
        Invitation invitation = organizations.createInvitation(organizationId, email, TokenTools.hash(token),
                actorId, OffsetDateTime.now().plusDays(INVITATION_TTL_DAYS));
        auditEvents.append(organizationId, actorId, "INVITATION_CREATED", "INVITATION", invitation.id());
        String organizationName = organizations.organizationName(organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        mailer.organizationInvitation(email, organizationName, token);
        return invitationDto(invitation);
    }

    @Transactional
    public OrganizationInvitationResponseDTO revokeInvitation(UUID actorId, UUID organizationId, UUID invitationId) {
        authorizeManagement(actorId, organizationId);
        organizations.expireInvitations(organizationId);
        if (organizations.revokeInvitation(invitationId, organizationId) == 1) {
            auditEvents.append(organizationId, actorId, "INVITATION_REVOKED", "INVITATION", invitationId);
            return organizations.findInvitation(invitationId, organizationId).map(OrganizationMembershipService::invitationDto)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        }
        if (organizations.findInvitation(invitationId, organizationId).isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Somente convites pendentes podem ser revogados");
    }

    @Transactional
    public void revokeMember(UUID actorId, UUID organizationId, UUID memberId) {
        authorizeManagement(actorId, organizationId);
        if (organizations.revokeMembership(organizationId, memberId) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        auditEvents.append(organizationId, actorId, "MEMBERSHIP_REVOKED", "MEMBERSHIP", memberId);
        java.util.Set<UUID> revokedGrantIds = new java.util.LinkedHashSet<>();
        for (UUID grantId : organizations.grantIdsFor(organizationId, memberId))
            revokedGrantIds.addAll(organizations.revokeGrantTree(grantId, organizationId));
        for (UUID revokedGrantId : revokedGrantIds)
            auditEvents.append(organizationId, actorId, "PERMISSION_REVOKED", "PERMISSION_GRANT", revokedGrantId);
    }

    @Transactional
    public OrganizationInvitationResponseDTO accept(UUID actorId, String rawToken) {
        Invitation invitation = organizations.findInvitationByTokenForUpdate(TokenTools.hash(rawToken))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Convite inválido"));
        if (!"PENDING".equals(invitation.state()))
            throw new ResponseStatusException(HttpStatus.GONE, "Este convite não está mais disponível");
        if (!invitation.expiresAt().isAfter(OffsetDateTime.now()))
            throw new ResponseStatusException(HttpStatus.GONE, "Este convite expirou");

        UserEntity user = users.findById(actorId)
                .filter(UserEntity::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (user.getEmailVerifiedAt() == null || !TokenTools.email(user.getEmail()).equals(invitation.email()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Entre com a conta do e-mail convidado");
        if (organizations.isActiveMember(invitation.organizationId(), actorId))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A pessoa já pertence à organização");
        if (organizations.consumeInvitation(invitation.id(), actorId) != 1)
            throw new ResponseStatusException(HttpStatus.GONE, "Este convite não está mais disponível");
        organizations.activateMembership(invitation.organizationId(), actorId);
        auditEvents.append(invitation.organizationId(), actorId, "MEMBERSHIP_ACCEPTED", "INVITATION", invitation.id());
        return organizations.findInvitation(invitation.id(), invitation.organizationId())
                .map(OrganizationMembershipService::invitationDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public OrganizationInvitationLookupDTO lookup(String rawToken) {
        Invitation invitation = organizations.findInvitationByToken(TokenTools.hash(rawToken))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Convite inválido"));
        String state = "PENDING".equals(invitation.state()) && !invitation.expiresAt().isAfter(OffsetDateTime.now())
                ? "EXPIRED" : invitation.state();
        String organizationName = organizations.organizationName(invitation.organizationId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return new OrganizationInvitationLookupDTO(invitation.organizationId(), organizationName,
                invitation.email(), state, invitation.expiresAt());
    }

    private void authorizeManagement(UUID actorId, UUID organizationId) {
        authorization.requireOrganization(actorId, organizationId,
                br.com.ites.server.models.Organization.PermissionAction.ORGANIZATION_GRANTS_MANAGE);
    }

    private static OrganizationMemberResponseDTO memberDto(Member member) {
        return new OrganizationMemberResponseDTO(member.userId(), member.firstName(), member.lastName(),
                member.email(), member.role(), member.state(), member.createdAt());
    }

    private static OrganizationInvitationResponseDTO invitationDto(Invitation invitation) {
        return new OrganizationInvitationResponseDTO(invitation.id(), invitation.organizationId(), invitation.email(),
                invitation.role(), invitation.state(), invitation.invitedByUserId(), invitation.acceptedUserId(),
                invitation.createdAt(), invitation.expiresAt(), invitation.acceptedAt(), invitation.revokedAt());
    }
}

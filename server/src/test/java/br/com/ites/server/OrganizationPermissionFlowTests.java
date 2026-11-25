package br.com.ites.server;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.HashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import br.com.ites.server.repositories.Organization.PageTemplateRepository;
import br.com.ites.server.services.Organization.OrganizationAuthorizationService;
import br.com.ites.server.services.Organization.OrganizationMembershipService;

@Import({TestcontainersConfiguration.class, RecordingMailGateway.class})
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "auth.jwt.secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
        "auth.totp-encryption-key=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
})
class OrganizationPermissionFlowTests {
    private static final AtomicInteger SIGNUP_IP_SEQUENCE = new AtomicInteger();

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtDecoder jwtDecoder;
    @Autowired RecordingMailGateway.Inbox inbox;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired OrganizationAuthorizationService authorization;
    @Autowired OrganizationMembershipService memberships;
    @Autowired PageTemplateRepository pageTemplates;
    private final Map<UUID, String> publicationReviewers = new HashMap<>();

    @Test
    void systemAdministratorCanReviewAndAuditAcrossOrganizationsWithoutScopedGrants() throws Exception {
        String owner = register();
        String administrator = register();
        String regularUser = register();
        UUID ownerId = userId(owner);
        UUID administratorId = userId(administrator);
        UUID organizationId = defaultOrganization(ownerId);
        UUID projectId = project(owner, "Projeto para revisão administrativa", organizationId);
        jdbc.update("INSERT INTO app_user_roles(user_id, role_id) SELECT ?, id FROM app_roles WHERE code='ADMINISTRATOR'",
                administratorId);

        assertFalse(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM organization_memberships WHERE user_id=? AND organization_id=?)",
                Boolean.class, administratorId, organizationId));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM organization_permission_grants "
                + "WHERE beneficiary_user_id=? AND organization_id=?", Integer.class, administratorId, organizationId));
        UUID administratorProject = project(administrator, "Projeto criado pela administração", organizationId);
        mvc.perform(get("/projects/" + administratorProject)
                        .header("Authorization", bearer(administrator)).header("X-Organization-Id", organizationId))
                .andExpect(status().isOk());
        mvc.perform(get("/projects/" + administratorProject)
                        .header("Authorization", bearer(regularUser)).header("X-Organization-Id", organizationId))
                .andExpect(status().isForbidden());
        String secondOwner = register();
        UUID secondOrganizationId = defaultOrganization(userId(secondOwner));
        UUID secondProject = project(secondOwner, "Projeto em outra organização", secondOrganizationId);
        mvc.perform(get("/projects/" + secondProject)
                        .header("Authorization", bearer(administrator)).header("X-Organization-Id", secondOrganizationId))
                .andExpect(status().isOk());
        assertFalse(authorization.allowsResource(administratorId, organizationId,
                br.com.ites.server.models.Organization.PermissionAction.PROJECT_READ,
                br.com.ites.server.models.Organization.GrantScopeType.PROJECT, secondProject));
        assertTrue(authorization.allowsResource(administratorId, organizationId,
                br.com.ites.server.models.Organization.PermissionAction.ORGANIZATION_AUDIT_READ,
                br.com.ites.server.models.Organization.GrantScopeType.ORGANIZATION, organizationId));
        assertFalse(authorization.allowsResource(userId(regularUser), organizationId,
                br.com.ites.server.models.Organization.PermissionAction.ORGANIZATION_AUDIT_READ,
                br.com.ites.server.models.Organization.GrantScopeType.ORGANIZATION, organizationId));

        JsonNode organizations = json.readTree(mvc.perform(get("/organizations")
                        .header("Authorization", bearer(administrator)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertTrue(java.util.stream.StreamSupport.stream(organizations.spliterator(), false)
                .anyMatch(item -> item.path("id").asText().equals(organizationId.toString())));
        mvc.perform(get("/organizations/" + organizationId + "/features")
                        .header("Authorization", bearer(administrator)))
                .andExpect(status().isOk());
        mvc.perform(get("/organizations/" + organizationId + "/audit-events")
                        .header("Authorization", bearer(administrator)))
                .andExpect(status().isOk());
        mvc.perform(get("/organizations/" + organizationId + "/audit-events")
                        .header("Authorization", bearer(regularUser)))
                .andExpect(status().isForbidden());

        UUID revisionId = jdbc.queryForObject("""
                SELECT r.id FROM project_revisions r JOIN projects p ON p.id=r.project_id
                WHERE p.id=? AND r.revision_kind='DRAFT' AND r.revision_number=p.revision
                """, UUID.class, projectId);
        JsonNode request = json.readTree(mvc.perform(post("/projects/" + projectId + "/publication/review-requests")
                        .header("Authorization", bearer(owner)).header("X-Organization-Id", organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("projectRevisionId", revisionId, "operation", "PUBLISH"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        JsonNode inbox = json.readTree(mvc.perform(get("/publication/review-requests")
                        .header("Authorization", bearer(administrator)).header("X-Organization-Id", organizationId))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(1, inbox.size());
        assertEquals(request.path("id").asText(), inbox.get(0).path("id").asText());
        assertTrue(inbox.get(0).path("canDecide").asBoolean());
        mvc.perform(post("/projects/" + projectId + "/publication/review-requests/"
                        + request.path("id").asText() + "/decision")
                        .header("Authorization", bearer(administrator)).header("X-Organization-Id", organizationId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":true}"))
                .andExpect(status().isOk());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM publication_review_requests "
                + "WHERE id=? AND state='APPROVED' AND approver_user_id=?", Integer.class,
                UUID.fromString(request.path("id").asText()), administratorId));
        mvc.perform(get("/publication/review-requests").header("Authorization", bearer(regularUser))
                        .header("X-Organization-Id", organizationId))
                .andExpect(status().isForbidden());

        jdbc.update("INSERT INTO app_permissions(code, description) VALUES ('admin.regression.new-grant', 'Permissão de regressão')");
        assertTrue(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM app_role_permissions rp JOIN app_user_roles ur ON ur.role_id=rp.role_id
                WHERE ur.user_id=? AND rp.permission_code='admin.regression.new-grant')
                """, Boolean.class, administratorId));
        jdbc.update("DELETE FROM app_permissions WHERE code='admin.regression.new-grant'");
    }

    @Test
    void auditReadRequiresExplicitGrantIsTenantScopedAndAppendOnly() throws Exception {
        String firstOwner = register();
        String secondOwner = register();
        String reader = register();
        UUID firstOrganization = defaultOrganization(userId(firstOwner));
        UUID secondOrganization = defaultOrganization(userId(secondOwner));
        UUID readerId = userId(reader);
        addMember(readerId, firstOrganization);
        addMembershipWithoutChangingDefault(readerId, secondOrganization);

        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM organization_permission_grants "
                + "WHERE organization_id = ? AND action = 'ORGANIZATION_AUDIT_READ'", Integer.class, firstOrganization));
        mvc.perform(get("/organizations/" + firstOrganization + "/audit-events")
                        .header("Authorization", bearer(firstOwner)))
                .andExpect(status().isForbidden());

        UUID authorityId = rootGrant(userId(firstOwner), firstOrganization, "ORGANIZATION_GRANTS_MANAGE");
        UUID auditGrant = issueAuditReadGrant(firstOwner, firstOrganization, readerId, authorityId);
        assertEquals("ACTIVE", jdbc.queryForObject("SELECT state FROM organization_permission_grants WHERE id = ?",
                String.class, auditGrant));

        UUID otherTenantTarget = UUID.randomUUID();
        jdbc.update("INSERT INTO organization_audit_events "
                        + "(organization_id, actor_user_id, action, target_type, target_id) "
                        + "VALUES (?, ?, 'PROJECT_DELETED', 'PROJECT', ?)",
                secondOrganization, userId(secondOwner), otherTenantTarget);

        var response = mvc.perform(get("/organizations/" + firstOrganization + "/audit-events?page=0&size=1")
                        .header("Authorization", bearer(reader)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode page = json.readTree(response);
        assertEquals(1, page.path("totalElements").asInt());
        assertEquals("PERMISSION_GRANTED", page.path("items").get(0).path("action").asText());
        assertFalse(response.contains("email"));
        assertFalse(response.contains("fields"));
        mvc.perform(get("/organizations/" + secondOrganization + "/audit-events")
                        .header("Authorization", bearer(reader)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/organizations/" + firstOrganization + "/audit-events?size=101")
                        .header("Authorization", bearer(reader)))
                .andExpect(status().isBadRequest());

        UUID eventId = page.path("items").get(0).path("id").asText().isBlank()
                ? null : UUID.fromString(page.path("items").get(0).path("id").asText());
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE organization_audit_events SET action = 'PROJECT_DELETED' WHERE id = ?", eventId));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "DELETE FROM organization_audit_events WHERE id = ?", eventId));
    }

    @Test
    void invitationAndAuditEventRollbackTogether() throws Exception {
        String owner = register();
        UUID ownerId = userId(owner);
        UUID organizationId = defaultOrganization(ownerId);
        jdbc.execute("""
                CREATE FUNCTION reject_invitation_audit_event() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF NEW.action = 'INVITATION_CREATED' THEN
                        RAISE EXCEPTION 'simulated audit append failure';
                    END IF;
                    RETURN NEW;
                END;
                $$
                """);
        jdbc.execute("CREATE TRIGGER reject_invitation_audit_event BEFORE INSERT ON organization_audit_events "
                + "FOR EACH ROW EXECUTE FUNCTION reject_invitation_audit_event()");
        try {
            assertThrows(DataAccessException.class,
                    () -> memberships.invite(ownerId, organizationId, "rollback@example.com"));
            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM organization_invitations "
                    + "WHERE organization_id = ? AND email = 'rollback@example.com'", Integer.class, organizationId));
            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM organization_audit_events "
                    + "WHERE organization_id = ? AND action = 'INVITATION_CREATED'", Integer.class, organizationId));
        } finally {
            jdbc.execute("DROP TRIGGER reject_invitation_audit_event ON organization_audit_events");
            jdbc.execute("DROP FUNCTION reject_invitation_audit_event()");
        }
    }

    @Test
    void membershipsAndExplicitOrganizationContextKeepResourcesIsolatedAndLegacyDefaultWorks() throws Exception {
        String account = register();
        String otherOwner = register();
        String outsider = register();
        UUID accountId = userId(account);
        UUID accountDefault = defaultOrganization(accountId);
        UUID secondOrganization = defaultOrganization(userId(otherOwner));
        UUID outsiderOrganization = defaultOrganization(userId(outsider));
        addMembershipWithoutChangingDefault(accountId, secondOrganization);
        addOrganizationPermissions(accountId, secondOrganization, userId(otherOwner));

        JsonNode memberships = json.readTree(mvc.perform(get("/organizations")
                .header("Authorization", bearer(account)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(2, memberships.size());
        assertTrue(java.util.stream.StreamSupport.stream(memberships.spliterator(), false)
                .anyMatch(item -> item.path("id").asText().equals(secondOrganization.toString())));

        UUID defaultProject = project(account, "Padrão", null);
        UUID secondProject = project(account, "Segunda", secondOrganization);
        mvc.perform(get("/projects").header("Authorization", bearer(account)))
                .andExpect(status().isOk()).andDo(result -> assertEquals(1,
                        json.readTree(result.getResponse().getContentAsString()).get("totalElements").asInt()));
        mvc.perform(get("/projects").header("Authorization", bearer(account))
                        .header("X-Organization-Id", secondOrganization))
                .andExpect(status().isOk()).andDo(result -> assertEquals(1,
                        json.readTree(result.getResponse().getContentAsString()).get("totalElements").asInt()));
        mvc.perform(get("/projects/" + defaultProject).header("Authorization", bearer(account))
                        .header("X-Organization-Id", secondOrganization))
                .andExpect(status().isNotFound());
        mvc.perform(get("/projects").header("Authorization", bearer(account))
                        .header("X-Organization-Id", outsiderOrganization))
                .andExpect(status().isForbidden());
        mvc.perform(get("/projects").header("Authorization", bearer(account)))
                .andExpect(status().isOk());
        assertEquals(accountDefault, defaultOrganization(accountId));

        String palette = "{\"primary\":\"#123456\",\"secondary\":\"#f3f4f6\",\"accent\":\"#cfe9fd\","
                + "\"background\":\"#ffffff\",\"foreground\":\"#111827\",\"card\":\"#ffffff\","
                + "\"border\":\"#e5e7eb\",\"muted\":\"#5b6882\",\"success\":\"#16803d\","
                + "\"destructive\":\"#dc2626\"}";
        String themeBody = "{\"name\":\"Tema de contexto\",\"configuration\":{\"light\":"
                + palette + ",\"dark\":" + palette + "}}";
        String defaultThemeId = json.readTree(mvc.perform(post("/themes")
                .header("Authorization", bearer(account)).contentType(MediaType.APPLICATION_JSON).content(themeBody))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asText();
        mvc.perform(post("/themes").header("Authorization", bearer(account))
                        .header("X-Organization-Id", secondOrganization)
                        .contentType(MediaType.APPLICATION_JSON).content(themeBody))
                .andExpect(status().isCreated());
        mvc.perform(get("/themes").header("Authorization", bearer(account))
                        .header("X-Organization-Id", secondOrganization))
                .andExpect(status().isOk()).andDo(result -> assertEquals(1,
                        json.readTree(result.getResponse().getContentAsString()).get("totalElements").asInt()));
        mvc.perform(delete("/themes/" + defaultThemeId).header("Authorization", bearer(account))
                        .header("X-Organization-Id", secondOrganization))
                .andExpect(status().isNotFound());

        mvc.perform(approvedPublish(account, defaultProject, accountDefault)).andExpect(status().isOk());
        mvc.perform(approvedPublish(account, secondProject, secondOrganization)).andExpect(status().isOk());
        mvc.perform(get("/publications").header("Authorization", bearer(account))
                        .header("X-Organization-Id", secondOrganization))
                .andExpect(status().isOk()).andDo(result -> assertEquals(1,
                        json.readTree(result.getResponse().getContentAsString()).get("totalElements").asInt()));
        mvc.perform(get("/projects/" + defaultProject + "/publication")
                        .header("Authorization", bearer(account)).header("X-Organization-Id", secondOrganization))
                .andExpect(status().isNotFound());
        mvc.perform(get("/projects/" + defaultProject + "/publication")
                        .header("Authorization", bearer(account)))
                .andExpect(status().isOk());
    }

    @Test
    void tenantFeatureAvailabilityIsExplicitAndDoesNotReplaceIndividualGrants() throws Exception {
        String owner = register();
        String member = register();
        String outsider = register();
        UUID ownerId = userId(owner);
        UUID memberId = userId(member);
        UUID organizationId = defaultOrganization(ownerId);
        addMember(memberId, organizationId);

        JsonNode catalog = json.readTree(mvc.perform(get("/organizations/" + organizationId + "/features")
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(4, catalog.size());
        assertTrue(java.util.stream.StreamSupport.stream(catalog.spliterator(), false)
                .allMatch(feature -> feature.path("enabled").asBoolean()));
        mvc.perform(get("/organizations/" + organizationId + "/features")
                        .header("Authorization", bearer(outsider)))
                .andExpect(status().isForbidden());

        UUID projectId = project(owner, "Recurso com feature");
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(member)))
                .andExpect(status().isForbidden());
        UUID memberGrant = grant(owner, organizationId, memberId, "PROJECT_READ", "PROJECT", projectId,
                null, false, rootGrant(ownerId, organizationId, "PROJECT_READ"));
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(member)))
                .andExpect(status().isOk());

        jdbc.update("UPDATE organization_feature_availability SET enabled = false, updated_at = now() "
                + "WHERE organization_id = ? AND feature_key = 'PROJECTS'", organizationId);
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(owner)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(member)))
                .andExpect(status().isForbidden());
        assertTrue(isAllowed(memberId, organizationId, "PROJECT_READ", projectId));

        jdbc.update("DELETE FROM organization_feature_availability "
                + "WHERE organization_id = ? AND feature_key = 'PROJECTS'", organizationId);
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(owner)))
                .andExpect(status().isForbidden());

        JsonNode updatedCatalog = json.readTree(mvc.perform(get("/organizations/" + organizationId + "/features")
                        .header("Authorization", bearer(member)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertTrue(java.util.stream.StreamSupport.stream(updatedCatalog.spliterator(), false)
                .anyMatch(feature -> feature.path("featureKey").asText().equals("PROJECTS")
                        && feature.path("version").asInt() == 1 && !feature.path("enabled").asBoolean()));
        assertEquals("ACTIVE", grantState(memberGrant));
    }

    @Test
    void organizationPageTemplatesKeepVersionsAndEnforceMembershipAndAuthorOwnership() throws Exception {
        String author = register();
        String member = register();
        String outsider = register();
        UUID organizationId = defaultOrganization(userId(author));
        addMember(userId(member), organizationId);
        String endpoint = "/organizations/" + organizationId + "/templates";
        Map<String, Object> firstContent = Map.of("blocks", java.util.List.of(Map.of(
                "id", "original-block", "definitionId", "hero-split", "props", Map.of("title", "Primeira versão"))));

        JsonNode created = json.readTree(mvc.perform(post(endpoint)
                        .header("Authorization", bearer(author)).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Página institucional", "content", firstContent))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String templateId = created.get("id").asText();
        String firstVersionId = created.get("versionId").asText();
        assertEquals(1, created.get("version").asInt());

        JsonNode visibleToMember = json.readTree(mvc.perform(get(endpoint)
                        .header("Authorization", bearer(member)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(1, visibleToMember.size());
        assertEquals(templateId, visibleToMember.get(0).get("id").asText());
        mvc.perform(post(endpoint + "/" + templateId + "/versions")
                        .header("Authorization", bearer(member)).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("expectedVersion", 1, "content", firstContent))))
                .andExpect(status().isForbidden());
        mvc.perform(delete(endpoint + "/" + templateId).header("Authorization", bearer(member)))
                .andExpect(status().isForbidden());

        Map<String, Object> secondContent = Map.of("blocks", java.util.List.of(Map.of(
                "id", "new-source-block", "definitionId", "hero-split", "props", Map.of("title", "Segunda versão"))));
        JsonNode updated = json.readTree(mvc.perform(post(endpoint + "/" + templateId + "/versions")
                        .header("Authorization", bearer(author)).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("expectedVersion", 1, "content", secondContent))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(2, updated.get("version").asInt());
        assertNotEquals(firstVersionId, updated.get("versionId").asText());
        mvc.perform(post(endpoint + "/" + templateId + "/versions")
                        .header("Authorization", bearer(author)).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("expectedVersion", 1, "content", firstContent))))
                .andExpect(status().isConflict());

        JsonNode versions = json.readTree(mvc.perform(get(endpoint + "/" + templateId + "/versions")
                        .header("Authorization", bearer(member)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(2, versions.size());
        assertEquals(2, versions.get(0).get("version").asInt());
        assertEquals("Segunda versão", versions.get(0).get("content").get("blocks").get(0)
                .get("props").get("title").asText());
        assertEquals(1, versions.get(1).get("version").asInt());
        assertEquals("Primeira versão", versions.get(1).get("content").get("blocks").get(0)
                .get("props").get("title").asText());

        mvc.perform(get(endpoint).header("Authorization", bearer(outsider)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/organizations/" + defaultOrganization(userId(outsider)) + "/templates")
                        .header("Authorization", bearer(outsider)))
                .andExpect(status().isOk())
                .andDo(result -> assertEquals(0, json.readTree(result.getResponse().getContentAsString()).size()));
        mvc.perform(post(endpoint).header("Authorization", bearer(outsider))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Tentativa", "content", firstContent))))
                .andExpect(status().isForbidden());

        jdbc.update("UPDATE organization_memberships SET state = 'REVOKED' WHERE organization_id = ? AND user_id = ?",
                organizationId, userId(member));
        mvc.perform(get(endpoint).header("Authorization", bearer(member)))
                .andExpect(status().isForbidden());
        mvc.perform(post(endpoint + "/" + templateId + "/versions")
                        .header("Authorization", bearer(member)).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("expectedVersion", 2, "content", secondContent))))
                .andExpect(status().isForbidden());
        mvc.perform(delete(endpoint + "/" + templateId).header("Authorization", bearer(author)))
                .andExpect(status().isNoContent());
        mvc.perform(get(endpoint).header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andDo(result -> assertEquals(0, json.readTree(result.getResponse().getContentAsString()).size()));
        mvc.perform(get(endpoint + "/" + templateId + "/versions")
                        .header("Authorization", bearer(author)))
                .andExpect(status().isNotFound());
    }

    @Test
    void templateMutationSerializesWithConcurrentMembershipRevocation() throws Exception {
        String author = register();
        UUID authorId = userId(author);
        UUID organizationId = defaultOrganization(authorId);
        UUID templateId = UUID.randomUUID();
        UUID versionId = UUID.randomUUID();
        CountDownLatch membershipLocked = new CountDownLatch(1);
        CountDownLatch allowMutationCommit = new CountDownLatch(1);
        CountDownLatch revocationStarted = new CountDownLatch(1);
        String revocationConnectionName = "template-revocation-" + UUID.randomUUID();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        try {
            var mutation = executor.submit(() -> transaction.execute(status -> {
                authorization.requireActiveMembershipForMutation(authorId, organizationId);
                membershipLocked.countDown();
                try {
                    if (!allowMutationCommit.await(5, TimeUnit.SECONDS))
                        throw new IllegalStateException("Tempo esgotado aguardando o teste liberar a mutação");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(exception);
                }
                return pageTemplates.create(templateId, versionId, organizationId, authorId,
                        "Modelo sob lock", "{\"blocks\":[]}");
            }));
            var revocation = executor.submit(() -> {
                if (!membershipLocked.await(5, TimeUnit.SECONDS))
                    throw new IllegalStateException("A mutação não adquiriu o lock do membership");
                return transaction.execute(status -> {
                    jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class,
                            revocationConnectionName);
                    revocationStarted.countDown();
                    return jdbc.update(
                            "UPDATE organization_memberships SET state = 'REVOKED' WHERE organization_id = ? AND user_id = ?",
                            organizationId, authorId);
                });
            });

            assertTrue(revocationStarted.await(5, TimeUnit.SECONDS));
            assertTrue(waitForLockWait(revocationConnectionName),
                    "A revogação precisa estar aguardando o lock mantido pela mutação");
            allowMutationCommit.countDown();
            assertTrue(mutation.get(5, TimeUnit.SECONDS));
            assertEquals(1, revocation.get(5, TimeUnit.SECONDS));
            mvc.perform(get("/organizations/" + organizationId + "/templates")
                            .header("Authorization", bearer(author)))
                    .andExpect(status().isForbidden());
        } finally {
            allowMutationCommit.countDown();
            executor.shutdownNow();
        }
    }

    private boolean waitForLockWait(String applicationName) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            Boolean waiting = jdbc.queryForObject("""
                    SELECT EXISTS (
                        SELECT 1 FROM pg_stat_activity
                        WHERE application_name = ? AND wait_event_type = 'Lock'
                    )
                    """, Boolean.class, applicationName);
            if (Boolean.TRUE.equals(waiting)) return true;
            Thread.sleep(10);
        }
        return false;
    }

    @Test
    void disabledPublicationFeaturesBlockPublicDeliveryAndFormSubmissions() throws Exception {
        String owner = register();
        UUID organizationId = defaultOrganization(userId(owner));
        UUID projectId = project(owner, "Publicação desativada");
        mvc.perform(approvedPublish(owner, projectId, organizationId)).andExpect(status().isOk());
        String publicKey = jdbc.queryForObject("SELECT public_key FROM publications WHERE project_id = ?",
                String.class, projectId);

        mvc.perform(get("/public/" + publicKey)).andExpect(status().isOk());
        jdbc.update("UPDATE organization_feature_availability SET enabled = false, updated_at = now() "
                + "WHERE organization_id = ? AND feature_key = 'FORM_RESPONSES'", organizationId);
        mvc.perform(post("/public/" + publicKey + "/submissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pageId\":\"page\",\"blockId\":\"form\",\"version\":1,\"fields\":{}}"))
                .andExpect(status().isForbidden());
        jdbc.update("UPDATE organization_feature_availability SET enabled = true, updated_at = now() "
                + "WHERE organization_id = ? AND feature_key = 'FORM_RESPONSES'", organizationId);
        jdbc.update("UPDATE organization_feature_availability SET enabled = false, updated_at = now() "
                + "WHERE organization_id = ? AND feature_key = 'PUBLICATIONS'", organizationId);
        mvc.perform(get("/public/" + publicKey)).andExpect(status().isForbidden());
        mvc.perform(post("/public/" + publicKey + "/interaction")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"click\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/public/" + publicKey + "/submissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pageId\":\"page\",\"blockId\":\"form\",\"version\":1,\"fields\":{}}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void permissionsAreTenantScopedDelegableAttenuatedAndRevokedWithTheirParents() throws Exception {
        String owner = register();
        String member = register();
        String outsider = register();
        String beneficiary = register();
        UUID ownerId = userId(owner);
        UUID memberId = userId(member);
        UUID beneficiaryId = userId(beneficiary);
        UUID ownerOrganization = defaultOrganization(ownerId);
        addMember(memberId, ownerOrganization);
        addMember(beneficiaryId, ownerOrganization);

        UUID projectId = project(owner, "Delegado");
        UUID otherProjectId = project(owner, "Independente");

        mvc.perform(get("/projects/" + projectId))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(member)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(outsider)))
                .andExpect(status().isNotFound());

        UUID ownerReadGrant = rootGrant(ownerId, ownerOrganization, "PROJECT_READ");
        OffsetDateTime parentExpiry = OffsetDateTime.now().plusHours(1);
        UUID delegated = grant(owner, ownerOrganization, memberId, "PROJECT_READ", "PROJECT", projectId,
                parentExpiry, true, ownerReadGrant);
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(member)))
                .andExpect(status().isOk());

        assertEquals(403, issueGrant(member, ownerOrganization, beneficiaryId, "PROJECT_READ",
                "ORGANIZATION", ownerOrganization, parentExpiry.minusMinutes(10), false, delegated));
        assertEquals(403, issueGrant(member, ownerOrganization, beneficiaryId, "PROJECT_DELETE",
                "PROJECT", projectId, parentExpiry.minusMinutes(10), false, delegated));
        assertEquals(403, issueGrant(member, ownerOrganization, beneficiaryId, "PROJECT_READ",
                "PROJECT", projectId, parentExpiry.plusMinutes(1), false, delegated));

        UUID nonDelegable = grant(owner, ownerOrganization, memberId, "PROJECT_READ", "PROJECT", projectId,
                parentExpiry.minusMinutes(5), false, ownerReadGrant);
        assertEquals(403, issueGrant(member, ownerOrganization, beneficiaryId, "PROJECT_READ",
                "PROJECT", projectId, parentExpiry.minusMinutes(10), true,
                nonDelegable));

        UUID child = grant(member, ownerOrganization, beneficiaryId, "PROJECT_READ", "PROJECT", projectId,
                parentExpiry.minusMinutes(10), false, delegated);
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(beneficiary)))
                .andExpect(status().isOk());

        UUID independent = grant(owner, ownerOrganization, memberId, "PROJECT_READ", "PROJECT", otherProjectId,
                null, false, ownerReadGrant);
        UUID expiredProjectId = project(owner, "Expirado");
        OffsetDateTime expiredAt = OffsetDateTime.now().minusMinutes(1);
        UUID expired = grant(owner, ownerOrganization, memberId, "PROJECT_READ", "PROJECT", expiredProjectId,
                OffsetDateTime.now().plusHours(1), false, ownerReadGrant);
        jdbc.update("UPDATE organization_permission_grants SET valid_until = ? WHERE id = ?", expiredAt, expired);
        assertFalse(isAllowed(memberId, ownerOrganization, "PROJECT_READ", expiredProjectId));
        mvc.perform(get("/projects/" + expiredProjectId).header("Authorization", bearer(member)))
                .andExpect(status().isForbidden());

        mvc.perform(delete("/organizations/" + ownerOrganization + "/grants/" + delegated)
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isNoContent());
        assertEquals("REVOKED", grantState(delegated));
        assertEquals("REVOKED", grantState(child));
        assertEquals("ACTIVE", grantState(independent));
        assertTrue(isAllowed(memberId, ownerOrganization, "PROJECT_READ", otherProjectId));
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(member)))
                .andExpect(status().isOk());
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(beneficiary)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/projects/" + otherProjectId).header("Authorization", bearer(member)))
                .andExpect(status().isOk());
        mvc.perform(get("/organizations/" + ownerOrganization + "/grants")
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isOk());
    }

    @Test
    void exportRequiresManagementAuthorityAndRevocationFollowsItsIndependentLineage() throws Exception {
        String owner = register();
        String member = register();
        String beneficiary = register();
        String secondManager = register();
        UUID ownerId = userId(owner);
        UUID memberId = userId(member);
        UUID beneficiaryId = userId(beneficiary);
        UUID secondManagerId = userId(secondManager);
        UUID organizationId = defaultOrganization(ownerId);
        String outsider = register();
        UUID outsiderId = userId(outsider);
        UUID outsiderOrganization = defaultOrganization(outsiderId);
        addMember(memberId, organizationId);
        addMember(beneficiaryId, organizationId);
        addMember(secondManagerId, organizationId);
        UUID projectId = project(owner, "Respostas exportáveis");

        UUID baseAuthorityId = rootGrant(ownerId, organizationId, "ORGANIZATION_GRANTS_MANAGE");
        OffsetDateTime authorityExpiry = OffsetDateTime.now().plusMinutes(45);
        UUID authorityId = grant(owner, organizationId, ownerId, "ORGANIZATION_GRANTS_MANAGE",
                "ORGANIZATION", organizationId, authorityExpiry, true, baseAuthorityId);
        assertEquals(400, issueExportGrant(owner, organizationId, memberId, projectId, null,
                true, null).getStatus());
        assertEquals(403, issueExportGrant(owner, organizationId, memberId, projectId,
                authorityExpiry.plusMinutes(1), false, authorityId).getStatus());
        assertEquals(403, issueExportGrant(owner, organizationId, memberId, projectId,
                authorityExpiry.minusMinutes(2), false, rootGrant(outsiderId, outsiderOrganization,
                        "ORGANIZATION_GRANTS_MANAGE")).getStatus());

        UUID exportRoot = issueExportGrant(owner, organizationId, memberId, projectId,
                authorityExpiry.minusMinutes(5), true, authorityId).getGrantId();
        assertEquals(400, issueApprovalGrant(owner, organizationId, memberId, projectId,
                null, null).getStatus());
        assertEquals(403, issueApprovalGrant(owner, organizationId, memberId, projectId,
                authorityExpiry.plusMinutes(1), authorityId).getStatus());
        UUID approvalRoot = issueApprovalGrant(owner, organizationId, memberId, projectId,
                authorityExpiry.minusMinutes(5), authorityId).getGrantId();
        assertTrue(isAllowed(memberId, organizationId, "PUBLICATION_APPROVE", projectId));
        assertFalse(isAllowed(memberId, organizationId, "PUBLICATION_APPROVE", UUID.randomUUID()));
        assertFalse(isAllowed(ownerId, organizationId, "PUBLICATION_APPROVE", projectId));
        JsonNode root = json.readTree(mvc.perform(get("/organizations/" + organizationId + "/grants")
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertTrue(java.util.stream.StreamSupport.stream(root.get("items").spliterator(), false)
                .filter(item -> item.path("id").asText().equals(exportRoot.toString()))
                .anyMatch(item -> item.path("authorityGrantId").asText().equals(authorityId.toString())
                        && item.path("parentGrantId").isNull()));
        UUID exportChild = grant(member, organizationId, beneficiaryId, "PUBLICATION_SUBMISSIONS_EXPORT",
                "PROJECT", projectId, authorityExpiry.minusMinutes(10), false, exportRoot);
        UUID independentAuthority = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO organization_permission_grants
                    (id, beneficiary_user_id, organization_id, action, scope_type, scope_id,
                     issuer_user_id, valid_until, state, can_delegate, parent_grant_id, created_at)
                VALUES (?, ?, ?, 'ORGANIZATION_GRANTS_MANAGE', 'ORGANIZATION', ?, ?, NULL, 'ACTIVE', true, NULL, now())
                """, independentAuthority, secondManagerId, organizationId, organizationId, ownerId);
        UUID independentExport = issueExportGrant(secondManager, organizationId, beneficiaryId, projectId,
                null, false, independentAuthority).getGrantId();
        mvc.perform(get("/projects/" + projectId + "/publication/submissions/export")
                        .header("Authorization", bearer(member)).header("X-Organization-Id", organizationId))
                .andExpect(status().isOk());
        mvc.perform(get("/projects/" + projectId + "/publication/submissions/export")
                        .header("Authorization", bearer(beneficiary)).header("X-Organization-Id", organizationId))
                .andExpect(status().isOk());

        mvc.perform(delete("/organizations/" + organizationId + "/grants/" + baseAuthorityId)
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isNoContent());
        assertEquals("REVOKED", grantState(authorityId));
        assertEquals("REVOKED", grantState(exportRoot));
        assertEquals("REVOKED", grantState(approvalRoot));
        assertEquals("REVOKED", grantState(exportChild));
        assertEquals("ACTIVE", grantState(independentExport));
        assertFalse(isAllowed(memberId, organizationId, "PUBLICATION_SUBMISSIONS_EXPORT", projectId));
        assertTrue(isAllowed(beneficiaryId, organizationId, "PUBLICATION_SUBMISSIONS_EXPORT", projectId));
        mvc.perform(get("/projects/" + projectId + "/publication/submissions/export")
                        .header("Authorization", bearer(member)).header("X-Organization-Id", organizationId))
                .andExpect(status().isForbidden());
        mvc.perform(get("/projects/" + projectId + "/publication/submissions/export")
                        .header("Authorization", bearer(beneficiary)).header("X-Organization-Id", organizationId))
                .andExpect(status().isOk());
    }

    @Test
    void invitationsRequireAuthorityAndMembershipRevocationInvalidatesAssignedGrants() throws Exception {
        String owner = register();
        String unauthorizedMember = register();
        String inviteeEmail = UUID.randomUUID() + "@example.com";
        String invitee = register(inviteeEmail);
        String grantDescendant = register();
        UUID ownerId = userId(owner);
        UUID inviteeId = userId(invitee);
        UUID grantDescendantId = userId(grantDescendant);
        UUID organizationId = defaultOrganization(ownerId);
        addMember(grantDescendantId, organizationId);

        mvc.perform(get("/organizations/" + organizationId + "/members")
                        .header("Authorization", bearer(unauthorizedMember)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/organizations/" + organizationId + "/invitations")
                        .header("Authorization", bearer(unauthorizedMember))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", inviteeEmail))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/organizations/" + organizationId + "/invitations")
                        .header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", "invalid-email"))))
                .andExpect(status().isBadRequest());

        JsonNode invitation = json.readTree(mvc.perform(post("/organizations/" + organizationId + "/invitations")
                        .header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", inviteeEmail))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        assertEquals("PENDING", invitation.get("state").asText());
        mvc.perform(delete("/organizations/" + organizationId + "/invitations/" + invitation.get("id").asText())
                        .header("Authorization", bearer(unauthorizedMember)))
                .andExpect(status().isForbidden());
        String invitationToken = inbox.token(inviteeEmail, "Convite para uma organização");
        mvc.perform(get("/organizations/invitations/lookup").param("token", invitationToken))
                .andExpect(status().isOk())
                .andDo(result -> assertEquals(inviteeEmail,
                        json.readTree(result.getResponse().getContentAsString()).get("email").asText()));

        mvc.perform(post("/organizations/invitations/accept")
                        .header("Authorization", bearer(unauthorizedMember))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("token", invitationToken))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/organizations/invitations/accept")
                        .header("Authorization", bearer(invitee))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("token", invitationToken))))
                .andExpect(status().isOk())
                .andDo(result -> assertEquals("ACCEPTED",
                        json.readTree(result.getResponse().getContentAsString()).get("state").asText()));
        mvc.perform(post("/organizations/invitations/accept")
                        .header("Authorization", bearer(invitee))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("token", invitationToken))))
                .andExpect(status().isGone());

        UUID projectId = project(owner, "Membership revocation");
        UUID readGrant = rootGrant(ownerId, organizationId, "PROJECT_READ");
        UUID memberGrant = grant(owner, organizationId, inviteeId, "PROJECT_READ", "PROJECT", projectId,
                null, false, readGrant);
        UUID descendantGrant = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO organization_permission_grants
                    (id, beneficiary_user_id, organization_id, action, scope_type, scope_id,
                     issuer_user_id, valid_until, state, can_delegate, parent_grant_id, created_at)
                VALUES (?, ?, ?, 'PROJECT_READ', 'PROJECT', ?, ?, NULL, 'ACTIVE', false, ?, now())
                """, descendantGrant, grantDescendantId, organizationId, projectId, inviteeId, memberGrant);
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(invitee))
                        .header("X-Organization-Id", organizationId))
                .andExpect(status().isOk());
        mvc.perform(delete("/organizations/" + organizationId + "/members/" + inviteeId)
                        .header("Authorization", bearer(unauthorizedMember)))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/organizations/" + organizationId + "/members/" + inviteeId)
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isNoContent());
        assertEquals("REVOKED", grantState(memberGrant));
        assertEquals("REVOKED", grantState(descendantGrant));
        assertEquals("REVOKED", jdbc.queryForObject("SELECT state FROM organization_memberships "
                + "WHERE organization_id = ? AND user_id = ?", String.class, organizationId, inviteeId));
        UUID explicitRootGrant = rootGrant(ownerId, organizationId, "PROJECT_CREATE");
        UUID explicitDescendantGrant = grant(owner, organizationId, grantDescendantId,
                "PROJECT_CREATE", "PROJECT", projectId, null, false, explicitRootGrant);
        authorization.revoke(ownerId, organizationId, explicitRootGrant);
        assertEquals("REVOKED", grantState(explicitRootGrant));
        assertEquals("REVOKED", grantState(explicitDescendantGrant));
        var revokedGrantEvents = jdbc.query("""
                SELECT target_id FROM organization_audit_events
                WHERE organization_id = ? AND actor_user_id = ? AND action = 'PERMISSION_REVOKED'
                ORDER BY target_id
                """, (rs, row) -> rs.getObject("target_id", UUID.class), organizationId, ownerId);
        assertEquals(4, revokedGrantEvents.size());
        assertEquals(1, revokedGrantEvents.stream().filter(memberGrant::equals).count());
        assertEquals(1, revokedGrantEvents.stream().filter(descendantGrant::equals).count());
        assertEquals(1, revokedGrantEvents.stream().filter(explicitRootGrant::equals).count());
        assertEquals(1, revokedGrantEvents.stream().filter(explicitDescendantGrant::equals).count());
        mvc.perform(get("/projects/" + projectId).header("Authorization", bearer(invitee))
                        .header("X-Organization-Id", organizationId))
                .andExpect(status().isForbidden());
        mvc.perform(get("/organizations").header("Authorization", bearer(invitee)))
                .andExpect(status().isOk())
                .andDo(result -> assertFalse(json.readTree(result.getResponse().getContentAsString()).toString()
                        .contains(organizationId.toString())));
    }

    private UUID grant(String actor, UUID organizationId, UUID beneficiaryId, String action,
            String scopeType, UUID scopeId, OffsetDateTime validUntil, boolean canDelegate, UUID parentId)
            throws Exception {
        String value = validUntil == null ? null : validUntil.toString();
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("beneficiaryUserId", beneficiaryId);
        body.put("action", action);
        body.put("scopeType", scopeType);
        body.put("scopeId", scopeId);
        if (value != null) body.put("validUntil", value);
        body.put("canDelegate", canDelegate);
        body.put("parentGrantId", parentId);
        JsonNode result = json.readTree(mvc.perform(post("/organizations/" + organizationId + "/grants")
                        .header("Authorization", bearer(actor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        return UUID.fromString(result.get("id").asText());
    }

    private UUID issueAuditReadGrant(String actor, UUID organizationId, UUID beneficiaryId,
            UUID authorityGrantId) throws Exception {
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("beneficiaryUserId", beneficiaryId);
        body.put("action", "ORGANIZATION_AUDIT_READ");
        body.put("scopeType", "ORGANIZATION");
        body.put("scopeId", organizationId);
        body.put("validUntil", null);
        body.put("canDelegate", false);
        body.put("authorityGrantId", authorityGrantId);
        JsonNode result = json.readTree(mvc.perform(post("/organizations/" + organizationId + "/grants")
                        .header("Authorization", bearer(actor)).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        return UUID.fromString(result.get("id").asText());
    }

    private int issueGrant(String actor, UUID organizationId, UUID beneficiaryId, String action,
            String scopeType, UUID scopeId, OffsetDateTime validUntil, boolean canDelegate, UUID parentId)
            throws Exception {
        return mvc.perform(post("/organizations/" + organizationId + "/grants")
                        .header("Authorization", bearer(actor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "beneficiaryUserId", beneficiaryId,
                                "action", action,
                                "scopeType", scopeType,
                                "scopeId", scopeId,
                                "validUntil", validUntil.toString(),
                                "canDelegate", canDelegate,
                                "parentGrantId", parentId))))
                .andReturn().getResponse().getStatus();
    }

    private ExportGrantResult issueExportGrant(String actor, UUID organizationId, UUID beneficiaryId,
            UUID projectId, OffsetDateTime validUntil, boolean canDelegate, UUID authorityGrantId) throws Exception {
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("beneficiaryUserId", beneficiaryId);
        body.put("action", "PUBLICATION_SUBMISSIONS_EXPORT");
        body.put("scopeType", "PROJECT");
        body.put("scopeId", projectId);
        if (validUntil != null) body.put("validUntil", validUntil.toString());
        body.put("canDelegate", canDelegate);
        if (authorityGrantId != null) body.put("authorityGrantId", authorityGrantId);
        var response = mvc.perform(post("/organizations/" + organizationId + "/grants")
                        .header("Authorization", bearer(actor)).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body)))
                .andReturn().getResponse();
        UUID id = response.getStatus() == 201
                ? UUID.fromString(json.readTree(response.getContentAsString()).get("id").asText()) : null;
        return new ExportGrantResult(response.getStatus(), id);
    }

    private ExportGrantResult issueApprovalGrant(String actor, UUID organizationId, UUID beneficiaryId,
            UUID projectId, OffsetDateTime validUntil, UUID authorityGrantId) throws Exception {
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("beneficiaryUserId", beneficiaryId);
        body.put("action", "PUBLICATION_APPROVE");
        body.put("scopeType", "PROJECT");
        body.put("scopeId", projectId);
        if (validUntil != null) body.put("validUntil", validUntil.toString());
        body.put("canDelegate", false);
        if (authorityGrantId != null) body.put("authorityGrantId", authorityGrantId);
        var response = mvc.perform(post("/organizations/" + organizationId + "/grants")
                        .header("Authorization", bearer(actor)).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body)))
                .andReturn().getResponse();
        UUID id = response.getStatus() == 201
                ? UUID.fromString(json.readTree(response.getContentAsString()).get("id").asText()) : null;
        return new ExportGrantResult(response.getStatus(), id);
    }

    private record ExportGrantResult(int status, UUID grantId) {
        int getStatus() { return status; }
        UUID getGrantId() { return grantId; }
    }

    private UUID project(String token, String name) throws Exception {
        return project(token, name, null);
    }

    private UUID project(String token, String name, UUID organizationId) throws Exception {
        String document = json.writeValueAsString(Map.of("version", 1, "name", name,
                "activePageId", "page-1", "pages", new Object[] {Map.of("id", "page-1", "name", "Home",
                        "blocks", new Object[0])}));
        var request = post("/projects").header("Authorization", bearer(token)).contentType(MediaType.APPLICATION_JSON);
        if (organizationId != null) request.header("X-Organization-Id", organizationId);
        JsonNode result = json.readTree(mvc.perform(request
                        .content(json.writeValueAsString(Map.of("name", name, "document", json.readTree(document)))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        return UUID.fromString(result.get("id").asText());
    }

    private void addMembershipWithoutChangingDefault(UUID userId, UUID organizationId) {
        jdbc.update("INSERT INTO organization_memberships (organization_id, user_id, role, is_default, created_at) "
                + "VALUES (?, ?, 'MEMBER', false, now())", organizationId, userId);
    }

    private void addOrganizationPermissions(UUID beneficiaryId, UUID organizationId, UUID issuerId) {
        jdbc.update("""
                INSERT INTO organization_permission_grants
                    (id, beneficiary_user_id, organization_id, action, scope_type, scope_id,
                     issuer_user_id, valid_until, state, can_delegate, parent_grant_id, created_at)
                SELECT gen_random_uuid(), ?, ?, action, 'ORGANIZATION', ?, ?, NULL, 'ACTIVE', false, NULL, now()
                FROM (VALUES ('PROJECT_READ'), ('PROJECT_CREATE'), ('PROJECT_UPDATE'), ('PROJECT_DELETE'),
                    ('THEME_READ'), ('THEME_CREATE'), ('THEME_UPDATE'), ('THEME_DELETE'),
                    ('PUBLICATION_READ'), ('PUBLICATION_MANAGE'), ('PUBLICATION_ANALYTICS_READ'),
                    ('PUBLICATION_SUBMISSIONS_READ'), ('PUBLICATION_ACTIVITY_READ')) AS actions(action)
                """, beneficiaryId, organizationId, organizationId, issuerId);
    }

    private MockHttpServletRequestBuilder approvedPublish(String requester, UUID projectId, UUID organizationId)
            throws Exception {
        UUID revisionId = jdbc.queryForObject("""
                SELECT r.id FROM project_revisions r JOIN projects p ON p.id = r.project_id
                WHERE p.id = ? AND p.organization_id = ? AND r.revision_kind = 'DRAFT'
                  AND r.revision_number = p.revision
                """, UUID.class, projectId, organizationId);
        JsonNode review = json.readTree(mvc.perform(post("/projects/" + projectId + "/publication/review-requests")
                        .header("Authorization", bearer(requester)).header("X-Organization-Id", organizationId)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                                "projectRevisionId", revisionId, "operation", "PUBLISH"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String reviewer = publicationReviewers.get(organizationId);
        if (reviewer == null) {
            reviewer = register();
            UUID reviewerId = userId(reviewer);
            addMembershipWithoutChangingDefault(reviewerId, organizationId);
            UUID authorityId = jdbc.queryForObject("""
                    SELECT id FROM organization_permission_grants
                    WHERE organization_id = ? AND action = 'ORGANIZATION_GRANTS_MANAGE'
                      AND state = 'ACTIVE' AND can_delegate ORDER BY created_at LIMIT 1
                    """, UUID.class, organizationId);
            UUID issuerId = jdbc.queryForObject("SELECT beneficiary_user_id FROM organization_permission_grants WHERE id = ?",
                    UUID.class, authorityId);
            jdbc.update("""
                    INSERT INTO organization_permission_grants
                        (id, beneficiary_user_id, organization_id, action, scope_type, scope_id,
                         issuer_user_id, state, can_delegate, authority_grant_id, created_at)
                    VALUES (gen_random_uuid(), ?, ?, 'PUBLICATION_APPROVE', 'ORGANIZATION', ?, ?,
                            'ACTIVE', false, ?, now())
                    """, reviewerId, organizationId, organizationId, issuerId, authorityId);
            publicationReviewers.put(organizationId, reviewer);
        }
        String decisionPath = "/projects/" + projectId + "/publication/review-requests/"
                + review.path("id").asText() + "/decision";
        mvc.perform(post(decisionPath).header("Authorization", bearer(reviewer))
                        .header("X-Organization-Id", organizationId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\":true}"))
                .andExpect(status().isOk());
        return post("/projects/" + projectId + "/publication")
                .header("Authorization", bearer(requester)).header("X-Organization-Id", organizationId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("reviewRequestId", review.path("id").asText())));
    }

    private String register() throws Exception {
        return register(UUID.randomUUID() + "@example.com");
    }

    private String register(String email) throws Exception {
        String ip = "127.0.2." + SIGNUP_IP_SEQUENCE.incrementAndGet();
        mvc.perform(post("/auth/signup/start").with(request -> { request.setRemoteAddr(ip); return request; })
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isAccepted());
        String token = inbox.token(email, "Confirme seu e-mail");
        JsonNode result = json.readTree(mvc.perform(post("/auth/signup/complete")
                        .with(request -> { request.setRemoteAddr(ip); return request; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("token", token, "firstName", "Test", "lastName", "User",
                                "password", "StrongPass1!", "acceptTerms", true))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        return result.get("accessToken").asText();
    }

    private void addMember(UUID userId, UUID organizationId) {
        jdbc.update("UPDATE organization_memberships SET is_default = false WHERE user_id = ?", userId);
        jdbc.update("INSERT INTO organization_memberships (organization_id, user_id, role, is_default, created_at) "
                + "VALUES (?, ?, 'MEMBER', true, now())", organizationId, userId);
    }

    private UUID rootGrant(UUID userId, UUID organizationId, String action) {
        return jdbc.queryForObject("SELECT id FROM organization_permission_grants WHERE beneficiary_user_id = ? "
                + "AND organization_id = ? AND action = ? AND scope_type = 'ORGANIZATION' AND parent_grant_id IS NULL",
                UUID.class, userId, organizationId, action);
    }

    private boolean isAllowed(UUID userId, UUID organizationId, String action, UUID projectId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM organization_permission_grants WHERE beneficiary_user_id = ?
                  AND organization_id = ? AND action = ? AND scope_id = ? AND state = 'ACTIVE'
                  AND (valid_until IS NULL OR valid_until > now()))
                """, Boolean.class, userId, organizationId, action, projectId));
    }

    private String grantState(UUID grantId) {
        return jdbc.queryForObject("SELECT state FROM organization_permission_grants WHERE id = ?", String.class, grantId);
    }

    private UUID userId(String token) { return UUID.fromString(jwtDecoder.decode(token).getSubject()); }
    private UUID defaultOrganization(UUID userId) {
        return jdbc.queryForObject("SELECT organization_id FROM organization_memberships WHERE user_id = ? AND is_default",
                UUID.class, userId);
    }
    private static String bearer(String token) { return "Bearer " + token; }
}

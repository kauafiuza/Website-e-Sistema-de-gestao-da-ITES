package br.com.ites.server;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.HashMap;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

@Import({TestcontainersConfiguration.class, RecordingMailGateway.class})
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(
        properties = {
            "auth.jwt.secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
            "auth.totp-encryption-key=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
        })
class ProjectFlowTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtDecoder jwtDecoder;
    @Autowired RecordingMailGateway.Inbox inbox;
    private static final AtomicInteger SIGNUP_IP_SEQUENCE = new AtomicInteger();
    private final Map<UUID, Reviewer> publicationReviewers = new HashMap<>();

    private record Reviewer(String token, UUID userId) {}

    @Test
    void databaseRejectsCrossProjectAndCrossTenantAssociations() throws Exception {
        String firstOwner = register();
        String secondOwner = register();
        UUID firstOwnerId = UUID.fromString(jwtDecoder.decode(firstOwner).getSubject());
        String firstProjectId = create(firstOwner, "Primeiro projeto", document("Primeiro projeto", "first"))
                .path("id").asText();
        String secondProjectId = create(secondOwner, "Segundo projeto", document("Segundo projeto", "second"))
                .path("id").asText();
        UUID firstProject = UUID.fromString(firstProjectId);
        UUID secondProject = UUID.fromString(secondProjectId);
        UUID firstRevision = currentDraftRevision(firstProject);
        UUID secondRevision = currentDraftRevision(secondProject);
        UUID firstOrganization = jdbc.queryForObject(
                "SELECT organization_id FROM projects WHERE id = ?", UUID.class, firstProject);
        UUID secondOrganization = jdbc.queryForObject(
                "SELECT organization_id FROM projects WHERE id = ?", UUID.class, secondProject);

        UUID publicationId = UUID.randomUUID();
        jdbc.update("INSERT INTO publications (id, project_id, organization_id, public_key) VALUES (?, ?, ?, ?)",
                publicationId, firstProject, firstOrganization, UUID.randomUUID().toString());
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update("""
                INSERT INTO publication_versions
                    (id, publication_id, version_number, document, route_blueprint, project_revision,
                     project_revision_id, project_id)
                VALUES (?, ?, 1, '{}'::jsonb, '[]'::jsonb, 1, ?, ?)
                """, UUID.randomUUID(), publicationId, secondRevision, firstProject));

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update("""
                INSERT INTO publication_review_requests
                    (id, project_id, project_revision_id, operation, requester_user_id)
                VALUES (?, ?, ?, 'PUBLISH', ?)
                """, UUID.randomUUID(), firstProject, secondRevision, firstOwnerId));

        UUID otherTenantManageGrant = jdbc.queryForObject("""
                SELECT id FROM organization_permission_grants
                WHERE organization_id = ? AND action = 'ORGANIZATION_GRANTS_MANAGE'
                  AND beneficiary_user_id = ? AND state = 'ACTIVE'
                """, UUID.class, secondOrganization,
                UUID.fromString(jwtDecoder.decode(secondOwner).getSubject()));
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update("""
                INSERT INTO organization_permission_grants
                    (id, beneficiary_user_id, organization_id, action, scope_type, scope_id,
                     issuer_user_id, parent_grant_id)
                VALUES (?, ?, ?, 'PROJECT_READ', 'ORGANIZATION', ?, ?, ?)
                """, UUID.randomUUID(), firstOwnerId, firstOrganization, firstOrganization,
                firstOwnerId, otherTenantManageGrant));

        UUID firstFormVersion = insertFormVersion(firstProject, firstOrganization);
        UUID otherFormVersion = insertFormVersion(secondProject, secondOrganization);
        assertThrows(DataIntegrityViolationException.class, () -> insertSubmission(
                publicationId, firstOrganization, otherFormVersion));
        assertThrows(DataIntegrityViolationException.class, () -> insertSubmission(
                publicationId, secondOrganization, otherFormVersion));
        insertSubmission(publicationId, firstOrganization, firstFormVersion);
    }

    private UUID insertFormVersion(UUID projectId, UUID organizationId) {
        UUID formId = UUID.randomUUID();
        UUID formVersionId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO organization_forms
                    (id, organization_id, project_id, source_page_id, source_block_id, name, definition_id)
                VALUES (?, ?, ?, 'page-1', 'block-1', 'Contato', 'form-classic')
                """, formId, organizationId, projectId);
        jdbc.update("""
                INSERT INTO organization_form_versions
                    (id, form_id, organization_id, version_number, name, definition_id, field_schema)
                VALUES (?, ?, ?, 1, 'Contato', 'form-classic', '[]'::jsonb)
                """, formVersionId, formId, organizationId);
        return formVersionId;
    }

    private void insertSubmission(UUID publicationId, UUID organizationId, UUID formVersionId) {
        jdbc.update("""
                INSERT INTO form_submissions
                    (id, publication_id, organization_id, version_number, page_id, block_id,
                     form_name, fields, form_version_id)
                VALUES (?, ?, ?, 1, 'page-1', 'block-1', 'Contato', '{}'::jsonb, ?)
                """, UUID.randomUUID(), publicationId, organizationId, formVersionId);
    }

    private UUID currentDraftRevision(UUID projectId) {
        return jdbc.queryForObject("""
                SELECT revision.id FROM project_revisions revision
                JOIN projects project ON project.id = revision.project_id
                WHERE project.id = ? AND revision.revision_kind = 'DRAFT'
                  AND revision.revision_number = project.revision
                """, UUID.class, projectId);
    }

    @Test
    void templateCompositionRejectsForbiddenDefinitionsAndProtectedRegionEdits() throws Exception {
        String owner = register();
        UUID organizationId = defaultOrganization(UUID.fromString(jwtDecoder.decode(owner).getSubject()));
        ObjectNode invalidSnapshot = json.valueToTree(
                templateContent("Título inválido", "Cabeçalho", "Rodapé"));
        ((ObjectNode) invalidSnapshot.path("regions").path("navbar")).put("definitionId", "navbar-unknown");
        mvc.perform(post("/organizations/" + organizationId + "/templates")
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Snapshot inválido", "content", invalidSnapshot))))
                .andExpect(status().isBadRequest());
        JsonNode template = createTemplate(owner, organizationId, "Padrão editorial",
                templateContent("Título original", "Cabeçalho original", "Rodapé original"));
        JsonNode laterVersion = json.readTree(mvc.perform(post("/organizations/" + organizationId + "/templates/"
                        + template.path("id").asText() + "/versions")
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("expectedVersion", 1,
                                "content", templateContent("Título v2", "Cabeçalho v2", "Rodapé v2")))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        ObjectNode permissiveContent = json.valueToTree(
                templateContent("Outro título", "Outro cabeçalho", "Outro rodapé"));
        ((ArrayNode) permissiveContent.path("composition").path("allowedDefinitionIds")).add("contact-classic");
        JsonNode otherTemplate = json.readTree(mvc.perform(post("/organizations/" + organizationId + "/templates")
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Outro padrão", "content", permissiveContent))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        ObjectNode document = projectDocument(template);
        ObjectNode secondPage = json.createObjectNode();
        secondPage.put("id", "page-2");
        secondPage.put("name", "Sobre");
        secondPage.put("slug", "sobre");
        secondPage.set("blocks", json.createArrayNode());
        secondPage.set("templateOrigin", json.valueToTree(templateOrigin(template)));
        secondPage.set("composition", template.path("content").path("composition").deepCopy());
        ((ArrayNode) document.path("pages")).add(secondPage);
        ((ArrayNode) document.path("navbar").path("props").path("items")).add(json.valueToTree(
                Map.of("id", "page-2", "title", "Sobre", "description", "", "href", "page:page-2",
                        "value", "", "features", List.of())));
        String projectId = create(owner, "Composição", json.writeValueAsString(document)).get("id").asText();

        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(2, json.writeValueAsString(document))))
                .andExpect(status().isConflict());

        ObjectNode reorderedNavigation = document.deepCopy();
        ArrayNode reorderedItems = (ArrayNode) reorderedNavigation.path("navbar").path("props").path("items");
        JsonNode firstNavigationItem = reorderedItems.remove(0);
        reorderedItems.add(firstNavigationItem);
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, json.writeValueAsString(reorderedNavigation))))
                .andExpect(status().isBadRequest());

        ObjectNode forbidden = document.deepCopy();
        ((ArrayNode) forbidden.path("pages").get(0).path("blocks")).add(json.valueToTree(block(
                "blocked-block", "contact-classic", Map.of())));
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, json.writeValueAsString(forbidden))))
                .andExpect(status().isBadRequest());

        ObjectNode changedHeader = document.deepCopy();
        ((ObjectNode) changedHeader.path("navbar").path("props")).put("title", "Cabeçalho alterado");
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, json.writeValueAsString(changedHeader))))
                .andExpect(status().isBadRequest());

        ObjectNode changedContent = document.deepCopy();
        ((ObjectNode) changedContent.path("pages").get(0).path("blocks").get(0).path("props"))
                .put("title", "Título editado");
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, json.writeValueAsString(changedContent))))
                .andExpect(status().isOk())
                .andDo(result -> assertEquals("Título editado", json.readTree(result.getResponse()
                        .getContentAsString()).path("document").path("pages").get(0).path("blocks")
                        .get(0).path("props").path("title").asText()));

        ObjectNode alteredPolicy = changedContent.deepCopy();
        ((ArrayNode) alteredPolicy.path("pages").get(0).path("composition").path("allowedDefinitionIds"))
                .add("contact-classic");
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(2, json.writeValueAsString(alteredPolicy))))
                .andExpect(status().isBadRequest());

        ObjectNode changedVersion = changedContent.deepCopy();
        ((ObjectNode) changedVersion.path("pages").get(0)).set("templateOrigin",
                json.valueToTree(templateOrigin(laterVersion)));
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(2, json.writeValueAsString(changedVersion))))
                .andExpect(status().isBadRequest());

        ObjectNode changedTemplate = changedContent.deepCopy();
        ((ObjectNode) changedTemplate.path("pages").get(0).path("templateOrigin"))
                .put("templateId", otherTemplate.path("id").asText());
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(2, json.writeValueAsString(changedTemplate))))
                .andExpect(status().isBadRequest());

        ObjectNode rekeyedForbiddenPage = changedContent.deepCopy();
        ObjectNode forbiddenPage = (ObjectNode) rekeyedForbiddenPage.path("pages").get(0);
        forbiddenPage.put("id", "replacement-page");
        forbiddenPage.set("templateOrigin", json.valueToTree(templateOrigin(otherTemplate)));
        forbiddenPage.set("composition", otherTemplate.path("content").path("composition").deepCopy());
        ((ArrayNode) forbiddenPage.path("blocks")).add(json.valueToTree(block(
                "new-forbidden-block", "contact-classic", Map.of())));
        rekeyedForbiddenPage.put("activePageId", "replacement-page");
        ObjectNode forbiddenNavigationItem = (ObjectNode) rekeyedForbiddenPage.path("navbar")
                .path("props").path("items").get(0);
        forbiddenNavigationItem.put("id", "replacement-page");
        forbiddenNavigationItem.put("href", "page:replacement-page");
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(2, json.writeValueAsString(rekeyedForbiddenPage))))
                .andExpect(status().isBadRequest());

        ObjectNode rekeyedPage = changedContent.deepCopy();
        ObjectNode rekeyedPageNode = (ObjectNode) rekeyedPage.path("pages").get(0);
        rekeyedPageNode.put("id", "replacement-page");
        rekeyedPageNode.set("templateOrigin", json.valueToTree(templateOrigin(otherTemplate)));
        rekeyedPageNode.set("composition", otherTemplate.path("content").path("composition").deepCopy());
        ((ArrayNode) rekeyedPageNode.path("blocks")).add(json.valueToTree(block(
                "new-forbidden-block", "contact-classic", Map.of())));
        rekeyedPage.put("activePageId", "replacement-page");
        ObjectNode navigationItem = (ObjectNode) rekeyedPage.path("navbar").path("props").path("items").get(0);
        navigationItem.put("id", "replacement-page");
        navigationItem.put("href", "page:replacement-page");
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(2, json.writeValueAsString(rekeyedPage))))
                .andExpect(status().isBadRequest());

        ObjectNode removedOrigin = changedContent.deepCopy();
        ((ObjectNode) removedOrigin.path("pages").get(0)).remove("templateOrigin");
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(2, json.writeValueAsString(removedOrigin))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void protectedRegionChangesNeedAnAuthorVersionAndExplicitAdoption() throws Exception {
        String owner = register();
        UUID ownerId = UUID.fromString(jwtDecoder.decode(owner).getSubject());
        UUID organizationId = defaultOrganization(ownerId);
        JsonNode firstVersion = createTemplate(owner, organizationId, "Modelo com regiões",
                templateContent("Título inicial", "Cabeçalho v1", "Rodapé v1"));
        JsonNode otherTemplate = createTemplate(owner, organizationId, "Outro modelo",
                templateContent("Outro título", "Outro cabeçalho", "Outro rodapé"));
        ObjectNode document = projectDocument(firstVersion);
        document.put("name", "Adoção");
        String projectId = create(owner, "Adoção", json.writeValueAsString(document)).get("id").asText();

        mvc.perform(patch("/projects/" + projectId + "/regions/adoption")
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("revision", 2,
                                "templateId", firstVersion.path("id").asText(),
                                "versionId", firstVersion.path("versionId").asText(),
                                "regions", List.of("navbar")))))
                .andExpect(status().isConflict());

        Map<String, Object> secondContent = templateContent("Título v2", "Cabeçalho v2", "Rodapé v2");
        JsonNode secondVersion = json.readTree(mvc.perform(post("/organizations/" + organizationId + "/templates/"
                        + firstVersion.path("id").asText() + "/versions")
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("expectedVersion", 1, "content", secondContent))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());

        mvc.perform(patch("/projects/" + projectId + "/regions/adoption")
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("revision", 1,
                                "templateId", firstVersion.path("id").asText(),
                                "versionId", firstVersion.path("versionId").asText(),
                                "regions", List.of("navbar")))))
                .andExpect(status().isNotFound());

        JsonNode unchanged = json.readTree(mvc.perform(get("/projects/" + projectId)
                        .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertEquals("Cabeçalho v1", unchanged.path("document").path("navbar").path("props").path("title").asText());

        @SuppressWarnings("unchecked")
        Map<String, Object> nextRegions = (Map<String, Object>) secondContent.get("regions");
        ObjectNode implicitChange = document.deepCopy();
        implicitChange.set("navbar", json.valueToTree(nextRegions.get("navbar")));
        implicitChange.set("footer", json.valueToTree(nextRegions.get("footer")));
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, json.writeValueAsString(implicitChange))))
                .andExpect(status().isBadRequest());

        ObjectNode reanchored = document.deepCopy();
        ((ObjectNode) reanchored.path("regionOrigins")).set("navbar",
                json.valueToTree(templateOrigin(secondVersion)));
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, json.writeValueAsString(reanchored))))
                .andExpect(status().isBadRequest());

        ObjectNode swappedTemplate = document.deepCopy();
        ((ObjectNode) swappedTemplate.path("regionOrigins")).set("navbar",
                json.valueToTree(templateOrigin(otherTemplate)));
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, json.writeValueAsString(swappedTemplate))))
                .andExpect(status().isBadRequest());

        mvc.perform(patch("/projects/" + projectId + "/regions/adoption")
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("revision", 1,
                                "templateId", firstVersion.path("id").asText(),
                                "versionId", secondVersion.path("versionId").asText(),
                                "regions", List.of("navbar", "footer")))))
                .andExpect(status().isOk())
                .andDo(result -> {
                    JsonNode adopted = json.readTree(result.getResponse().getContentAsString()).path("document");
                    assertEquals("Cabeçalho v2", adopted.path("navbar").path("props").path("title").asText());
                    assertEquals(secondVersion.path("versionId").asText(),
                            adopted.path("regionOrigins").path("navbar").path("versionId").asText());
                });

        String otherMember = register();
        UUID otherMemberId = UUID.fromString(jwtDecoder.decode(otherMember).getSubject());
        jdbc.update("UPDATE organization_memberships SET is_default = false WHERE user_id = ?", otherMemberId);
        jdbc.update("""
                INSERT INTO organization_memberships (organization_id, user_id, role, is_default, created_at)
                VALUES (?, ?, 'MEMBER', true, LOCALTIMESTAMP)
                """, organizationId, otherMemberId);
        mvc.perform(post("/organizations/" + organizationId + "/templates/" + firstVersion.path("id").asText()
                        + "/versions").header("Authorization", "Bearer " + otherMember)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("expectedVersion", 2,
                                "content", templateContent("Não autorizado", "Cabeçalho v3", "Rodapé v3")))))
                .andExpect(status().isForbidden());
    }

    @Test
    void deletingTemplateAuthorPreservesSnapshotsAndEditableCopies() throws Exception {
        String author = register();
        UUID authorId = UUID.fromString(jwtDecoder.decode(author).getSubject());
        UUID organizationId = defaultOrganization(authorId);
        JsonNode template = createTemplate(author, organizationId, "Modelo preservado",
                templateContent("Título original", "Cabeçalho", "Rodapé"));
        String member = register();
        UUID memberId = UUID.fromString(jwtDecoder.decode(member).getSubject());
        jdbc.update("UPDATE organization_memberships SET is_default = false WHERE user_id = ?", memberId);
        jdbc.update("""
                INSERT INTO organization_memberships (organization_id, user_id, role, is_default, created_at)
                VALUES (?, ?, 'MEMBER', false, LOCALTIMESTAMP)
                """, organizationId, memberId);
        for (String action : List.of("PROJECT_CREATE", "PROJECT_READ", "PROJECT_UPDATE")) {
            jdbc.update("""
                    INSERT INTO organization_permission_grants
                        (id, beneficiary_user_id, organization_id, action, scope_type, scope_id, issuer_user_id)
                    VALUES (?, ?, ?, ?, 'ORGANIZATION', ?, ?)
                    """, UUID.randomUUID(), memberId, organizationId, action, organizationId, memberId);
        }
        ObjectNode document = projectDocument(template);
        document.put("name", "Cópia preservada");
        JsonNode created = json.readTree(mvc.perform(post("/projects")
                        .header("Authorization", "Bearer " + member)
                        .header("X-Organization-Id", organizationId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Cópia preservada", "document", document))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());

        jdbc.update("DELETE FROM refresh_tokens WHERE user_id = ?", authorId);
        jdbc.update("DELETE FROM users WHERE id = ?", authorId);

        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM organization_page_templates WHERE id = ?",
                Integer.class, UUID.fromString(template.path("id").asText())));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM organization_page_template_versions WHERE template_id = ?",
                Integer.class, UUID.fromString(template.path("id").asText())));
        ObjectNode edited = document.deepCopy();
        ((ObjectNode) edited.path("pages").get(0).path("blocks").get(0).path("props")).put("title", "Após remoção");
        mvc.perform(patch("/projects/" + created.path("id").asText())
                        .header("Authorization", "Bearer " + member)
                        .header("X-Organization-Id", organizationId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, json.writeValueAsString(edited))))
                .andExpect(status().isOk());
        mvc.perform(post("/organizations/" + organizationId + "/templates/" + template.path("id").asText() + "/versions")
                        .header("Authorization", "Bearer " + member)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("expectedVersion", 1,
                                "content", templateContent("Sem autoria", "Cabeçalho", "Rodapé")))))
                .andExpect(status().isForbidden());
    }

    @Test
    void templateBackedPageCanBeDeletedWithoutChangingRemainingPagePolicy() throws Exception {
        String owner = register();
        UUID organizationId = defaultOrganization(UUID.fromString(jwtDecoder.decode(owner).getSubject()));
        JsonNode template = createTemplate(owner, organizationId, "Modelo removível",
                templateContent("Título", "Cabeçalho", "Rodapé"));
        ObjectNode document = projectDocument(template);
        Map<String, Object> secondPage = Map.of("id", "page-2", "name", "Contato",
                "slug", "contato", "blocks", List.of());
        ((ArrayNode) document.path("pages")).add(json.valueToTree(secondPage));
        Map<String, Object> secondNavigationItem = Map.of("id", "page-2", "title", "Contato",
                "description", "", "href", "page:page-2", "value", "", "features", List.of());
        ((ArrayNode) document.path("navbar").path("props").path("items"))
                .add(json.valueToTree(secondNavigationItem));
        String projectId = create(owner, "Composição", json.writeValueAsString(document)).get("id").asText();

        ObjectNode deletedPage = document.deepCopy();
        ((ArrayNode) deletedPage.path("pages")).remove(0);
        deletedPage.put("activePageId", "page-2");
        ((ArrayNode) deletedPage.path("navbar").path("props").path("items")).remove(0);
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, json.writeValueAsString(deletedPage))))
                .andExpect(status().isOk())
                .andDo(result -> {
                    JsonNode persisted = json.readTree(result.getResponse().getContentAsString()).path("document");
                    assertEquals(1, persisted.path("pages").size());
                    assertEquals("page-2", persisted.path("pages").get(0).path("id").asText());
                    assertEquals(template.path("versionId").asText(),
                            persisted.path("regionOrigins").path("navbar").path("versionId").asText());
                });
    }

    @Test
    void publishedContactFormStoresOnlyValidResponsesForItsOwner() throws Exception {
        String owner = register();
        String outsider = register();
        String contactDocument = document("Contact", "first").replace("future-block", "contact-classic");
        String id = create(owner, "Contact", contactDocument).get("id").asText();
        String key = json.readTree(mvc.perform(approvedPublish(owner, id)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("publicKey").asText();
        String endpoint = "/public/" + key + "/submissions";
        String valid = json.writeValueAsString(Map.of("pageId", "page-1", "blockId", "block-1", "version", 1,
                "fields", Map.of("name", "=1+1", "email", "ana@example.com", "message", "\t@SUM(1,1)")));
        mvc.perform(post(endpoint).contentType(MediaType.APPLICATION_JSON).content(valid))
                .andExpect(status().isCreated());
        mvc.perform(post(endpoint).contentType(MediaType.APPLICATION_JSON)
                .content(valid.replace("block-1", "other-block"))).andExpect(status().isBadRequest());
        mvc.perform(post(endpoint).contentType(MediaType.APPLICATION_JSON)
                .content(valid.replace("\"version\":1", "\"version\":0"))).andExpect(status().isConflict());
        mvc.perform(get("/projects/" + id + "/publication/submissions")
                .header("Authorization", "Bearer " + outsider)).andExpect(status().isOk())
                .andDo(result -> assertEquals(0, json.readTree(result.getResponse().getContentAsString())
                        .get("items").size()));
        JsonNode inbox = json.readTree(mvc.perform(get("/projects/" + id + "/publication/submissions")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        JsonNode inboxItems = inbox.get("items");
        assertEquals(1, inboxItems.size());
        assertEquals("=1+1", inboxItems.get(0).get("fields").get("name").asText());
        mvc.perform(get("/projects/" + id + "/publication/submissions").param("search", "ana@example.com")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andDo(result -> assertEquals(1, json.readTree(result.getResponse().getContentAsString()).get("items").size()));
        mvc.perform(get("/projects/" + id + "/publication/submissions").param("search", "sem-resultado")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andDo(result -> assertEquals(0, json.readTree(result.getResponse().getContentAsString()).get("items").size()));
        mvc.perform(get("/projects/" + id + "/publication/submissions/export")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isForbidden());
        mvc.perform(get("/projects/" + id + "/publication/submissions/export")
                .header("Authorization", "Bearer " + outsider)).andExpect(status().isForbidden());
        UUID ownerId = UUID.fromString(jwtDecoder.decode(owner).getSubject());
        UUID organizationId = jdbc.queryForObject("SELECT organization_id FROM organization_memberships "
                + "WHERE user_id = ? AND is_default", UUID.class, ownerId);
        UUID authorityGrantId = jdbc.queryForObject("SELECT id FROM organization_permission_grants "
                + "WHERE beneficiary_user_id = ? AND organization_id = ? AND action = 'ORGANIZATION_GRANTS_MANAGE' "
                + "AND state = 'ACTIVE' AND parent_grant_id IS NULL", UUID.class, ownerId, organizationId);
        String exportGrant = mvc.perform(post("/organizations/" + organizationId + "/grants")
                        .header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "beneficiaryUserId", ownerId,
                                "action", "PUBLICATION_SUBMISSIONS_EXPORT",
                                "scopeType", "PROJECT", "scopeId", id,
                                "canDelegate", false, "authorityGrantId", authorityGrantId))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        JsonNode createdExport = json.readTree(exportGrant);
        assertEquals(authorityGrantId.toString(), createdExport.get("authorityGrantId").asText());
        assertTrue(createdExport.get("parentGrantId").isNull());
        mvc.perform(get("/projects/" + id + "/publication/submissions/export")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andDo(result -> {
                    String csv = result.getResponse().getContentAsString();
                    assertTrue(result.getResponse().getContentType().startsWith("text/csv"));
                    assertTrue(csv.contains("'=1+1"));
                    assertTrue(csv.contains("'\\t@SUM(1,1)"));
                });
        mvc.perform(get("/projects/" + id + "/publication/submissions/export").param("search", "ana@example.com")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andDo(result -> assertTrue(result.getResponse().getContentAsString().contains("ana@example.com")));
        assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM organization_audit_events "
                + "WHERE organization_id = ? AND action = 'SUBMISSIONS_READ' AND target_id = ?",
                Integer.class, organizationId, UUID.fromString(id)));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM organization_audit_events "
                + "WHERE organization_id = ? AND action = 'SUBMISSIONS_EXPORTED' AND target_id = ?",
                Integer.class, organizationId, UUID.fromString(id)));
        assertFalse(jdbc.queryForObject("SELECT string_agg(action || target_type || target_id::text, '') "
                + "FROM organization_audit_events WHERE organization_id = ?", String.class, organizationId)
                .contains("ana@example.com"));
    }

    @Test
    void configurableFormChecksPublishedOptionsAndPreservesTheSchema() throws Exception {
        String owner = register();
        String schema = "[{\"id\":\"choice\",\"label\":\"Escolha\",\"type\":\"select\",\"required\":true,\"options\":[{\"id\":\"yes\",\"label\":\"Sim\"}]},{\"id\":\"note\",\"label\":\"Observação\",\"type\":\"text\",\"required\":false}]";
        String configured = document("Custom", "first").replace("future-block", "form-classic")
                .replace("\"unknown\":42", "\"formFields\":" + schema);
        String invalidDocument = configured.replace("\"id\":\"yes\",\"label\":\"Sim\"", "\"id\":\"yes\",\"label\":\"Sim\"},{\"id\":\"yes\",\"label\":\"Duplicada\"");
        mvc.perform(post("/projects").header("Authorization", "Bearer " + owner)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "name", "Custom", "document", json.readTree(invalidDocument)))))
                .andExpect(status().isBadRequest());
        String id = create(owner, "Custom", configured).get("id").asText();
        String key = json.readTree(mvc.perform(approvedPublish(owner, id)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("publicKey").asText();
        String endpoint = "/public/" + key + "/submissions";
        JsonNode publicPage = json.readTree(mvc.perform(get("/public/" + key + "/home"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode formReference = publicPage.path("formReferences").get(0);
        assertNotNull(formReference);
        assertEquals(1, formReference.path("formVersion").asInt());
        assertTrue(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM organization_forms form
                    JOIN organization_form_versions version ON version.form_id = form.id
                    JOIN projects project ON project.id = form.project_id
                    WHERE form.id = ? AND version.id = ? AND form.organization_id = project.organization_id
                      AND form.project_id = ?
                )
                """, Boolean.class, UUID.fromString(formReference.path("formId").asText()),
                UUID.fromString(formReference.path("formVersionId").asText()), UUID.fromString(id)));
        for (String value : new String[] {"other", ""}) {
            mvc.perform(post(endpoint).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                    "pageId", "page-1", "blockId", "block-1", "version", 1, "fields", Map.of("choice", value)))))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(post(endpoint).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                "pageId", "page-1", "blockId", "block-1", "version", 1,
                "fields", Map.of("choice", "yes", "extra", "unwanted")))))
                .andExpect(status().isBadRequest());
        mvc.perform(post(endpoint).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                "pageId", "page-1", "blockId", "block-1", "version", 1, "fields", Map.of("choice", "yes", "note", "O'Brien; SELECT")))))
                .andExpect(status().isCreated());
        mvc.perform(post(endpoint).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                "pageId", "page-1", "blockId", "block-1", "version", 1,
                "formVersionId", "00000000-0000-0000-0000-000000000000",
                "fields", Map.of("choice", "yes", "note", "não deve ser salvo")))))
                .andExpect(status().isConflict());
        mvc.perform(post(endpoint).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                "pageId", "page-1", "blockId", "block-1", "version", 1,
                "formVersionId", formReference.path("formVersionId").asText(),
                "fields", Map.of("choice", "yes", "note", "versão explícita")))))
                .andExpect(status().isCreated());
        JsonNode responses = json.readTree(mvc.perform(get("/projects/" + id + "/publication/submissions")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        JsonNode responseItems = responses.get("items");
        assertEquals("Escolha", responseItems.get(0).get("fieldSchema").get(0).get("label").asText());
        assertEquals("yes", responseItems.get(0).get("fields").get("choice").asText());
        assertTrue(responseItems.get(0).get("fields").get("note").asText().equals("versão explícita")
                || responseItems.get(0).get("fields").get("note").asText().equals("O'Brien; SELECT"));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM form_submissions WHERE publication_id = (SELECT id FROM publications WHERE project_id = ?)",
                Integer.class, UUID.fromString(id)));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM form_submissions WHERE form_version_id = ?",
                Integer.class, UUID.fromString(formReference.path("formVersionId").asText())));
        mvc.perform(get("/projects/" + id + "/publication/submissions?page=1")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andDo(result -> assertEquals(0, json.readTree(result.getResponse().getContentAsString())
                        .get("items").size()));
    }

    @Test
    void restoredPublicationUsesTheFormNameFromItsImmutableVersion() throws Exception {
        String owner = register();
        String firstDocument = document("Contact", "first").replace("future-block", "form-classic")
                .replace("\"unknown\":42", "\"title\":\"Formulário v1\"");
        String projectId = create(owner, "Contact", firstDocument).get("id").asText();
        String key = json.readTree(mvc.perform(approvedPublish(owner, projectId)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).path("publicKey").asText();
        JsonNode firstPublication = json.readTree(mvc.perform(get("/public/" + key + "/home"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode firstReference = firstPublication.path("formReferences").get(0);

        JsonNode current = json.readTree(mvc.perform(get("/projects/" + projectId)
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        String secondDocument = firstDocument.replace("Formulário v1", "Formulário v2");
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(current.path("revision").asLong(), secondDocument)))
                .andExpect(status().isOk());
        mvc.perform(approvedPublish(owner, projectId)).andExpect(status().isOk());
        JsonNode secondPublication = json.readTree(mvc.perform(get("/public/" + key + "/home"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode secondReference = secondPublication.path("formReferences").get(0);
        assertNotEquals(firstReference.path("formVersionId").asText(), secondReference.path("formVersionId").asText());
        assertEquals("Formulário v2", jdbc.queryForObject(
                "SELECT name FROM organization_form_versions WHERE id = ?",
                String.class, UUID.fromString(secondReference.path("formVersionId").asText())));
        mvc.perform(approvedRestore(owner, projectId, 1)).andExpect(status().isOk());

        mvc.perform(post("/public/" + key + "/submissions").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("pageId", "page-1", "blockId", "block-1",
                                "version", 3, "formVersionId", firstReference.path("formVersionId").asText(),
                                "fields", Map.of("name", "Ana", "email", "ana@example.com")))))
                .andExpect(status().isCreated());
        assertEquals("Formulário v1", jdbc.queryForObject(
                "SELECT form_name FROM form_submissions WHERE form_version_id = ?",
                String.class, UUID.fromString(firstReference.path("formVersionId").asText())));
    }

    @Test
    void themesAreOrganizationScopedAndCanBeLinkedToSeveralProjects() throws Exception {
        assertEquals("SQL", jdbc.queryForObject(
                "SELECT type FROM flyway_schema_history WHERE version = '3'", String.class));
        String alice = register();
        String bob = register();
        String colors = "{\"primary\":\"#123456\",\"secondary\":\"#f3f4f6\",\"accent\":\"#cfe9fd\",\"background\":\"#ffffff\",\"foreground\":\"#111827\",\"card\":\"#ffffff\",\"border\":\"#e5e7eb\",\"muted\":\"#5b6882\",\"success\":\"#16803d\",\"destructive\":\"#dc2626\"}";
        String configuration = "{\"light\":" + colors + ",\"dark\":" + colors + "}";
        String request = "{\"name\":\"Meu tema\",\"configuration\":" + configuration + "}";
        JsonNode saved = json.readTree(mvc.perform(post("/themes")
                .header("Authorization", "Bearer " + alice)
                .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String themeId = saved.get("id").asText();
        mvc.perform(get("/themes").header("Authorization", "Bearer " + bob))
                .andExpect(status().isOk()).andDo(result -> assertEquals(0,
                        json.readTree(result.getResponse().getContentAsString()).get("items").size()));
        String themeField = "\"theme\":{\"presetId\":\"" + themeId + "\"}";
        String aliceDocument = document("First", "one").replaceFirst("\\}$", "," + themeField + "}");
        String bobDocument = document("Forbidden", "one").replaceFirst("\\}$", "," + themeField + "}");
        mvc.perform(post("/projects").header("Authorization", "Bearer " + bob)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(
                        Map.of("name", "Forbidden", "document", json.readTree(bobDocument)))))
                .andExpect(status().isNotFound());
        JsonNode first = create(alice, "First", aliceDocument);
        String secondDocument = document("Second", "two").replaceFirst("\\}$", "," + themeField + "}");
        JsonNode second = create(alice, "Second", secondDocument);
        assertEquals(themeId, first.get("themeId").asText());
        assertEquals(themeId, second.get("themeId").asText());
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM projects WHERE theme_id = ?",
                Integer.class, UUID.fromString(themeId)));
        mvc.perform(delete("/themes/" + themeId).header("Authorization", "Bearer " + alice))
                .andExpect(status().isConflict());
    }

    @Test
    void projectsAndPublicationsAreScopedToTheDefaultOrganizationMembership() throws Exception {
        String alice = register();
        String bob = register();
        UUID aliceId = UUID.fromString(jwtDecoder.decode(alice).getSubject());
        UUID bobId = UUID.fromString(jwtDecoder.decode(bob).getSubject());
        UUID aliceOrganization = defaultOrganization(aliceId);
        UUID bobOrganization = defaultOrganization(bobId);
        assertNotEquals(aliceOrganization, bobOrganization);
        assertEquals("SQL", jdbc.queryForObject(
                "SELECT type FROM flyway_schema_history WHERE version = '9'", String.class));
        assertEquals(1, jdbc.queryForObject("""
                SELECT count(*) FROM organization_memberships
                WHERE user_id = ? AND organization_id = ? AND role = 'OWNER' AND is_default
                """, Integer.class, aliceId, aliceOrganization));

        String sharedProjectId = create(alice, "Shared", document("Shared", "alice")).get("id").asText();
        String bobProjectId = create(bob, "Private", document("Private", "bob")).get("id").asText();
        String publicKey = json.readTree(mvc.perform(approvedPublish(alice, sharedProjectId))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString())
                .get("publicKey").asText();

        mvc.perform(get("/projects/" + sharedProjectId).header("Authorization", "Bearer " + bob))
                .andExpect(status().isNotFound());
        mvc.perform(patch("/projects/" + sharedProjectId).header("Authorization", "Bearer " + bob)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, document("Shared", "intruder"))))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/projects/" + sharedProjectId).header("Authorization", "Bearer " + bob))
                .andExpect(status().isNotFound());
        mvc.perform(get("/projects/" + sharedProjectId + "/publication")
                        .header("Authorization", "Bearer " + bob))
                .andExpect(status().isNotFound());
        mvc.perform(post("/projects/" + sharedProjectId + "/publication")
                        .header("Authorization", "Bearer " + bob))
                .andExpect(status().isNotFound());
        mvc.perform(patch("/projects/" + sharedProjectId + "/publication")
                        .header("Authorization", "Bearer " + bob)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/projects/" + sharedProjectId + "/publication/analytics")
                        .header("Authorization", "Bearer " + bob))
                .andExpect(status().isNotFound());
        mvc.perform(get("/projects/" + sharedProjectId + "/publication/submissions")
                        .header("Authorization", "Bearer " + bob))
                .andExpect(status().isOk())
                .andDo(result -> assertEquals(0,
                        json.readTree(result.getResponse().getContentAsString()).get("items").size()));
        mvc.perform(get("/publications").header("Authorization", "Bearer " + bob))
                .andExpect(status().isOk())
                .andDo(result -> assertEquals(0,
                        json.readTree(result.getResponse().getContentAsString()).get("items").size()));
        mvc.perform(get("/projects").header("Authorization", "Bearer " + bob))
                .andExpect(status().isOk())
                .andDo(result -> assertEquals(1,
                        json.readTree(result.getResponse().getContentAsString()).get("items").size()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM publications WHERE public_key = ?",
                Integer.class, publicKey));

        jdbc.update("UPDATE organization_memberships SET is_default = false WHERE user_id = ?", bobId);
        jdbc.update("""
                INSERT INTO organization_memberships (organization_id, user_id, role, is_default, created_at)
                VALUES (?, ?, 'MEMBER', true, LOCALTIMESTAMP)
                """, aliceOrganization, bobId);
        jdbc.update("""
                INSERT INTO organization_permission_grants
                    (id, beneficiary_user_id, organization_id, action, scope_type, scope_id,
                     issuer_user_id, state, can_delegate, created_at)
                SELECT gen_random_uuid(), ?, ?, action, 'ORGANIZATION', ?, ?, 'ACTIVE', false, now()
                FROM (VALUES
                    ('PROJECT_READ'), ('PROJECT_CREATE'), ('PROJECT_UPDATE'), ('PROJECT_DELETE'),
                    ('THEME_READ'), ('THEME_CREATE'), ('THEME_UPDATE'), ('THEME_DELETE'),
                    ('PUBLICATION_READ'), ('PUBLICATION_MANAGE'), ('PUBLICATION_ANALYTICS_READ'),
                    ('PUBLICATION_SUBMISSIONS_READ'), ('PUBLICATION_ACTIVITY_READ'),
                    ('ORGANIZATION_GRANTS_READ')
                ) permissions(action)
                """, bobId, aliceOrganization, aliceOrganization, aliceId);
        mvc.perform(get("/projects/" + sharedProjectId).header("Authorization", "Bearer " + bob))
                .andExpect(status().isOk());
        mvc.perform(get("/projects").header("Authorization", "Bearer " + bob))
                .andExpect(status().isOk())
                .andDo(result -> {
                    JsonNode items = json.readTree(result.getResponse().getContentAsString()).get("items");
                    assertEquals(1, items.size());
                    assertEquals(sharedProjectId, items.get(0).get("id").asText());
                });
        mvc.perform(get("/projects/" + sharedProjectId + "/publication")
                        .header("Authorization", "Bearer " + bob))
                .andExpect(status().isOk());
        mvc.perform(patch("/projects/" + sharedProjectId).header("Authorization", "Bearer " + bob)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, document("Shared", "updated by member"))))
                .andExpect(status().isOk());
        mvc.perform(get("/projects/" + sharedProjectId).header("Authorization", "Bearer " + alice))
                .andExpect(status().isOk())
                .andDo(result -> assertEquals("updated by member",
                        json.readTree(result.getResponse().getContentAsString())
                                .get("document").get("futureField").asText()));

        jdbc.update("UPDATE organization_memberships SET is_default = false WHERE user_id = ?", bobId);
        jdbc.update("UPDATE organization_memberships SET is_default = true WHERE user_id = ? AND organization_id = ?",
                bobId, bobOrganization);
        mvc.perform(get("/projects/" + sharedProjectId).header("Authorization", "Bearer " + bob))
                .andExpect(status().isNotFound());
        mvc.perform(get("/projects/" + bobProjectId).header("Authorization", "Bearer " + bob))
                .andExpect(status().isOk());
        jdbc.update("DELETE FROM organization_memberships WHERE user_id = ?", bobId);
        mvc.perform(get("/projects").header("Authorization", "Bearer " + bob))
                .andExpect(status().isForbidden());
    }

    @Test
    void migrationAndAuthenticatedProjectLifecycle() throws Exception {
        assertEquals(
                "SQL",
                jdbc.queryForObject(
                        "SELECT type FROM flyway_schema_history WHERE version = '1'",
                        String.class));
        assertEquals(
                "SQL",
                jdbc.queryForObject(
                        "SELECT type FROM flyway_schema_history WHERE version = '2'",
                        String.class));
        assertEquals(
                1,
                jdbc.queryForObject(
                        "SELECT count(*) FROM pg_indexes WHERE indexname ="
                                + " 'idx_projects_owner_updated'",
                        Integer.class));
        assertEquals(
                1,
                jdbc.queryForObject(
                        "SELECT count(*) FROM pg_constraint WHERE conname = 'fk_projects_owner'",
                        Integer.class));

        String alice = register();
        String bob = register();
        String doc = document("Alpha", "hello");
        JsonNode created = create(alice, "Alpha", doc);
        String id = created.get("id").asText();
        assertEquals(1, created.get("revision").asLong());
        assertEquals("hello", created.get("document").get("futureField").asText());
        assertEquals(
                1,
                jdbc.queryForObject(
                        "SELECT count(*) FROM projects WHERE id = ? AND document->>'futureField' ="
                                + " 'hello'",
                        Integer.class,
                        UUID.fromString(id)));

        JsonNode second = create(alice, "Beta", document("Beta", "second"));
        mvc.perform(get("/projects").header("Authorization", "Bearer " + bob))
                .andExpect(status().isOk())
                .andDo(
                        result ->
                                assertEquals(
                                        0,
                                        json.readTree(result.getResponse().getContentAsString())
                                                .get("items").size()));
        JsonNode listing =
                json.readTree(
                        mvc.perform(get("/projects").header("Authorization", "Bearer " + alice))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        JsonNode projectItems = listing.get("items");
        assertEquals(2, projectItems.size());
        assertEquals(second.get("id").asText(), projectItems.get(0).get("id").asText());
        assertFalse(projectItems.get(0).has("document"));
        assertNotNull(projectItems.get(0).get("createdAt"));
        mvc.perform(get("/projects/" + id).header("Authorization", "Bearer " + bob))
                .andExpect(status().isNotFound());
        mvc.perform(
                        patch("/projects/" + id)
                                .header("Authorization", "Bearer " + bob)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(update(1, document("Alpha", "intruder"))))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/projects/" + id).header("Authorization", "Bearer " + bob))
                .andExpect(status().isNotFound());

        JsonNode loaded =
                json.readTree(
                        mvc.perform(
                                        get("/projects/" + id)
                                                .header("Authorization", "Bearer " + alice))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        assertEquals(created.get("document"), loaded.get("document"));
        JsonNode updated =
                json.readTree(
                        mvc.perform(
                                        patch("/projects/" + id)
                                                .header("Authorization", "Bearer " + alice)
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(update(1, document("Alpha", "new value"))))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        assertEquals(2, updated.get("revision").asLong());
        mvc.perform(
                        patch("/projects/" + id)
                                .header("Authorization", "Bearer " + alice)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(update(1, document("Alpha", "stale"))))
                .andExpect(status().isConflict());

        JsonNode renamed =
                json.readTree(
                        mvc.perform(
                                        patch("/projects/" + id + "/name")
                                                .header("Authorization", "Bearer " + alice)
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        json.writeValueAsString(
                                                                Map.of(
                                                                        "revision",
                                                                        2,
                                                                        "name",
                                                                        "Renamed"))))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        assertEquals(3, renamed.get("revision").asLong());
        assertEquals("Renamed", renamed.get("document").get("name").asText());
        assertEquals("new value", renamed.get("document").get("futureField").asText());
        mvc.perform(
                        patch("/projects/" + id + "/name")
                                .header("Authorization", "Bearer " + alice)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of("revision", 2, "name", "Stale"))))
                .andExpect(status().isConflict());

        mvc.perform(delete("/projects/" + id).header("Authorization", "Bearer " + alice))
                .andExpect(status().isNoContent());
        mvc.perform(get("/projects/" + id).header("Authorization", "Bearer " + alice))
                .andExpect(status().isNotFound());
        assertEquals(
                0,
                jdbc.queryForObject(
                        "SELECT count(*) FROM projects WHERE id = ?",
                        Integer.class,
                        UUID.fromString(id)));
    }

    @Test
    void projectDocumentContractRejectsInvalidStructureAndPersistsUnknownBlocksVerbatim() throws Exception {
        String owner = register();
        JsonNode legacyDocument = json.readTree(document("Opaque", "future field"));
        String document = legacyDocument.toString()
                .replace("\"props\":{\"unknown\":42}",
                        "\"props\":{\"unknown\":42,\"nested\":{\"values\":[true,7]}},"
                                + "\"futureMetadata\":{\"catalogVersion\":2}");
        JsonNode expected = json.readTree(document);
        JsonNode created = create(owner, "Opaque", document);
        assertEquals(expected, created.get("document"));

        JsonNode loaded = json.readTree(mvc.perform(get("/projects/" + created.get("id").asText())
                        .header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(expected, loaded.get("document"));
        mvc.perform(patch("/projects/" + created.get("id").asText())
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, json.writeValueAsString(expected))))
                .andExpect(status().isOk());

        String duplicateId = document("Invalid", "duplicate")
                .replace("\"id\":\"block-1\"", "\"id\":\"page-1\"");
        mvc.perform(post("/projects").header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Invalid", "document", json.readTree(duplicateId)))))
                .andExpect(status().isBadRequest());

        String invalidBlock = document("Invalid", "props")
                .replace("\"props\":{\"unknown\":42}", "\"props\":[]");
        mvc.perform(post("/projects").header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Invalid", "document", json.readTree(invalidBlock)))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void concurrentProjectUpdatesWithSameRevisionAllowOnlyOneWrite() throws Exception {
        String token = register();
        mvc.perform(get("/projects")).andExpect(status().isUnauthorized());
        mvc.perform(get("/projects/not-a-uuid").header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        post("/projects")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{"))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        post("/projects")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "name",
                                                        "Invalid",
                                                        "document",
                                                        Map.of(
                                                                "version",
                                                                1,
                                                                "pages",
                                                                new Object[0])))))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        post("/projects")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "name",
                                                        "Wrong",
                                                        "document",
                                                        json.readTree(
                                                                document("Different", "value"))))))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        post("/projects")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "name",
                                                        " ",
                                                        "document",
                                                        json.readTree(
                                                                document("Different", "value"))))))
                .andExpect(status().isBadRequest());
        JsonNode project = create(token, "Concurrent", document("Concurrent", "before"));
        String id = project.get("id").asText();
        mvc.perform(
                        patch("/projects/" + id)
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "document",
                                                        json.readTree(
                                                                document(
                                                                        "Concurrent",
                                                                        "missing revision"))))))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        patch("/projects/" + id)
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(update(0, document("Concurrent", "invalid revision"))))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        patch("/projects/" + id + "/name")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of("revision", 1, "name", " "))))
                .andExpect(status().isBadRequest());

        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            CompletableFuture<Integer> first =
                    CompletableFuture.supplyAsync(
                            () -> updateStatus(start, token, id, "first"), executor);
            CompletableFuture<Integer> second =
                    CompletableFuture.supplyAsync(
                            () -> updateStatus(start, token, id, "second"), executor);
            start.countDown();
            int a = first.join();
            int b = second.join();
            assertTrue((a == 200 && b == 409) || (a == 409 && b == 200));
        }
        JsonNode stored =
                json.readTree(
                        mvc.perform(
                                        get("/projects/" + id)
                                                .header("Authorization", "Bearer " + token))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        assertEquals(2, stored.get("revision").asLong());
    }

    private int updateStatus(CountDownLatch start, String token, String id, String value) {
        try {
            start.await();
            return mvc.perform(
                            patch("/projects/" + id)
                                    .header("Authorization", "Bearer " + token)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(update(1, document("Concurrent", value))))
                    .andReturn()
                    .getResponse()
                    .getStatus();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void publicationsKeepThreeRecentVersionNumbersAndProtectManagement() throws Exception {
        String owner = register();
        String outsider = register();
        String id = create(owner, "Published", document("Published", "first")).get("id").asText();

        mvc.perform(post("/projects/" + id + "/publication").header("Authorization", "Bearer " + outsider))
                .andExpect(status().isNotFound());
        JsonNode first = json.readTree(mvc.perform(approvedPublish(owner, id)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        String key = first.get("publicKey").asText();
        assertEquals(1, first.get("currentVersion").asInt());
        JsonNode publicContract = json.readTree(mvc.perform(get("/public/" + key + "/home"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals("first", publicContract.get("document").get("futureField").asText());
        assertFalse(publicContract.has("projectRevisionId"));
        mvc.perform(post("/public/" + key + "/interaction")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"click\",\"path\":\"/home\",\"target\":\"a: Example\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/projects/" + id + "/publication/analytics")
                .header("Authorization", "Bearer " + outsider)).andExpect(status().isNotFound());
        JsonNode analytics = json.readTree(mvc.perform(get("/projects/" + id + "/publication/analytics")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertEquals(2, analytics.get("recent").get("items").size());
        assertEquals("click", analytics.get("recent").get("items").get(0).get("type").asText());

        for (int version = 2; version <= 4; version++) {
            JsonNode latest = json.readTree(mvc.perform(get("/projects/" + id)
                    .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString());
            mvc.perform(patch("/projects/" + id).header("Authorization", "Bearer " + owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(update(latest.get("revision").asLong(), document("Published", "v" + version))))
                    .andExpect(status().isOk());
            mvc.perform(approvedPublish(owner, id)).andExpect(status().isOk());
        }
        JsonNode current = json.readTree(mvc.perform(get("/projects/" + id + "/publication")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertEquals(3, current.get("versions").size());
        assertEquals(4, current.get("currentVersion").asInt());
        assertEquals(key, current.get("publicKey").asText());
        mvc.perform(post("/projects/" + id + "/publication/versions/1/restore")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isNotFound());
        mvc.perform(post("/projects/" + id + "/publication/versions/2/restore")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isForbidden());
        mvc.perform(approvedRestore(owner, id, 2)).andExpect(status().isOk());
        assertEquals("v2", json.readTree(mvc.perform(get("/public/" + key + "/home"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString())
                .get("document").get("futureField").asText());
        mvc.perform(patch("/projects/" + id + "/publication")
                .header("Authorization", "Bearer " + owner)
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
                .andExpect(status().isOk());
        mvc.perform(get("/public/" + key + "/home")).andExpect(status().isNotFound());
    }

    @Test
    void publicationRequiresAOneTimeReviewByAnotherPersonAndDoesNotBackfillOwnerAuthority() throws Exception {
        String owner = register();
        UUID ownerId = UUID.fromString(jwtDecoder.decode(owner).getSubject());
        UUID organizationId = defaultOrganization(ownerId);
        String projectId = create(owner, "Review gate", document("Review gate", "approved revision"))
                .get("id").asText();

        assertEquals(0, jdbc.queryForObject("""
                SELECT count(*) FROM organization_permission_grants
                WHERE organization_id = ? AND beneficiary_user_id = ? AND action = 'PUBLICATION_APPROVE'
                """, Integer.class, organizationId, ownerId));
        UUID managementAuthority = jdbc.queryForObject("""
                SELECT id FROM organization_permission_grants
                WHERE organization_id = ? AND beneficiary_user_id = ?
                  AND action = 'ORGANIZATION_GRANTS_MANAGE' AND state = 'ACTIVE'
                ORDER BY created_at LIMIT 1
                """, UUID.class, organizationId, ownerId);
        mvc.perform(post("/organizations/" + organizationId + "/grants")
                        .header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("beneficiaryUserId", ownerId,
                                "action", "PUBLICATION_APPROVE", "scopeType", "ORGANIZATION",
                                "scopeId", organizationId, "canDelegate", false,
                                "authorityGrantId", managementAuthority))))
                .andExpect(status().isCreated());
        mvc.perform(post("/projects/" + projectId + "/publication").header("Authorization", "Bearer " + owner))
                .andExpect(status().isForbidden());

        UUID revisionId = jdbc.queryForObject("""
                SELECT r.id FROM project_revisions r JOIN projects p ON p.id = r.project_id
                WHERE p.id = ? AND r.revision_kind = 'DRAFT' AND r.revision_number = p.revision
                """, UUID.class, UUID.fromString(projectId));
        JsonNode selfReview = json.readTree(mvc.perform(post("/projects/" + projectId + "/publication/review-requests")
                        .header("Authorization", "Bearer " + owner).header("X-Organization-Id", organizationId)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                                "projectRevisionId", revisionId, "operation", "PUBLISH"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        mvc.perform(post("/projects/" + projectId + "/publication/review-requests/"
                        + selfReview.path("id").asText() + "/decision")
                        .header("Authorization", "Bearer " + owner).header("X-Organization-Id", organizationId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":true}"))
                .andExpect(status().isForbidden());
        UUID requestId = requestAndApprove(owner, projectId, organizationId, revisionId, "PUBLISH", null);
        String requestBody = json.writeValueAsString(Map.of("reviewRequestId", requestId));
        JsonNode published = json.readTree(mvc.perform(post("/projects/" + projectId + "/publication")
                        .header("Authorization", "Bearer " + owner).header("X-Organization-Id", organizationId)
                        .contentType(MediaType.APPLICATION_JSON).content(requestBody))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(1, published.path("currentVersion").asInt());
        assertTrue(published.path("active").asBoolean());
        mvc.perform(post("/projects/" + projectId + "/publication")
                        .header("Authorization", "Bearer " + owner).header("X-Organization-Id", organizationId)
                        .contentType(MediaType.APPLICATION_JSON).content(requestBody))
                .andExpect(status().isForbidden());
        JsonNode unchanged = json.readTree(mvc.perform(get("/projects/" + projectId + "/publication")
                        .header("Authorization", "Bearer " + owner).header("X-Organization-Id", organizationId))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(1, unchanged.path("currentVersion").asInt());
        assertTrue(unchanged.path("active").asBoolean());
    }

    @Test
    void publicationReviewQueueAllowsReadOnlyWithoutDecisionAuthority() throws Exception {
        String requester = register();
        UUID requesterId = UUID.fromString(jwtDecoder.decode(requester).getSubject());
        UUID organizationId = defaultOrganization(requesterId);
        String projectId = create(requester, "Privado", document("Privado", "conteúdo privado"))
                .path("id").asText();
        UUID project = UUID.fromString(projectId);
        UUID revisionId = currentDraftRevision(project);
        JsonNode request = json.readTree(mvc.perform(post("/projects/" + projectId + "/publication/review-requests")
                        .header("Authorization", "Bearer " + requester)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("projectRevisionId", revisionId,
                                "operation", "PUBLISH"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String unrelatedProjectId = create(requester, "Outro projeto", document("Outro projeto", "fora do escopo"))
                .path("id").asText();
        UUID unrelatedRevision = currentDraftRevision(UUID.fromString(unrelatedProjectId));
        mvc.perform(post("/projects/" + unrelatedProjectId + "/publication/review-requests")
                        .header("Authorization", "Bearer " + requester)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("projectRevisionId", unrelatedRevision,
                                "operation", "PUBLISH"))))
                .andExpect(status().isCreated());

        String reviewer = register();
        UUID reviewerId = UUID.fromString(jwtDecoder.decode(reviewer).getSubject());
        jdbc.update("""
                INSERT INTO organization_memberships (organization_id, user_id, role, is_default, created_at)
                VALUES (?, ?, 'MEMBER', false, LOCALTIMESTAMP)
                """, organizationId, reviewerId);
        UUID authorityId = jdbc.queryForObject("""
                SELECT id FROM organization_permission_grants
                WHERE organization_id = ? AND beneficiary_user_id = ?
                  AND action = 'ORGANIZATION_GRANTS_MANAGE' AND state = 'ACTIVE'
                ORDER BY created_at LIMIT 1
                """, UUID.class, organizationId, requesterId);
        mvc.perform(post("/organizations/" + organizationId + "/grants")
                        .header("Authorization", "Bearer " + requester).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("beneficiaryUserId", reviewerId,
                                "action", "PUBLICATION_APPROVE", "scopeType", "PROJECT",
                                "scopeId", project, "canDelegate", false, "authorityGrantId", authorityId))))
                .andExpect(status().isCreated());

        mvc.perform(get("/publication/review-requests")
                        .header("Authorization", "Bearer " + reviewer)
                        .header("X-Organization-Id", organizationId))
                .andExpect(status().isOk())
                .andDo(result -> {
                    JsonNode inbox = json.readTree(result.getResponse().getContentAsString());
                    assertEquals(1, inbox.size());
                    assertEquals(request.path("id").asText(), inbox.get(0).path("id").asText());
                    assertEquals("Privado", inbox.get(0).path("projectName").asText());
                    assertTrue(inbox.get(0).path("canDecide").asBoolean());
                    assertEquals(projectId, inbox.get(0).path("projectId").asText());
                    assertTrue(inbox.get(0).path("document").isMissingNode());
                    assertTrue(inbox.get(0).path("publication").isMissingNode());
                });
        mvc.perform(get("/projects/" + projectId + "/publication")
                        .header("Authorization", "Bearer " + reviewer)
                        .header("X-Organization-Id", organizationId))
                .andExpect(status().isForbidden());
        mvc.perform(get("/projects/" + projectId + "/publication/review-requests/"
                        + request.path("id").asText() + "/preview")
                        .header("Authorization", "Bearer " + reviewer)
                        .header("X-Organization-Id", organizationId))
                .andExpect(status().isOk())
                .andDo(result -> {
                    JsonNode preview = json.readTree(result.getResponse().getContentAsString());
                    assertEquals(1, preview.path("projectRevision").asLong());
                    assertEquals("conteúdo privado", preview.path("document").path("futureField").asText());
                    assertTrue(preview.path("publication").isMissingNode());
                });

        String otherOwner = register();
        UUID otherOrganizationId = defaultOrganization(UUID.fromString(jwtDecoder.decode(otherOwner).getSubject()));
        String otherProjectId = create(otherOwner, "Outro", document("Outro", "conteúdo de outro tenant"))
                .path("id").asText();
        mvc.perform(get("/publication/review-requests")
                        .header("Authorization", "Bearer " + reviewer)
                        .header("X-Organization-Id", otherOrganizationId))
                .andExpect(status().isForbidden());
        mvc.perform(get("/projects/" + otherProjectId + "/publication/review-requests")
                        .header("Authorization", "Bearer " + reviewer)
                        .header("X-Organization-Id", organizationId))
                .andExpect(status().isNotFound());
        mvc.perform(get("/projects/" + otherProjectId + "/publication/review-requests/"
                        + request.path("id").asText() + "/preview")
                        .header("Authorization", "Bearer " + reviewer)
                        .header("X-Organization-Id", organizationId))
                .andExpect(status().isNotFound());

        String reader = register();
        UUID readerId = UUID.fromString(jwtDecoder.decode(reader).getSubject());
        jdbc.update("""
                INSERT INTO organization_memberships (organization_id, user_id, role, is_default, created_at)
                VALUES (?, ?, 'MEMBER', false, LOCALTIMESTAMP)
                """, organizationId, readerId);
        jdbc.update("""
                INSERT INTO organization_permission_grants
                    (id, beneficiary_user_id, organization_id, action, scope_type, scope_id,
                     issuer_user_id, state, can_delegate, created_at)
                VALUES (?, ?, ?, 'PUBLICATION_READ', 'PROJECT', ?, ?, 'ACTIVE', false, now())
                """, UUID.randomUUID(), readerId, organizationId, project, requesterId);

        mvc.perform(get("/projects/" + projectId + "/publication/review-requests")
                        .header("Authorization", "Bearer " + reader)
                        .header("X-Organization-Id", organizationId))
                .andExpect(status().isOk())
                .andDo(result -> {
                    JsonNode requests = json.readTree(result.getResponse().getContentAsString());
                    assertEquals(1, requests.size());
                    assertFalse(requests.get(0).path("canDecide").asBoolean());
                    assertTrue(requests.get(0).path("document").isMissingNode());
                    assertTrue(requests.get(0).path("preview").isMissingNode());
                });
        mvc.perform(get("/publication/review-requests")
                        .header("Authorization", "Bearer " + reader)
                        .header("X-Organization-Id", organizationId))
                .andExpect(status().isForbidden());
        mvc.perform(post("/projects/" + projectId + "/publication/review-requests/"
                        + request.path("id").asText() + "/decision")
                        .header("Authorization", "Bearer " + reader)
                        .header("X-Organization-Id", organizationId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":true}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/projects/" + projectId + "/publication/review-requests/"
                        + request.path("id").asText() + "/preview")
                        .header("Authorization", "Bearer " + reader)
                        .header("X-Organization-Id", organizationId))
                .andExpect(status().isForbidden());
        assertEquals(0, jdbc.queryForObject("""
                SELECT count(*) FROM organization_permission_grants
                WHERE organization_id = ? AND beneficiary_user_id = ? AND action = 'PUBLICATION_APPROVE'
                """, Integer.class, organizationId, readerId));

        mvc.perform(post("/projects/" + projectId + "/publication/review-requests/"
                        + request.path("id").asText() + "/decision")
                        .header("Authorization", "Bearer " + reviewer)
                        .header("X-Organization-Id", organizationId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":true}"))
                .andExpect(status().isOk());
        mvc.perform(get("/publication/review-requests")
                        .header("Authorization", "Bearer " + reviewer)
                        .header("X-Organization-Id", organizationId))
                .andExpect(status().isOk()).andDo(result -> assertEquals(0,
                        json.readTree(result.getResponse().getContentAsString()).size()));
    }

    @Test
    void draftHistoryIsPaginatedAppendOnlyAndDoesNotChangePublishedSnapshot() throws Exception {
        String owner = register();
        String outsider = register();
        String id = create(owner, "Versioned", document("Versioned", "draft one")).get("id").asText();
        UUID ownerId = UUID.fromString(jwtDecoder.decode(owner).getSubject());
        UUID organizationId = defaultOrganization(ownerId);
        String reader = register();
        UUID readerId = UUID.fromString(jwtDecoder.decode(reader).getSubject());
        jdbc.update("""
                INSERT INTO organization_memberships (organization_id, user_id, role, is_default, created_at)
                VALUES (?, ?, 'MEMBER', false, LOCALTIMESTAMP)
                """, organizationId, readerId);
        jdbc.update("""
                INSERT INTO organization_permission_grants
                    (id, beneficiary_user_id, organization_id, action, scope_type, scope_id,
                     issuer_user_id, state, can_delegate, created_at)
                VALUES (gen_random_uuid(), ?, ?, 'PROJECT_READ', 'PROJECT', ?, ?, 'ACTIVE', false, now())
                """, readerId, organizationId, UUID.fromString(id), ownerId);
        JsonNode initialPublication = json.readTree(mvc.perform(approvedPublish(owner, id)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        String key = initialPublication.get("publicKey").asText();
        String firstRevisionId = initialPublication.get("versions").get(0).get("projectRevisionId").asText();
        mvc.perform(get("/projects/" + id + "/revisions")
                .header("Authorization", "Bearer " + outsider)).andExpect(status().isNotFound());
        mvc.perform(post("/projects/" + id + "/revisions/" + firstRevisionId + "/restore")
                .header("Authorization", "Bearer " + outsider)).andExpect(status().isNotFound());
        mvc.perform(get("/projects/" + id + "/revisions")
                .header("Authorization", "Bearer " + reader)
                .header("X-Organization-Id", organizationId.toString())).andExpect(status().isOk());
        mvc.perform(post("/projects/" + id + "/revisions/" + firstRevisionId + "/restore")
                .header("Authorization", "Bearer " + reader)
                .header("X-Organization-Id", organizationId.toString())).andExpect(status().isForbidden());

        mvc.perform(patch("/projects/" + id).header("Authorization", "Bearer " + owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(update(1, document("Versioned", "draft two"))))
                .andExpect(status().isOk());
        JsonNode publicPageAfterSave = json.readTree(mvc.perform(get("/public/" + key + "/home"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals("draft one", publicPageAfterSave.get("document").get("futureField").asText());
        assertFalse(publicPageAfterSave.has("projectRevisionId"));

        JsonNode firstHistoryPage = json.readTree(mvc.perform(get("/projects/" + id + "/revisions?page=0&size=1")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertEquals(2, firstHistoryPage.get("totalElements").asInt());
        assertEquals(2, firstHistoryPage.get("items").get(0).get("revision").asInt());
        assertTrue(firstHistoryPage.get("hasNext").asBoolean());
        JsonNode secondHistoryPage = json.readTree(mvc.perform(get("/projects/" + id + "/revisions?page=1&size=1")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertEquals(firstRevisionId, secondHistoryPage.get("items").get(0).get("id").asText());

        mvc.perform(post("/projects/" + id + "/revisions/" + firstRevisionId + "/restore")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk());
        JsonNode restoredProject = json.readTree(mvc.perform(get("/projects/" + id)
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertEquals(3, restoredProject.get("revision").asInt());
        assertEquals("draft one", restoredProject.get("document").get("futureField").asText());

        JsonNode allHistory = json.readTree(mvc.perform(get("/projects/" + id + "/revisions?page=0&size=10")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertEquals(3, allHistory.get("totalElements").asInt());
        assertEquals(3, allHistory.get("items").get(0).get("revision").asInt());
        assertEquals(2, allHistory.get("items").get(1).get("revision").asInt());
        assertEquals(1, allHistory.get("items").get(2).get("revision").asInt());

        JsonNode publication = json.readTree(mvc.perform(get("/projects/" + id + "/publication")
                .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertEquals(1, publication.get("currentVersion").asInt());
        assertEquals(firstRevisionId, publication.get("versions").get(0).get("projectRevisionId").asText());
        JsonNode publicPageAfterRestore = json.readTree(mvc.perform(get("/public/" + key + "/home"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals("draft one", publicPageAfterRestore.get("document").get("futureField").asText());
    }

    @Test
    void restoreDraftCanRevertTemplatePageAndRegionOriginsAsANewRevision() throws Exception {
        String owner = register();
        UUID organizationId = defaultOrganization(UUID.fromString(jwtDecoder.decode(owner).getSubject()));
        JsonNode firstVersion = createTemplate(owner, organizationId, "Modelo histórico",
                templateContent("Título v1", "Cabeçalho v1", "Rodapé v1"));
        JsonNode secondVersion = json.readTree(mvc.perform(post("/organizations/" + organizationId + "/templates/"
                        + firstVersion.path("id").asText() + "/versions")
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("expectedVersion", 1,
                                "content", templateContent("Título v2", "Cabeçalho v2", "Rodapé v2")))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());

        ObjectNode original = projectDocument(firstVersion);
        original.put("name", "Restaurar histórico");
        ObjectNode secondPage = json.createObjectNode();
        secondPage.put("id", "page-2");
        secondPage.put("name", "Sobre");
        secondPage.put("slug", "sobre");
        secondPage.set("blocks", json.createArrayNode());
        ((ArrayNode) original.path("pages")).add(secondPage);
        ((ArrayNode) original.path("navbar").path("props").path("items")).add(json.valueToTree(
                Map.of("id", "page-2", "title", "Sobre", "description", "", "href", "page:page-2",
                        "value", "", "features", List.of())));
        String projectId = create(owner, "Restaurar histórico", json.writeValueAsString(original))
                .path("id").asText();
        String originalRevisionId = json.readTree(mvc.perform(get("/projects/" + projectId + "/revisions")
                        .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).path("items").get(0).path("id").asText();

        ObjectNode withoutTemplatedPage = original.deepCopy();
        ((ArrayNode) withoutTemplatedPage.path("pages")).remove(0);
        withoutTemplatedPage.put("activePageId", "page-2");
        ((ArrayNode) withoutTemplatedPage.path("navbar").path("props").path("items")).remove(0);
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(1, json.writeValueAsString(withoutTemplatedPage))))
                .andExpect(status().isOk());

        JsonNode v2Content = json.valueToTree(templateContent("Título v2", "Cabeçalho v2", "Rodapé v2"));
        ObjectNode v2Page = json.createObjectNode();
        v2Page.put("id", "page-1-v2");
        v2Page.put("name", "Home v2");
        v2Page.put("slug", "home-v2");
        v2Page.set("blocks", v2Content.path("blocks").deepCopy());
        v2Page.set("templateOrigin", json.valueToTree(templateOrigin(secondVersion)));
        v2Page.set("composition", v2Content.path("composition").deepCopy());
        ObjectNode withTemplatedPageV2 = withoutTemplatedPage.deepCopy();
        ((ArrayNode) withTemplatedPageV2.path("pages")).add(v2Page);
        ((ArrayNode) withTemplatedPageV2.path("navbar").path("props").path("items")).add(json.valueToTree(
                Map.of("id", "page-1-v2", "title", "Home v2", "description", "", "href", "page:page-1-v2",
                        "value", "", "features", List.of())));
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(2, json.writeValueAsString(withTemplatedPageV2))))
                .andDo(result -> assertEquals(200, result.getResponse().getStatus(),
                        result.getResponse().getContentAsString()));
        mvc.perform(patch("/projects/" + projectId + "/regions/adoption")
                        .header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("revision", 3,
                                "templateId", firstVersion.path("id").asText(),
                                "versionId", secondVersion.path("versionId").asText(),
                                "regions", List.of("navbar", "footer")))))
                .andExpect(status().isOk());

        JsonNode restored = json.readTree(mvc.perform(post("/projects/" + projectId + "/revisions/"
                        + originalRevisionId + "/restore").header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(5, restored.path("revision").asInt());
        assertEquals("page-1", restored.path("document").path("pages").get(0).path("id").asText());
        assertEquals(firstVersion.path("versionId").asText(),
                restored.path("document").path("pages").get(0).path("templateOrigin").path("versionId").asText());
        assertEquals(firstVersion.path("versionId").asText(),
                restored.path("document").path("regionOrigins").path("navbar").path("versionId").asText());
        JsonNode history = json.readTree(mvc.perform(get("/projects/" + projectId + "/revisions?page=0&size=10")
                        .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertEquals(5, history.path("totalElements").asInt());
        assertEquals(1, history.path("items").get(4).path("revision").asInt());
    }

    @Test
    void expiredPublicationVersionPurgesOnlyItsUnreferencedSnapshot() throws Exception {
        String owner = register();
        String projectId = create(owner, "Retenção", document("Retenção", "v1")).path("id").asText();
        mvc.perform(approvedPublish(owner, projectId)).andExpect(status().isOk());
        JsonNode project = json.readTree(mvc.perform(get("/projects/" + projectId)
                        .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(project.path("revision").asLong(), document("Retenção", "v2"))))
                .andExpect(status().isOk());
        mvc.perform(approvedPublish(owner, projectId)).andExpect(status().isOk());

        UUID publicationId = jdbc.queryForObject("SELECT id FROM publications WHERE project_id = ?",
                UUID.class, UUID.fromString(projectId));
        UUID snapshotId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO project_revisions
                    (id, project_id, revision_number, revision_kind, document, route_blueprint, created_by)
                SELECT ?, p.project_id, v.project_revision, 'PUBLICATION_SNAPSHOT', v.document,
                       v.route_blueprint, pr.owner_id
                FROM publication_versions v
                JOIN publications p ON p.id = v.publication_id
                JOIN projects pr ON pr.id = p.project_id
                WHERE p.id = ? AND v.version_number = 1
                """, snapshotId, publicationId);
        jdbc.update("UPDATE publication_versions SET project_revision_id = ?, expires_at = now() - interval '1 second' WHERE publication_id = ? AND version_number = 1",
                snapshotId, publicationId);
        JsonNode latest = json.readTree(mvc.perform(get("/projects/" + projectId)
                        .header("Authorization", "Bearer " + owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        mvc.perform(patch("/projects/" + projectId).header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(update(latest.path("revision").asLong(), document("Retenção", "v3"))))
                .andExpect(status().isOk());
        int draftCount = jdbc.queryForObject("SELECT count(*) FROM project_revisions WHERE project_id = ? AND revision_kind = 'DRAFT'",
                Integer.class, UUID.fromString(projectId));
        mvc.perform(approvedPublish(owner, projectId)).andExpect(status().isOk());

        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM publication_versions WHERE publication_id = ? AND version_number = 1",
                Integer.class, publicationId));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM project_revisions WHERE id = ? AND revision_kind = 'PUBLICATION_SNAPSHOT'",
                Integer.class, snapshotId));
        assertEquals(draftCount, jdbc.queryForObject("SELECT count(*) FROM project_revisions WHERE project_id = ? AND revision_kind = 'DRAFT'",
                Integer.class, UUID.fromString(projectId)));
    }

    private MockHttpServletRequestBuilder approvedPublish(String requester, String projectId) throws Exception {
        UUID organizationId = jdbc.queryForObject("SELECT organization_id FROM projects WHERE id = ?",
                UUID.class, UUID.fromString(projectId));
        UUID revisionId = jdbc.queryForObject("""
                SELECT r.id FROM project_revisions r JOIN projects p ON p.id = r.project_id
                WHERE p.id = ? AND r.revision_kind = 'DRAFT' AND r.revision_number = p.revision
                """, UUID.class, UUID.fromString(projectId));
        return approvedPublicationOperation(requester, projectId, organizationId, revisionId, "PUBLISH", null);
    }

    private MockHttpServletRequestBuilder approvedRestore(String requester, String projectId, int version) throws Exception {
        UUID organizationId = jdbc.queryForObject("SELECT organization_id FROM projects WHERE id = ?",
                UUID.class, UUID.fromString(projectId));
        UUID revisionId = jdbc.queryForObject("""
                SELECT v.project_revision_id FROM publication_versions v
                JOIN publications p ON p.id = v.publication_id WHERE p.project_id = ? AND v.version_number = ?
                """, UUID.class, UUID.fromString(projectId), version);
        UUID requestId = requestAndApprove(requester, projectId, organizationId, revisionId, "RESTORE", version);
        return post("/projects/" + projectId + "/publication/versions/" + version + "/restore")
                .header("Authorization", "Bearer " + requester).header("X-Organization-Id", organizationId)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("reviewRequestId", requestId)));
    }

    private MockHttpServletRequestBuilder approvedPublicationOperation(String requester, String projectId,
            UUID organizationId, UUID revisionId, String operation, Integer targetVersion) throws Exception {
        UUID requestId = requestAndApprove(requester, projectId, organizationId, revisionId, operation, targetVersion);
        return post("/projects/" + projectId + "/publication")
                .header("Authorization", "Bearer " + requester).header("X-Organization-Id", organizationId)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("reviewRequestId", requestId)));
    }

    private UUID requestAndApprove(String requester, String projectId, UUID organizationId,
            UUID revisionId, String operation, Integer targetVersion) throws Exception {
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("projectRevisionId", revisionId);
        body.put("operation", operation);
        if (targetVersion != null) body.put("targetVersion", targetVersion);
        JsonNode request = json.readTree(mvc.perform(post("/projects/" + projectId + "/publication/review-requests")
                        .header("Authorization", "Bearer " + requester).header("X-Organization-Id", organizationId)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        UUID requestId = UUID.fromString(request.path("id").asText());
        Reviewer reviewer = publicationReviewers.computeIfAbsent(organizationId, ignored -> null);
        if (reviewer == null) {
            String reviewerToken = register();
            UUID reviewerId = UUID.fromString(jwtDecoder.decode(reviewerToken).getSubject());
            jdbc.update("""
                    INSERT INTO organization_memberships (organization_id, user_id, role, is_default, created_at)
                    VALUES (?, ?, 'MEMBER', false, LOCALTIMESTAMP)
                    """, organizationId, reviewerId);
            UUID authorityId = jdbc.queryForObject("""
                    SELECT id FROM organization_permission_grants
                    WHERE organization_id = ? AND beneficiary_user_id = ? AND action = 'ORGANIZATION_GRANTS_MANAGE'
                      AND state = 'ACTIVE' ORDER BY created_at LIMIT 1
                    """, UUID.class, organizationId, UUID.fromString(jwtDecoder.decode(requester).getSubject()));
            Map<String, Object> grant = Map.of("beneficiaryUserId", reviewerId, "action", "PUBLICATION_APPROVE",
                    "scopeType", "ORGANIZATION", "scopeId", organizationId, "canDelegate", false,
                    "authorityGrantId", authorityId);
            mvc.perform(post("/organizations/" + organizationId + "/grants")
                            .header("Authorization", "Bearer " + requester).contentType(MediaType.APPLICATION_JSON)
                            .content(json.writeValueAsString(grant)))
                    .andExpect(status().isCreated());
            mvc.perform(get("/projects/" + projectId + "/publication/review-requests")
                            .header("Authorization", "Bearer " + reviewerToken)
                            .header("X-Organization-Id", organizationId))
                    .andExpect(status().isOk())
                    .andDo(result -> {
                        JsonNode requests = json.readTree(result.getResponse().getContentAsString());
                        JsonNode listed = null;
                        for (JsonNode item : requests)
                            if (requestId.toString().equals(item.path("id").asText())) listed = item;
                        assertNotNull(listed);
                        assertTrue(listed.path("canDecide").asBoolean());
                        assertTrue(listed.path("document").isMissingNode());
                    });
            reviewer = new Reviewer(reviewerToken, reviewerId);
            publicationReviewers.put(organizationId, reviewer);
        }
        mvc.perform(post("/projects/" + projectId + "/publication/review-requests/" + requestId + "/decision")
                        .header("Authorization", "Bearer " + reviewer.token())
                        .header("X-Organization-Id", organizationId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\":true}"))
                .andExpect(status().isOk());
        return requestId;
    }

    private String register() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String ip = "127.0.1." + SIGNUP_IP_SEQUENCE.incrementAndGet();
        mvc.perform(
                        post("/auth/signup/start")
                                .with(request -> {
                                    request.setRemoteAddr(ip);
                                    return request;
                                })
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isAccepted());
        String token = inbox.token(email, "Confirme seu e-mail");
        JsonNode result =
                json.readTree(
                        mvc.perform(
                                        post("/auth/signup/complete")
                                                .with(request -> {
                                                    request.setRemoteAddr(ip);
                                                    return request;
                                                })
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        json.writeValueAsString(
                                                                Map.of(
                                                                        "token",
                                                                        token,
                                                                        "firstName",
                                                                        "Test",
                                                                        "lastName",
                                                                        "User",
                                                                        "password",
                                                                        "StrongPass1!",
                                                                        "acceptTerms",
                                                                        true))))
                                .andExpect(status().isCreated())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        return result.get("accessToken").asText();
    }

    private UUID defaultOrganization(UUID userId) {
        return jdbc.queryForObject(
                "SELECT organization_id FROM organization_memberships WHERE user_id = ? AND is_default",
                UUID.class, userId);
    }

    private JsonNode createTemplate(String token, UUID organizationId, String name,
            Map<String, Object> content) throws Exception {
        return json.readTree(mvc.perform(post("/organizations/" + organizationId + "/templates")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", name, "content", content))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }

    private Map<String, Object> templateContent(String title, String header, String footer) {
        Map<String, Object> regions = Map.of(
                "navbar", block("header-block", "navbar-classic",
                        Map.of("title", header, "items", List.of())),
                "footer", block("footer-block", "footer-classic", Map.of("title", footer)));
        return Map.of(
                "blocks", List.of(block("model-block", "hero-classic", Map.of("title", title))),
                "composition", Map.of("allowedDefinitionIds", List.of("hero-classic"),
                        "protectedRegions", List.of("navbar", "footer")),
                "regions", regions);
    }

    private Map<String, Object> block(String id, String definitionId, Map<String, Object> props) {
        return Map.of("id", id, "definitionId", definitionId, "props", props);
    }

    private Map<String, Object> templateOrigin(JsonNode template) {
        return Map.of("source", "ORGANIZATION", "templateId", template.path("id").asText(),
                "versionId", template.path("versionId").asText(), "version", template.path("version").asInt());
    }

    private ObjectNode projectDocument(JsonNode template) throws Exception {
        JsonNode content = template.path("content");
        Map<String, Object> page = Map.of(
                "id", "page-1", "name", "Home", "slug", "home",
                "blocks", content.path("blocks"), "templateOrigin", templateOrigin(template),
                "composition", content.path("composition"));
        Map<String, Object> navItems = Map.of("id", "page-1", "title", "Home", "description", "",
                "href", "page:page-1", "value", "", "features", List.of());
        ObjectNode document = (ObjectNode) json.readTree(json.writeValueAsString(Map.of(
                "version", 1, "name", "Composição", "activePageId", "page-1", "pages", List.of(page),
                "navbar", content.path("regions").path("navbar"),
                "footer", content.path("regions").path("footer"),
                "regionOrigins", Map.of("navbar", templateOrigin(template), "footer", templateOrigin(template)))));
        ((ObjectNode) document.path("navbar").path("props")).set("items", json.valueToTree(List.of(navItems)));
        return document;
    }

    private JsonNode create(String token, String name, String document) throws Exception {
        var result = mvc.perform(post("/projects")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "name", name, "document", json.readTree(document)))))
                .andReturn();
        String body = result.getResponse().getContentAsString();
        assertEquals(201, result.getResponse().getStatus(), body);
        return json.readTree(body);
    }

    private String update(long revision, String document) throws Exception {
        return json.writeValueAsString(
                Map.of("revision", revision, "document", json.readTree(document)));
    }

    private String document(String name, String futureField) throws Exception {
        return json.writeValueAsString(
                Map.of(
                        "version",
                        1,
                        "name",
                        name,
                        "futureField",
                        futureField,
                        "activePageId",
                        "page-1",
                        "pages",
                        new Object[] {
                            Map.of(
                                    "id",
                                    "page-1",
                                    "name",
                                    "Home",
                                    "blocks",
                                    new Object[] {
                                        Map.of(
                                                "id",
                                                "block-1",
                                                "definitionId",
                                                "future-block",
                                                "props",
                                                Map.of("unknown", 42))
                                    })
                        }));
    }
}

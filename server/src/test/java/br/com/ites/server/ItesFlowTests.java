package br.com.ites.server;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Import({TestcontainersConfiguration.class, RecordingMailGateway.class})
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "auth.jwt.secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    "auth.totp-encryption-key=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    "auth.refresh-reuse-grace=PT0S"
})
class ItesFlowTests {
    private static final AtomicInteger IP_SEQUENCE = new AtomicInteger();
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired RecordingMailGateway.Inbox inbox;
    @Autowired br.com.ites.server.services.Ites.InstitutionalHomeProvisioner institutionalHome;
    @Autowired br.com.ites.server.services.Ites.RootProjectProvisioner rootProvisioner;

    @Test
    void requesterDemandIsPrivateAndAdminDecisionIsAudited() throws Exception {
        String requester = register();
        String other = register();
        String admin = register();
        UUID adminId = userId(admin);
        UUID adminRole = jdbc.queryForObject("SELECT id FROM app_roles WHERE code='ADMINISTRATOR'", UUID.class);
        jdbc.update("INSERT INTO app_user_roles(user_id,role_id) VALUES(?,?)", adminId, adminRole);

        String created = mvc.perform(post("/ites/demands").header("Authorization", requester)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("capacity","OTHER","capacityOther","Moradora","service","Formação","description","Solicito oficina de gestão coletiva","urgency","HIGH"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        JsonNode demand = json.readTree(created);
        assertTrue(demand.get("code").asText().startsWith("ITES-"));
        assertEquals("Pendente", demand.get("status").asText());
        mvc.perform(get("/ites/demands/" + demand.get("id").asText()).header("Authorization", other))
                .andExpect(status().isNotFound());
        mvc.perform(get("/ites/demands/review").header("Authorization", requester))
                .andExpect(status().isForbidden());
        mvc.perform(post("/ites/demands/" + demand.get("id").asText() + "/decision").header("Authorization", requester)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("status","Aceita para atendimento","justification","Aprovada"))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/ites/demands/" + demand.get("id").asText() + "/decision").header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("status","Aceita para atendimento","justification","A equipe prestará atendimento"))))
                .andExpect(status().isOk());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM demand_events WHERE demand_id=? AND actor_id=?", Integer.class,
                UUID.fromString(demand.get("id").asText()), adminId));
        String own = mvc.perform(get("/ites/demands").header("Authorization", requester)).andReturn().getResponse().getContentAsString();
        assertTrue(own.contains("Aceita para atendimento"));
    }

    @Test
    void rootProjectSeparatesDraftAndPublicationAndRequiresAdministrator() throws Exception {
        String requester = register();
        String admin = register();
        UUID adminId = userId(admin);
        UUID roleId = jdbc.queryForObject("SELECT id FROM app_roles WHERE code='ADMINISTRATOR'", UUID.class);
        jdbc.update("INSERT INTO app_user_roles(user_id,role_id) VALUES(?,?)", adminId, roleId);
        institutionalHome.run(null);
        rootProvisioner.run(null);
        rootProvisioner.run(null);
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM projects WHERE site_role='ROOT'", Integer.class));

        JsonNode root = json.readTree(mvc.perform(get("/ites/site/root").header("Authorization", admin))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertTrue(root.get("canPublishDirectly").asBoolean());
        String projectId = root.get("projectId").asText();
        String organizationId = jdbc.queryForObject("SELECT organization_id::text FROM projects WHERE id=?", String.class,
                UUID.fromString(projectId));
        mvc.perform(get("/ites/site/root").header("Authorization", requester)).andExpect(status().isForbidden());
        mvc.perform(get("/ites/pages/inicio/draft").header("Authorization", admin)).andExpect(status().isNotFound());

        JsonNode project = json.readTree(mvc.perform(get("/projects/" + projectId).header("Authorization", admin)
                .header("X-Organization-Id", organizationId)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        String original = project.at("/document/pages/0/blocks/0/props/title").asText();
        var document = (tools.jackson.databind.node.ObjectNode) project.get("document").deepCopy();
        ((tools.jackson.databind.node.ObjectNode) document.at("/pages/0/blocks/0/props")).put("title", original + " teste");
        String change = json.writeValueAsString(Map.of("revision", project.get("revision").asLong(), "document", document));
        mvc.perform(patch("/projects/" + projectId).header("Authorization", requester)
                .header("X-Organization-Id", organizationId).contentType(MediaType.APPLICATION_JSON).content(change))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/projects/" + projectId).header("Authorization", admin)
                .header("X-Organization-Id", organizationId).contentType(MediaType.APPLICATION_JSON).content(change))
                .andExpect(status().isOk());
        JsonNode publishedBefore = json.readTree(mvc.perform(get("/ites/pages/inicio"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(original, json.readTree(publishedBefore.get("document").asText())
                .at("/pages/0/blocks/0/props/title").asText());
        mvc.perform(post("/projects/" + projectId + "/publication").header("Authorization", requester)
                .header("X-Organization-Id", organizationId).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/projects/" + projectId + "/publication").header("Authorization", admin)
                .header("X-Organization-Id", organizationId).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk());
        JsonNode publishedAfter = json.readTree(mvc.perform(get("/ites/pages/inicio"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(original + " teste", json.readTree(publishedAfter.get("document").asText())
                .at("/pages/0/blocks/0/props/title").asText());
        mvc.perform(delete("/projects/" + projectId).header("Authorization", admin)
                .header("X-Organization-Id", organizationId)).andExpect(status().isConflict());
    }

    @Test
    void administratorCreatesVerifiedRequesterWithoutEmailDelivery() throws Exception {
        String admin = register();
        String requester = register();
        UUID adminId = userId(admin);
        UUID adminRole = jdbc.queryForObject("SELECT id FROM app_roles WHERE code='ADMINISTRATOR'", UUID.class);
        jdbc.update("INSERT INTO app_user_roles(user_id,role_id) VALUES(?,?)", adminId, adminRole);

        String accountJson = json.writeValueAsString(Map.of(
                "firstName", "Nova", "lastName", "Solicitante", "email", "nova-solicitante@example.invalid",
                "password", "RequesterPass45!"));
        mvc.perform(post("/ites/users").header("Authorization", requester)
                        .contentType(MediaType.APPLICATION_JSON).content(accountJson))
                .andExpect(status().isForbidden());

        String createdBody = mvc.perform(post("/ites/users").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(accountJson))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        JsonNode created = json.readTree(createdBody);
        UUID createdId = UUID.fromString(created.get("id").asText());
        assertTrue(createdBody.contains("nova-solicitante@example.invalid"));
        assertFalse(createdBody.contains("RequesterPass45!"));
        assertTrue(jdbc.queryForObject("SELECT email_verified_at IS NOT NULL FROM users WHERE id=?", Boolean.class, createdId));
        assertTrue(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=? AND r.code='REQUESTER')", Boolean.class, createdId));

        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", "nova-solicitante@example.invalid", "password", "RequesterPass45!"))))
                .andExpect(status().isOk());
    }

    @Test
    void newlyRegisteredPermissionIsAutomaticallyGrantedOnlyToAdministratorRole() throws Exception {
        String admin = register();
        String requester = register();
        UUID adminId = userId(admin);
        UUID requesterId = userId(requester);
        UUID roleId = jdbc.queryForObject("SELECT id FROM app_roles WHERE code='ADMINISTRATOR'", UUID.class);
        jdbc.update("INSERT INTO app_user_roles(user_id,role_id) VALUES(?,?)",adminId,roleId);
        jdbc.update("INSERT INTO app_permissions(code,description) VALUES('analytics.future_test','Teste de grant futuro') ON CONFLICT DO NOTHING");
        assertEquals(jdbc.queryForObject("SELECT count(*) FROM app_permissions", Long.class),
                jdbc.queryForObject("SELECT count(*) FROM app_role_permissions WHERE role_id=?", Long.class, roleId));
        assertTrue(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM app_role_permissions rp JOIN app_permissions p ON p.code=rp.permission_code WHERE rp.role_id=? AND p.code='analytics.future_test')",Boolean.class,roleId));
        assertTrue(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM app_user_roles ur JOIN app_role_permissions rp ON rp.role_id=ur.role_id WHERE ur.user_id=? AND rp.permission_code='analytics.future_test')",Boolean.class,adminId));
        assertFalse(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM app_user_roles ur JOIN app_role_permissions rp ON rp.role_id=ur.role_id WHERE ur.user_id=? AND rp.permission_code='analytics.future_test')",Boolean.class,requesterId));
    }

    @Test
    void analyticsAndExportsRequireExplicitAdministrativeGrants() throws Exception {
        String requester = register();
        String analyst = register();
        String admin = register();
        UUID adminId = userId(admin);
        UUID analystId = userId(analyst);
        UUID roleId = jdbc.queryForObject("SELECT id FROM app_roles WHERE code='ADMINISTRATOR'",UUID.class);
        UUID analystRole = UUID.randomUUID();
        jdbc.update("INSERT INTO app_roles(id,code,name) VALUES(?,?,?)",analystRole,"ANALYTICS_READER","Analista de leitura");
        jdbc.update("INSERT INTO app_role_permissions(role_id,permission_code) VALUES(?, 'analytics.view')",analystRole);
        jdbc.update("INSERT INTO app_user_roles(user_id,role_id) VALUES(?,?)",analystId,analystRole);
        jdbc.update("INSERT INTO app_user_roles(user_id,role_id) VALUES(?,?)",adminId,roleId);
        mvc.perform(get("/ites/analytics/demands").header("Authorization",requester)).andExpect(status().isForbidden());
        mvc.perform(get("/ites/reports/demands.csv").header("Authorization",requester)).andExpect(status().isForbidden());
        JsonNode aggregate = json.readTree(mvc.perform(get("/ites/analytics/demands").header("Authorization",analyst))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(0,aggregate.get("demands").size());
        mvc.perform(get("/ites/analytics/demands").param("search", "solicitante")
                .header("Authorization", analyst)).andExpect(status().isForbidden());
        mvc.perform(get("/ites/analytics/demands").param("urgency", "arbitrary")
                .header("Authorization", admin)).andExpect(status().isBadRequest());
        mvc.perform(get("/ites/reports/demands.csv").header("Authorization",analyst)).andExpect(status().isForbidden());
        mvc.perform(get("/ites/analytics/demands").header("Authorization",admin)).andExpect(status().isOk());
        mvc.perform(get("/ites/reports/demands.csv").header("Authorization",admin)).andExpect(status().isOk());
    }

    @Test
    void demandDashboardUsesVersionedPageStorageAndValidatesDataSources() throws Exception {
        String requester = register();
        String admin = register();
        UUID adminId = userId(admin);
        UUID roleId = jdbc.queryForObject("SELECT id FROM app_roles WHERE code='ADMINISTRATOR'",UUID.class);
        jdbc.update("INSERT INTO app_user_roles(user_id,role_id) VALUES(?,?)",adminId,roleId);
        mvc.perform(get("/ites/dashboards/demandas").header("Authorization",requester)).andExpect(status().isForbidden());
        mvc.perform(get("/ites/pages/painel-demandas")).andExpect(status().isNotFound());
        mvc.perform(get("/ites/pages/painel-demandas/draft").header("Authorization",admin)).andExpect(status().isNotFound());
        String document = json.writeValueAsString(Map.of("kind","demand-dashboard","title","Painel de teste","blocks",java.util.List.of(
                Map.of("id","status","title","Situação","dataSource","byStatus","visualization","bar","metric","total"))));
        mvc.perform(put("/ites/dashboards/demandas").header("Authorization",requester).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("revision",0,"document",json.readTree(document)))))
                .andExpect(status().isForbidden());
        mvc.perform(put("/ites/dashboards/demandas").header("Authorization",admin).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("revision",0,"document",json.readTree(document)))))
                .andExpect(status().isOk());
        JsonNode saved = json.readTree(mvc.perform(get("/ites/dashboards/demandas").header("Authorization",admin))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertTrue(saved.get("document").asText().contains("Painel de teste"));
        String invalid = json.writeValueAsString(Map.of("kind","demand-dashboard","title","Painel inválido","blocks",java.util.List.of(
                Map.of("id","unsafe","title","Consulta","dataSource","sql","visualization","table","metric","total"))));
        mvc.perform(put("/ites/dashboards/demandas").header("Authorization",admin).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("revision",1,"document",json.readTree(invalid)))))
                .andExpect(status().isBadRequest());
    }

    private String register() throws Exception {
        String email="ites-"+UUID.randomUUID()+"@example.invalid";
        int sequence=IP_SEQUENCE.incrementAndGet();
        String ip="127.0.3."+(sequence%250+1);
        mvc.perform(post("/auth/signup/start").with(request -> { request.setRemoteAddr(ip); return request; }).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email",email)))).andExpect(status().isAccepted());
        String token=inbox.token(email,"Confirme seu e-mail");
        String body=json.writeValueAsString(Map.of("token",token,"firstName","Pessoa","lastName","Teste",
                "password","StrongPass1!","acceptTerms",true));
        JsonNode result=json.readTree(mvc.perform(post("/auth/signup/complete").with(request -> { request.setRemoteAddr(ip); return request; }).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        return "Bearer "+result.get("accessToken").asText();
    }

    private UUID userId(String bearer) throws Exception {
        String token=bearer.substring("Bearer ".length());
        String profile=mvc.perform(get("/auth/me").header("Authorization",bearer)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(json.readTree(profile).get("id").asText());
    }
}

package br.com.ites.server.controllers.Ites;

import br.com.ites.server.services.Ites.ItesAccessService;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/ites/dashboards/demandas")
public class DemandDashboardController {
    private static final Set<String> DATASETS = Set.of("summary","byStatus","byUrgency","byService","byOrganizationSector","byMonth");
    private static final Set<String> VISUALIZATIONS = Set.of("indicator","bar","line","donut","table");
    private static final Set<String> METRICS = Set.of("total","pending","accepted","rejected","high_urgency");
    private final JdbcTemplate jdbc;
    private final ItesAccessService access;

    public DemandDashboardController(JdbcTemplate jdbc, ItesAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @GetMapping
    public Map<String,Object> get(@AuthenticationPrincipal Jwt jwt) {
        access.require(UUID.fromString(jwt.getSubject()),"analytics.view");
        return jdbc.queryForList("""
                SELECT v.revision,v.id AS version_id,v.document::text AS document
                FROM institutional_pages p LEFT JOIN LATERAL (
                  SELECT id,revision,document FROM institutional_page_versions
                  WHERE page_id=p.id ORDER BY revision DESC LIMIT 1
                ) v ON true WHERE p.slug='painel-demandas'
                """).stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PutMapping
    @Transactional
    public Map<String,Object> save(@AuthenticationPrincipal Jwt jwt, @RequestBody JsonNode request) {
        UUID actor = UUID.fromString(jwt.getSubject());
        access.require(actor,"dashboards.manage");
        JsonNode document = request.path("document");
        validate(document);
        var pages = jdbc.queryForList("SELECT id FROM institutional_pages WHERE slug='painel-demandas' FOR UPDATE");
        if (pages.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        UUID pageId = (UUID) pages.getFirst().get("id");
        Integer current = jdbc.queryForObject("SELECT COALESCE(max(revision),0) FROM institutional_page_versions WHERE page_id=?",Integer.class,pageId);
        if (current == null || request.path("revision").asInt(-1) != current)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Painel alterado em outra sessão");
        UUID versionId = UUID.randomUUID();
        jdbc.update("INSERT INTO institutional_page_versions(id,page_id,revision,document,author_id) VALUES(?,?,?,?::jsonb,?)",
                versionId,pageId,current+1,document.toString(),actor);
        return Map.of("versionId",versionId,"revision",current+1);
    }

    private void validate(JsonNode document) {
        if (!document.isObject() || !"demand-dashboard".equals(document.path("kind").asText())
                || document.path("title").asText().isBlank() || document.path("title").asText().length()>180
                || !document.path("blocks").isArray() || document.path("blocks").size()>20)
            throw invalid();
        for (JsonNode block : document.path("blocks")) {
            String visualization = block.path("visualization").asText();
            String dataSource = block.path("dataSource").asText();
            if (block.path("id").asText().isBlank() || block.path("title").asText().isBlank()
                    || block.path("title").asText().length()>180 || !VISUALIZATIONS.contains(visualization)
                    || !DATASETS.contains(dataSource)) throw invalid();
            if ("indicator".equals(visualization) != "summary".equals(dataSource)) throw invalid();
            if ("indicator".equals(visualization) && !METRICS.contains(block.path("metric").asText())) throw invalid();
            if ("line".equals(visualization) && !"byMonth".equals(dataSource)) throw invalid();
            if ("byMonth".equals(dataSource) && "donut".equals(visualization)) throw invalid();
        }
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Configuração de painel inválida");
    }
}

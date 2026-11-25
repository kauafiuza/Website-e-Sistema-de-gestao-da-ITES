package br.com.ites.server.controllers.Ites;

import br.com.ites.server.services.Ites.DemandAnalyticsService;
import br.com.ites.server.services.Ites.ItesAccessService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ites")
public class DemandAnalyticsController {
    private final DemandAnalyticsService analytics;
    private final ItesAccessService access;

    public DemandAnalyticsController(DemandAnalyticsService analytics, ItesAccessService access) {
        this.analytics = analytics;
        this.access = access;
    }

    @GetMapping("/analytics/demands")
    public Map<String,Object> demands(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required=false) String status, @RequestParam(required=false) String urgency,
            @RequestParam(required=false) LocalDate from, @RequestParam(required=false) LocalDate to,
            @RequestParam(required=false) String search) {
        UUID actor = UUID.fromString(jwt.getSubject());
        access.require(actor, "analytics.view");
        boolean canReadDemands = access.hasPermission(actor, "demands.read");
        if (search != null && !search.isBlank() && !canReadDemands)
            access.require(actor, "demands.read");
        return analytics.query(status, urgency, from, to, search, canReadDemands);
    }

    @GetMapping("/reports/demands/{id}")
    public Map<String,Object> demandReport(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UUID actor = UUID.fromString(jwt.getSubject());
        access.require(actor, "reports.generate");
        access.require(actor, "demands.read");
        return analytics.detail(id);
    }

    @GetMapping(value="/reports/demands.csv", produces="text/csv")
    public ResponseEntity<String> export(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required=false) String status, @RequestParam(required=false) String urgency,
            @RequestParam(required=false) LocalDate from, @RequestParam(required=false) LocalDate to,
            @RequestParam(required=false) String search) {
        UUID actor = UUID.fromString(jwt.getSubject());
        access.require(actor, "reports.export");
        access.require(actor, "demands.read");
        List<Map<String,Object>> rows = analytics.rows(status,urgency,from,to,search,10_000);
        StringBuilder csv = new StringBuilder("codigo,data,status,urgencia,servico,solicitante,organizacao,descricao\r\n");
        for (Map<String,Object> row : rows) {
            csv.append(cell(row.get("code"))).append(',').append(cell(row.get("created_at"))).append(',')
                    .append(cell(row.get("status"))).append(',').append(cell(row.get("urgency"))).append(',')
                    .append(cell(row.get("service"))).append(',')
                    .append(cell(row.get("first_name") + " " + row.get("last_name"))).append(',')
                    .append(cell(row.get("organization_name"))).append(',').append(cell(row.get("description"))).append("\r\n");
        }
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=relatorio-demandas.csv")
                .body("\uFEFF" + csv);
    }

    private static String cell(Object value) {
        String text = value == null ? "" : value.toString();
        if (text.matches("^[\\s]*[=+\\-@].*")) text = "'" + text;
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }
}

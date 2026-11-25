package br.com.ites.server.controllers.Ites;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import br.com.ites.server.services.Ites.ItesAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/ites/organizations")
public class ItesOrganizationController {
    private final JdbcTemplate jdbc;
    private final ItesAccessService access;
    public ItesOrganizationController(JdbcTemplate jdbc, ItesAccessService access) { this.jdbc = jdbc; this.access = access; }
    public record NewOrganization(String name, String economicSector) {}

    @GetMapping
    public List<Map<String,Object>> mine(@AuthenticationPrincipal Jwt jwt) {
        return jdbc.queryForList("""
            SELECT o.id,o.name,o.economic_sector FROM organizations o
            JOIN organization_memberships m ON m.organization_id=o.id
            WHERE m.user_id=? ORDER BY o.name
            """, UUID.fromString(jwt.getSubject()));
    }

    @PostMapping
    @Transactional
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> create(@AuthenticationPrincipal Jwt jwt, @RequestBody NewOrganization request) {
        if (request == null || request.name() == null || request.name().isBlank() || request.name().length() > 150
                || request.economicSector() == null || request.economicSector().isBlank() || request.economicSector().length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados da organização inválidos");
        }
        UUID userId = UUID.fromString(jwt.getSubject());
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO organizations(id,name,created_at,economic_sector) VALUES(?,?,now(),?)",
                id, request.name(), request.economicSector());
        jdbc.update("INSERT INTO organization_memberships(organization_id,user_id,role,is_default,created_at) VALUES(?,?,'MEMBER',false,now())",
                id, userId);
        return jdbc.queryForMap("SELECT id,name,economic_sector FROM organizations WHERE id=?", id);
    }

    @GetMapping("/admin")
    public List<Map<String,Object>> administrativeList(@AuthenticationPrincipal Jwt jwt) {
        access.require(UUID.fromString(jwt.getSubject()),"organizations.manage");
        return jdbc.queryForList("""
                SELECT o.id,o.name,o.economic_sector,count(DISTINCT d.id) AS demand_count,
                  count(DISTINCT m.user_id) AS member_count
                FROM organizations o
                LEFT JOIN demands d ON d.organization_id=o.id
                LEFT JOIN organization_memberships m ON m.organization_id=o.id
                GROUP BY o.id,o.name,o.economic_sector ORDER BY o.name LIMIT 1000
                """);
    }
}

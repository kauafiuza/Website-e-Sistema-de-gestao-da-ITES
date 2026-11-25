package br.com.ites.server.controllers.Ites;

import br.com.ites.server.services.Ites.ItesAccessService;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/ites/site/root")
public class RootProjectController {
    private final JdbcTemplate jdbc;
    private final ItesAccessService access;

    public RootProjectController(JdbcTemplate jdbc, ItesAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @GetMapping
    public Map<String, Object> get(@AuthenticationPrincipal Jwt jwt) {
        UUID actor = UUID.fromString(jwt.getSubject());
        access.require(actor, "builder.access");
        access.require(actor, "builder.pages.edit");
        var roots = jdbc.query("SELECT id FROM projects WHERE site_role='ROOT'",
                (row, index) -> row.getObject(1, UUID.class));
        if (roots.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return Map.of("projectId", roots.getFirst(), "canPublishDirectly", access.isSystemAdministrator(actor));
    }
}

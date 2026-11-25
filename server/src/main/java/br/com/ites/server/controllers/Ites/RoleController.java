package br.com.ites.server.controllers.Ites;

import br.com.ites.server.services.Ites.ItesAccessService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/ites/roles")
public class RoleController {
    private final JdbcTemplate jdbc;
    private final ItesAccessService access;

    public RoleController(JdbcTemplate jdbc, ItesAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @GetMapping
    public List<Map<String,Object>> roles(@AuthenticationPrincipal Jwt jwt) {
        access.require(UUID.fromString(jwt.getSubject()), "roles.manage");
        return jdbc.queryForList("SELECT id,code,name FROM app_roles ORDER BY name");
    }

    @GetMapping("/users/{userId}")
    public List<Map<String,Object>> userRoles(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId) {
        access.require(UUID.fromString(jwt.getSubject()), "users.read");
        return jdbc.queryForList("""
                SELECT r.id,r.code,r.name FROM app_user_roles ur
                JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=? ORDER BY r.name
                """, userId);
    }

    @PostMapping("/users/{userId}/{roleId}")
    @Transactional
    public void grant(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId, @PathVariable UUID roleId) {
        UUID actor = UUID.fromString(jwt.getSubject());
        access.require(actor, "roles.manage");
        if (jdbc.update("INSERT INTO app_user_roles(user_id,role_id) VALUES(?,?) ON CONFLICT DO NOTHING", userId, roleId) > 0) {
            jdbc.update("INSERT INTO app_grant_events(actor_id,subject_id,role_id,action) VALUES(?,?,?,'GRANT')", actor, userId, roleId);
        }
    }

    @DeleteMapping("/users/{userId}/{roleId}")
    @Transactional
    public void revoke(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId, @PathVariable UUID roleId) {
        UUID actor = UUID.fromString(jwt.getSubject());
        access.require(actor, "roles.manage");
        if (actor.equals(userId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não é possível revogar o próprio papel");
        if (jdbc.update("DELETE FROM app_user_roles WHERE user_id=? AND role_id=?", userId, roleId) > 0) {
            jdbc.update("INSERT INTO app_grant_events(actor_id,subject_id,role_id,action) VALUES(?,?,?,'REVOKE')", actor, userId, roleId);
        }
    }
}

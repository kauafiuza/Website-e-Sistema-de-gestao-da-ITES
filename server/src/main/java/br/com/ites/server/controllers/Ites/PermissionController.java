package br.com.ites.server.controllers.Ites;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ites/me/permissions")
public class PermissionController {
    private final JdbcTemplate jdbc;
    public PermissionController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @GetMapping
    public List<String> list(@AuthenticationPrincipal Jwt jwt) {
        return jdbc.queryForList("""
                SELECT DISTINCT rp.permission_code FROM app_user_roles ur
                JOIN app_role_permissions rp ON rp.role_id=ur.role_id
                WHERE ur.user_id=? ORDER BY rp.permission_code
                """, String.class, UUID.fromString(jwt.getSubject()));
    }
}

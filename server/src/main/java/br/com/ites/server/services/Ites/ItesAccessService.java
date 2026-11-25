package br.com.ites.server.services.Ites;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class ItesAccessService {
    private final JdbcTemplate jdbc;

    public ItesAccessService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean hasPermission(UUID userId, String permission) {
        Boolean allowed = jdbc.queryForObject("""
                SELECT EXISTS(
                  SELECT 1 FROM app_user_roles ur
                  JOIN app_role_permissions rp ON rp.role_id = ur.role_id
                  WHERE ur.user_id = ? AND rp.permission_code = ?
                )
                """, Boolean.class, userId, permission);
        return Boolean.TRUE.equals(allowed);
    }

    /** Resolve a autoridade global do administrador diretamente do banco, sem depender do JWT. */
    public boolean isSystemAdministrator(UUID userId) {
        Boolean allowed = jdbc.queryForObject("""
                SELECT EXISTS(
                  SELECT 1 FROM app_user_roles ur
                  JOIN app_roles r ON r.id = ur.role_id
                  JOIN users u ON u.id = ur.user_id
                  WHERE ur.user_id = ? AND r.code = 'ADMINISTRATOR' AND u.active
                )
                """, Boolean.class, userId);
        return Boolean.TRUE.equals(allowed);
    }

    public void require(UUID userId, String permission) {
        if (!hasPermission(userId, permission)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permissão insuficiente");
        }
    }
}

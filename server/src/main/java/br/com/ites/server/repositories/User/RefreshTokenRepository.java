package br.com.ites.server.repositories.User;

import br.com.ites.server.models.User.RefreshTokenEntity;
import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.models.User.UserSessionEntity;
import br.com.ites.server.repositories.JdbcValues;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class RefreshTokenRepository {
    private static final String SELECT = """
            SELECT rt.id AS token_id, rt.token_hash, rt.expires_at AS token_expires_at,
                   rt.revoked_at AS token_revoked_at, rt.created_at AS token_created_at, rt.rotated_at,
                   u.id AS user_id, u.first_name, u.last_name, u.email, u.password_hash, u.company_name,
                   u.active, u.email_verified_at, u.password_changed_at, u.terms_accepted_at,
                   u.created_at AS user_created_at, u.updated_at AS user_updated_at,
                   s.id AS session_id, s.created_at AS session_created_at, s.last_seen_at,
                   s.expires_at AS session_expires_at, s.absolute_expires_at, s.revoked_at AS session_revoked_at,
                   s.revoke_reason, s.user_agent, s.ip
            FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
            LEFT JOIN user_sessions s ON s.id = rt.session_id
            """;
    private static final RowMapper<RefreshTokenEntity> ROW_MAPPER = (rs, row) -> {
        UserEntity user = new UserEntity(rs.getObject("user_id", UUID.class), rs.getString("first_name"),
                rs.getString("last_name"), rs.getString("email"), rs.getString("password_hash"),
                rs.getString("company_name"), rs.getBoolean("active"), JdbcValues.instant(rs, "email_verified_at"),
                JdbcValues.instant(rs, "password_changed_at"), JdbcValues.instant(rs, "terms_accepted_at"),
                rs.getObject("user_created_at", LocalDateTime.class), rs.getObject("user_updated_at", LocalDateTime.class));
        UUID sessionId = rs.getObject("session_id", UUID.class);
        UserSessionEntity session = sessionId == null ? null : new UserSessionEntity(sessionId, user,
                JdbcValues.instant(rs, "session_created_at"), JdbcValues.instant(rs, "last_seen_at"),
                JdbcValues.instant(rs, "session_expires_at"), JdbcValues.instant(rs, "absolute_expires_at"),
                JdbcValues.instant(rs, "session_revoked_at"), rs.getString("revoke_reason"),
                rs.getString("user_agent"), rs.getString("ip"));
        return new RefreshTokenEntity(rs.getObject("token_id", UUID.class), user, session, rs.getString("token_hash"),
                JdbcValues.instant(rs, "token_expires_at"), JdbcValues.instant(rs, "token_revoked_at"),
                JdbcValues.instant(rs, "token_created_at"), JdbcValues.instant(rs, "rotated_at"));
    };

    private final JdbcTemplate jdbc;

    public RefreshTokenRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<RefreshTokenEntity> findByHashForUpdate(String hash) {
        return jdbc.query(SELECT + " WHERE rt.token_hash = ? FOR UPDATE OF rt", ROW_MAPPER, hash).stream().findFirst();
    }

    public Optional<RefreshTokenEntity> findByTokenHash(String hash) {
        return jdbc.query(SELECT + " WHERE rt.token_hash = ?", ROW_MAPPER, hash).stream().findFirst();
    }

    public void save(RefreshTokenEntity token) {
        if (token.getId() == null) {
            jdbc.update("INSERT INTO refresh_tokens (id, user_id, session_id, token_hash, expires_at, revoked_at, created_at, rotated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID(), token.getUser().getId(), token.getSession() == null ? null : token.getSession().getId(),
                    token.getTokenHash(), JdbcValues.offsetDateTime(token.getExpiresAt()),
                    JdbcValues.offsetDateTime(token.getRevokedAt()), JdbcValues.offsetDateTime(token.getCreatedAt()),
                    JdbcValues.offsetDateTime(token.getRotatedAt()));
        } else {
            jdbc.update("UPDATE refresh_tokens SET revoked_at = ?, rotated_at = ? WHERE id = ?",
                    JdbcValues.offsetDateTime(token.getRevokedAt()), JdbcValues.offsetDateTime(token.getRotatedAt()), token.getId());
        }
    }

    public void deleteByUser_Id(UUID userId) { jdbc.update("DELETE FROM refresh_tokens WHERE user_id = ?", userId); }
    public void deleteBySession_Id(UUID sessionId) { jdbc.update("DELETE FROM refresh_tokens WHERE session_id = ?", sessionId); }
    public void revokeAllForUser(UUID userId, Instant now) {
        jdbc.update("UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
                JdbcValues.offsetDateTime(now), userId);
    }
}

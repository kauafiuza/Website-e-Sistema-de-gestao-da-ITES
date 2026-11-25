package br.com.ites.server.repositories.User;

import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.models.User.UserSessionEntity;
import br.com.ites.server.repositories.JdbcValues;
import br.com.ites.server.utils.pagination.PageRequest;
import br.com.ites.server.utils.pagination.PageResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class UserSessionRepository {
    private static final String SELECT = """
            SELECT s.id, s.user_id, s.created_at, s.last_seen_at, s.expires_at, s.absolute_expires_at,
                   s.revoked_at, s.revoke_reason, s.user_agent, s.ip,
                   u.first_name AS owner_first_name, u.last_name AS owner_last_name, u.email AS owner_email,
                   u.password_hash AS owner_password_hash, u.company_name AS owner_company_name,
                   u.active AS owner_active, u.email_verified_at AS owner_email_verified_at,
                   u.password_changed_at AS owner_password_changed_at, u.terms_accepted_at AS owner_terms_accepted_at,
                   u.created_at AS owner_created_at, u.updated_at AS owner_updated_at
            FROM user_sessions s JOIN users u ON u.id = s.user_id
            """;
    private static final RowMapper<UserSessionEntity> ROW_MAPPER = (rs, row) -> {
        UserEntity user = new UserEntity(rs.getObject("user_id", UUID.class), rs.getString("owner_first_name"),
                rs.getString("owner_last_name"), rs.getString("owner_email"), rs.getString("owner_password_hash"),
                rs.getString("owner_company_name"), rs.getBoolean("owner_active"),
                JdbcValues.instant(rs, "owner_email_verified_at"), JdbcValues.instant(rs, "owner_password_changed_at"),
                JdbcValues.instant(rs, "owner_terms_accepted_at"),
                rs.getObject("owner_created_at", java.time.LocalDateTime.class), rs.getObject("owner_updated_at", java.time.LocalDateTime.class));
        return new UserSessionEntity(rs.getObject("id", UUID.class), user,
                JdbcValues.instant(rs, "created_at"), JdbcValues.instant(rs, "last_seen_at"),
                JdbcValues.instant(rs, "expires_at"), JdbcValues.instant(rs, "absolute_expires_at"),
                JdbcValues.instant(rs, "revoked_at"), rs.getString("revoke_reason"),
                rs.getString("user_agent"), rs.getString("ip"));
    };

    private final JdbcTemplate jdbc;

    public UserSessionRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<UserSessionEntity> findById(UUID id) {
        return jdbc.query(SELECT + " WHERE s.id = ?", ROW_MAPPER, id).stream().findFirst();
    }

    public PageResponse<UserSessionEntity> findActive(UUID userId, Instant now, PageRequest page) {
        String activeFilter = " WHERE s.user_id = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND s.absolute_expires_at > ?";
        List<UserSessionEntity> items = jdbc.query(SELECT + activeFilter +
                        " ORDER BY s.last_seen_at DESC, s.id DESC LIMIT ? OFFSET ?",
                ROW_MAPPER, userId, JdbcValues.offsetDateTime(now), JdbcValues.offsetDateTime(now),
                page.size(), page.offset());
        Long total = jdbc.queryForObject("SELECT count(*) FROM user_sessions s" + activeFilter,
                Long.class, userId, JdbcValues.offsetDateTime(now), JdbcValues.offsetDateTime(now));
        return PageResponse.of(items, page, total == null ? 0 : total);
    }

    public UserSessionEntity insert(UserSessionEntity session) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO user_sessions (id, user_id, created_at, last_seen_at, expires_at, absolute_expires_at, revoked_at, revoke_reason, user_agent, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id, session.getUser().getId(), JdbcValues.offsetDateTime(session.getCreatedAt()),
                JdbcValues.offsetDateTime(session.getLastSeenAt()), JdbcValues.offsetDateTime(session.getExpiresAt()),
                JdbcValues.offsetDateTime(session.getAbsoluteExpiresAt()), JdbcValues.offsetDateTime(session.getRevokedAt()),
                session.getRevokeReason(), session.getUserAgent(), session.getIp());
        return findById(id).orElseThrow();
    }

    public void save(UserSessionEntity session) {
        jdbc.update("UPDATE user_sessions SET last_seen_at = ?, expires_at = ?, revoked_at = ?, revoke_reason = ?, user_agent = ?, ip = ? WHERE id = ?",
                JdbcValues.offsetDateTime(session.getLastSeenAt()), JdbcValues.offsetDateTime(session.getExpiresAt()),
                JdbcValues.offsetDateTime(session.getRevokedAt()), session.getRevokeReason(),
                session.getUserAgent(), session.getIp(), session.getId());
    }

    public int revokeOthers(UUID userId, UUID keep, Instant now, String reason) {
        return jdbc.update("""
                UPDATE user_sessions
                SET revoked_at = ?, revoke_reason = ?
                WHERE user_id = ? AND (?::uuid IS NULL OR id <> ?) AND revoked_at IS NULL
                  AND expires_at > ? AND absolute_expires_at > ?
                """, JdbcValues.offsetDateTime(now), reason, userId, keep, keep,
                JdbcValues.offsetDateTime(now), JdbcValues.offsetDateTime(now));
    }

    public void deleteByUser_Id(UUID userId) { jdbc.update("DELETE FROM user_sessions WHERE user_id = ?", userId); }
}

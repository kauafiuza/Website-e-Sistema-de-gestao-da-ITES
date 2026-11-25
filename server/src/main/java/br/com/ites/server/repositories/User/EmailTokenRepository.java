package br.com.ites.server.repositories.User;

import br.com.ites.server.models.User.EmailTokenEntity;
import br.com.ites.server.repositories.JdbcValues;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class EmailTokenRepository {
    private static final RowMapper<EmailTokenEntity> ROW_MAPPER = (rs, row) -> new EmailTokenEntity(
            rs.getObject("id", UUID.class), EmailTokenEntity.Purpose.valueOf(rs.getString("purpose")),
            rs.getString("token_hash"), rs.getString("email"), rs.getObject("user_id", UUID.class),
            JdbcValues.instant(rs, "created_at"), JdbcValues.instant(rs, "expires_at"),
            JdbcValues.instant(rs, "consumed_at"), rs.getString("request_ip"), rs.getInt("attempts"));

    private final JdbcTemplate jdbc;

    public EmailTokenRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<EmailTokenEntity> findByTokenHashAndPurpose(String hash, EmailTokenEntity.Purpose purpose) {
        return one("SELECT * FROM email_tokens WHERE token_hash = ? AND purpose = ?", hash, purpose.name());
    }

    public Optional<EmailTokenEntity> findFirstByEmailAndPurposeOrderByCreatedAtDesc(String email, EmailTokenEntity.Purpose purpose) {
        return one("SELECT * FROM email_tokens WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1", email, purpose.name());
    }

    public void save(EmailTokenEntity token) {
        jdbc.update("""
                INSERT INTO email_tokens (id, purpose, token_hash, email, user_id, created_at, expires_at,
                    consumed_at, request_ip, attempts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID(), token.getPurpose().name(), token.getTokenHash(), token.getEmail(),
                token.getUserId(), JdbcValues.offsetDateTime(token.getCreatedAt()),
                JdbcValues.offsetDateTime(token.getExpiresAt()), JdbcValues.offsetDateTime(token.getConsumedAt()),
                token.getRequestIp(), token.getAttempts());
    }

    public int consume(UUID id, Instant now) {
        return jdbc.update("UPDATE email_tokens SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND expires_at > ?",
                JdbcValues.offsetDateTime(now), id, JdbcValues.offsetDateTime(now));
    }

    public int consumeAll(String email, EmailTokenEntity.Purpose purpose, Instant now) {
        return jdbc.update("UPDATE email_tokens SET consumed_at = ? WHERE email = ? AND purpose = ? AND consumed_at IS NULL",
                JdbcValues.offsetDateTime(now), email, purpose.name());
    }

    public int incrementAttempts(UUID id) {
        List<Integer> attempts = jdbc.query("UPDATE email_tokens SET attempts = attempts + 1 WHERE id = ? RETURNING attempts",
                (rs, row) -> rs.getInt(1), id);
        return attempts.isEmpty() ? 0 : attempts.getFirst();
    }

    public void deleteByUserId(UUID userId) { jdbc.update("DELETE FROM email_tokens WHERE user_id = ?", userId); }

    private Optional<EmailTokenEntity> one(String sql, Object... args) {
        return jdbc.query(sql, ROW_MAPPER, args).stream().findFirst();
    }
}

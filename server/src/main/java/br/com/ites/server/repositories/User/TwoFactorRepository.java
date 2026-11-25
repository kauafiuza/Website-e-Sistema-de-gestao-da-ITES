package br.com.ites.server.repositories.User;

import br.com.ites.server.models.User.TwoFactorEntity;
import br.com.ites.server.repositories.JdbcValues;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class TwoFactorRepository {
    private static final RowMapper<TwoFactorEntity> ROW_MAPPER = (rs, row) -> new TwoFactorEntity(
            rs.getObject("user_id", UUID.class), rs.getString("secret_enc"),
            JdbcValues.instant(rs, "enabled_at"), rs.getObject("last_step", Long.class),
            JdbcValues.instant(rs, "created_at"));

    private final JdbcTemplate jdbc;

    public TwoFactorRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<TwoFactorEntity> findById(UUID userId) {
        List<TwoFactorEntity> rows = jdbc.query("SELECT * FROM user_two_factor WHERE user_id = ?", ROW_MAPPER, userId);
        return rows.stream().findFirst();
    }

    public void save(TwoFactorEntity factor) {
        jdbc.update("""
                INSERT INTO user_two_factor (user_id, secret_enc, enabled_at, last_step, created_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (user_id) DO UPDATE SET secret_enc = EXCLUDED.secret_enc,
                    enabled_at = EXCLUDED.enabled_at, last_step = EXCLUDED.last_step, created_at = EXCLUDED.created_at
                """, factor.getUserId(), factor.getSecretEnc(), JdbcValues.offsetDateTime(factor.getEnabledAt()),
                factor.getLastStep(), JdbcValues.offsetDateTime(factor.getCreatedAt()));
    }

    public int advanceStep(UUID userId, long step) {
        return jdbc.update("UPDATE user_two_factor SET last_step = ? WHERE user_id = ? AND (last_step IS NULL OR last_step < ?)", step, userId, step);
    }

    public void deleteById(UUID userId) { jdbc.update("DELETE FROM user_two_factor WHERE user_id = ?", userId); }
}

package br.com.ites.server.repositories.User;

import br.com.ites.server.models.User.RecoveryCodeEntity;
import br.com.ites.server.repositories.JdbcValues;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public class RecoveryCodeRepository {
    private final JdbcTemplate jdbc;

    public RecoveryCodeRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public int use(UUID userId, String hash, Instant now) {
        return jdbc.update("UPDATE user_recovery_codes SET used_at = ? WHERE user_id = ? AND code_hash = ? AND used_at IS NULL",
                JdbcValues.offsetDateTime(now), userId, hash);
    }

    public long countByUserIdAndUsedAtIsNull(UUID userId) {
        Long count = jdbc.queryForObject("SELECT count(*) FROM user_recovery_codes WHERE user_id = ? AND used_at IS NULL", Long.class, userId);
        return count == null ? 0 : count;
    }

    public void saveAll(List<RecoveryCodeEntity> codes) {
        for (RecoveryCodeEntity code : codes) {
            jdbc.update("INSERT INTO user_recovery_codes (id, user_id, code_hash, used_at) VALUES (?, ?, ?, ?)",
                    UUID.randomUUID(), code.getUserId(), code.getCodeHash(), JdbcValues.offsetDateTime(code.getUsedAt()));
        }
    }

    public void deleteByUserId(UUID userId) { jdbc.update("DELETE FROM user_recovery_codes WHERE user_id = ?", userId); }
}

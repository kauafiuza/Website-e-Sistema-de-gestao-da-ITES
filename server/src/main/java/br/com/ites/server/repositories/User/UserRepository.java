package br.com.ites.server.repositories.User;

import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.repositories.JdbcValues;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class UserRepository {
    private static final RowMapper<UserEntity> ROW_MAPPER = (rs, row) -> new UserEntity(
            rs.getObject("id", UUID.class), rs.getString("first_name"), rs.getString("last_name"),
            rs.getString("email"), rs.getString("password_hash"), rs.getString("company_name"),
            rs.getBoolean("active"), JdbcValues.instant(rs, "email_verified_at"),
            JdbcValues.instant(rs, "password_changed_at"), JdbcValues.instant(rs, "terms_accepted_at"),
            rs.getObject("created_at", LocalDateTime.class), rs.getObject("updated_at", LocalDateTime.class));

    private final JdbcTemplate jdbc;

    public UserRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<UserEntity> findById(UUID id) {
        return one("SELECT * FROM users WHERE id = ?", id);
    }

    public Optional<UserEntity> findByEmailIgnoreCase(String email) {
        return one("SELECT * FROM users WHERE lower(email) = lower(?)", email);
    }

    public boolean existsByEmailIgnoreCase(String email) {
        Boolean exists = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(?))", Boolean.class, email);
        return Boolean.TRUE.equals(exists);
    }

    public UserEntity insert(UserEntity user) {
        UUID id = user.getId() == null ? UUID.randomUUID() : user.getId();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        jdbc.update("""
                INSERT INTO users (id, first_name, last_name, email, password_hash, company_name, active,
                    email_verified_at, password_changed_at, terms_accepted_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, user.getFirstName(), user.getLastName(), user.getEmail(), user.getPasswordHash(),
                user.getCompanyName(), user.isActive(), JdbcValues.offsetDateTime(user.getEmailVerifiedAt()),
                JdbcValues.offsetDateTime(user.getPasswordChangedAt()), JdbcValues.offsetDateTime(user.getTermsAcceptedAt()),
                user.getCreatedAt() == null ? now : user.getCreatedAt(), now);
        return findById(id).orElseThrow();
    }

    public void update(UserEntity user) {
        jdbc.update("""
                UPDATE users SET first_name = ?, last_name = ?, email = ?, password_hash = ?, company_name = ?,
                    active = ?, email_verified_at = ?, password_changed_at = ?, terms_accepted_at = ?, updated_at = ?
                WHERE id = ?
                """, user.getFirstName(), user.getLastName(), user.getEmail(), user.getPasswordHash(),
                user.getCompanyName(), user.isActive(), JdbcValues.offsetDateTime(user.getEmailVerifiedAt()),
                JdbcValues.offsetDateTime(user.getPasswordChangedAt()), JdbcValues.offsetDateTime(user.getTermsAcceptedAt()),
                LocalDateTime.now(ZoneOffset.UTC), user.getId());
    }

    public void delete(UserEntity user) { jdbc.update("DELETE FROM users WHERE id = ?", user.getId()); }

    private Optional<UserEntity> one(String sql, Object parameter) {
        List<UserEntity> rows = jdbc.query(sql, ROW_MAPPER, parameter);
        return rows.stream().findFirst();
    }
}

package br.com.ites.server.repositories.Web.Theme;

import br.com.ites.server.models.Web.Theme.ThemeEntity;
import br.com.ites.server.utils.pagination.PageRequest;
import br.com.ites.server.utils.pagination.PageResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ThemeRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public ThemeRepository(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public PageResponse<ThemeEntity> findByOrganization_IdOrderByUpdatedAtDescIdDesc(UUID organizationId, PageRequest page) {
        List<ThemeEntity> items = jdbc.query("SELECT id, owner_id, name, configuration::text, created_at, updated_at FROM themes WHERE organization_id = ? ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?",
                (rs, row) -> map(rs.getObject("id", UUID.class), rs.getObject("owner_id", UUID.class), rs.getString("name"),
                        rs.getString("configuration"), rs.getObject("created_at", LocalDateTime.class),
                        rs.getObject("updated_at", LocalDateTime.class)), organizationId, page.size(), page.offset());
        Long total = jdbc.queryForObject("SELECT count(*) FROM themes WHERE organization_id = ?", Long.class, organizationId);
        return PageResponse.of(items, page, total == null ? 0 : total);
    }

    public Optional<ThemeEntity> findByIdAndOrganization_Id(UUID id, UUID organizationId) {
        List<ThemeEntity> rows = jdbc.query("SELECT id, owner_id, name, configuration::text, created_at, updated_at FROM themes WHERE id = ? AND organization_id = ?",
                (rs, row) -> map(rs.getObject("id", UUID.class), rs.getObject("owner_id", UUID.class), rs.getString("name"),
                        rs.getString("configuration"), rs.getObject("created_at", LocalDateTime.class),
                        rs.getObject("updated_at", LocalDateTime.class)), id, organizationId);
        return rows.stream().findFirst();
    }

    public boolean existsByOrganization_IdAndNameIgnoreCase(UUID organizationId, String name) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM themes WHERE organization_id = ? AND lower(name) = lower(?))", Boolean.class, organizationId, name));
    }

    public ThemeEntity insert(UUID ownerId, UUID organizationId, String name, JsonNode configuration) {
        UUID id = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        jdbc.update("INSERT INTO themes (id, owner_id, organization_id, name, configuration, created_at, updated_at) VALUES (?, ?, ?, ?, ?::jsonb, ?, ?)",
                id, ownerId, organizationId, name, configuration.toString(), now, now);
        return findByIdAndOrganization_Id(id, organizationId).orElseThrow();
    }

    public ThemeEntity update(ThemeEntity theme, UUID organizationId) {
        jdbc.update("UPDATE themes SET name = ?, configuration = ?::jsonb, updated_at = ? WHERE id = ? AND organization_id = ?",
                theme.getName(), theme.getConfiguration().toString(), LocalDateTime.now(), theme.getId(), organizationId);
        return findByIdAndOrganization_Id(theme.getId(), organizationId).orElseThrow();
    }

    public void deleteByIdAndOrganization_Id(UUID id, UUID organizationId) {
        jdbc.update("DELETE FROM themes WHERE id = ? AND organization_id = ?", id, organizationId);
    }

    private ThemeEntity map(UUID id, UUID ownerId, String name, String configuration,
                            LocalDateTime createdAt, LocalDateTime updatedAt) {
        try { return new ThemeEntity(id, ownerId, name, json.readTree(configuration), createdAt, updatedAt); }
        catch (Exception e) { throw new IllegalStateException("JSON de tema inválido no banco", e); }
    }
}

package br.com.ites.server.repositories.Organization;

import br.com.ites.server.models.Organization.OrganizationFeature;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class OrganizationFeatureRepository {
    private final JdbcTemplate jdbc;

    public OrganizationFeatureRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean isEnabled(UUID organizationId, OrganizationFeature feature) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM organization_feature_catalog catalog
                    JOIN organization_feature_availability availability
                      ON availability.feature_key = catalog.feature_key
                     AND availability.feature_version = catalog.version
                    WHERE catalog.feature_key = ? AND catalog.is_current
                      AND availability.organization_id = ? AND availability.enabled
                )
                """, Boolean.class, feature.name(), organizationId));
    }

    public List<Availability> listCurrent(UUID organizationId) {
        return jdbc.query("""
                SELECT catalog.feature_key, catalog.version, catalog.name, catalog.description,
                       COALESCE(availability.enabled, false) AS enabled
                FROM organization_feature_catalog catalog
                LEFT JOIN organization_feature_availability availability
                  ON availability.organization_id = ?
                 AND availability.feature_key = catalog.feature_key
                 AND availability.feature_version = catalog.version
                WHERE catalog.is_current
                ORDER BY catalog.name, catalog.feature_key
                """, (rs, row) -> new Availability(
                rs.getString("feature_key"), rs.getInt("version"), rs.getString("name"),
                rs.getString("description"), rs.getBoolean("enabled")), organizationId);
    }

    public void initializeDefaults(UUID organizationId) {
        jdbc.update("""
                INSERT INTO organization_feature_availability
                    (organization_id, feature_key, feature_version, enabled)
                SELECT ?, feature_key, version, true
                FROM organization_feature_catalog
                WHERE is_current AND default_enabled_for_new_organizations
                ON CONFLICT (organization_id, feature_key) DO NOTHING
                """, organizationId);
    }

    public record Availability(String featureKey, int version, String name, String description,
            boolean enabled) {}
}

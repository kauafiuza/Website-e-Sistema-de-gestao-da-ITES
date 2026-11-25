package br.com.ites.server.repositories.Organization;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PageTemplateRepository {
    private final JdbcTemplate jdbc;

    public PageTemplateRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<VersionedTemplate> listCurrent(UUID organizationId) {
        return jdbc.query("""
                SELECT template.id, template.name, template.created_by, version.id AS version_id,
                       version.version_number, version.content::text, version.created_by AS version_created_by,
                       template.created_at, version.created_at AS version_created_at
                FROM organization_page_templates template
                JOIN organization_page_template_versions version
                  ON version.id = template.current_version_id AND version.template_id = template.id
                WHERE template.organization_id = ? AND template.archived_at IS NULL
                ORDER BY template.updated_at DESC, template.id
                """, (rs, row) -> mapVersion(rs.getObject("id", UUID.class), rs.getString("name"),
                rs.getObject("created_by", UUID.class), rs.getObject("version_id", UUID.class),
                rs.getInt("version_number"), rs.getString("content"),
                rs.getObject("version_created_by", UUID.class),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("version_created_at", OffsetDateTime.class)), organizationId);
    }

    public Optional<TemplateHeader> lockForUpdate(UUID organizationId, UUID templateId) {
        return jdbc.query("""
                SELECT template.id, template.name, template.created_by, version.version_number
                FROM organization_page_templates template
                JOIN organization_page_template_versions version
                  ON version.id = template.current_version_id AND version.template_id = template.id
                WHERE template.id = ? AND template.organization_id = ? AND template.archived_at IS NULL
                FOR UPDATE OF template
                """, (rs, row) -> new TemplateHeader(rs.getObject("id", UUID.class),
                rs.getString("name"), rs.getObject("created_by", UUID.class),
                rs.getInt("version_number")), templateId, organizationId).stream().findFirst();
    }

    public boolean create(UUID templateId, UUID versionId, UUID organizationId, UUID actorId,
            String name, String content) {
        int inserted = jdbc.update("""
                INSERT INTO organization_page_templates
                    (id, organization_id, created_by, updated_by, name)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (organization_id, lower(name)) WHERE archived_at IS NULL DO NOTHING
                """, templateId, organizationId, actorId, actorId, name);
        if (inserted == 0) return false;
        jdbc.update("""
                INSERT INTO organization_page_template_versions
                    (id, template_id, organization_id, version_number, content, created_by)
                VALUES (?, ?, ?, 1, ?::jsonb, ?)
                """, versionId, templateId, organizationId, content, actorId);
        jdbc.update("UPDATE organization_page_templates SET current_version_id = ? WHERE id = ? AND organization_id = ?",
                versionId, templateId, organizationId);
        return true;
    }

    public void createVersion(UUID templateId, UUID versionId, UUID organizationId,
            UUID actorId, int version, String content) {
        jdbc.update("""
                INSERT INTO organization_page_template_versions
                    (id, template_id, organization_id, version_number, content, created_by)
                VALUES (?, ?, ?, ?, ?::jsonb, ?)
                """, versionId, templateId, organizationId, version, content, actorId);
        jdbc.update("""
                UPDATE organization_page_templates
                SET current_version_id = ?, updated_by = ?, updated_at = now()
                WHERE id = ? AND organization_id = ?
                """, versionId, actorId, templateId, organizationId);
    }

    public List<VersionedTemplate> listVersions(UUID organizationId, UUID templateId) {
        return jdbc.query("""
                SELECT template.id, template.name, template.created_by, version.id AS version_id,
                       version.version_number, version.content::text, version.created_by AS version_created_by,
                       template.created_at, version.created_at AS version_created_at
                FROM organization_page_templates template
                JOIN organization_page_template_versions version ON version.template_id = template.id
                WHERE template.id = ? AND template.organization_id = ? AND template.archived_at IS NULL
                ORDER BY version.version_number DESC
                """, (rs, row) -> mapVersion(rs.getObject("id", UUID.class), rs.getString("name"),
                rs.getObject("created_by", UUID.class), rs.getObject("version_id", UUID.class),
                rs.getInt("version_number"), rs.getString("content"),
                rs.getObject("version_created_by", UUID.class),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("version_created_at", OffsetDateTime.class)), templateId, organizationId);
    }

    /** Resolve uma versão persistida dentro da organização, inclusive versões arquivadas já adotadas. */
    public Optional<TemplateSnapshot> findVersionSnapshot(UUID organizationId, UUID templateId, UUID versionId) {
        return jdbc.query("""
                SELECT version.version_number, version.content::text
                FROM organization_page_template_versions version
                JOIN organization_page_templates template
                  ON template.id = version.template_id AND template.organization_id = version.organization_id
                WHERE version.organization_id = ? AND version.template_id = ? AND version.id = ?
                """, (rs, row) -> new TemplateSnapshot(rs.getInt("version_number"), rs.getString("content")),
                organizationId, templateId, versionId)
                .stream().findFirst();
    }

    /** Adoção explícita resolve somente a versão atual de um modelo não arquivado no tenant. */
    public Optional<TemplateSnapshot> findCurrentVersionSnapshot(UUID organizationId, UUID templateId, UUID versionId) {
        return jdbc.query("""
                SELECT version.version_number, version.content::text
                FROM organization_page_template_versions version
                JOIN organization_page_templates template
                  ON template.id = version.template_id AND template.organization_id = version.organization_id
                WHERE version.organization_id = ? AND version.template_id = ? AND version.id = ?
                  AND template.archived_at IS NULL AND template.current_version_id = version.id
                """, (rs, row) -> new TemplateSnapshot(rs.getInt("version_number"), rs.getString("content")),
                organizationId, templateId, versionId)
                .stream().findFirst();
    }

    public int archive(UUID organizationId, UUID templateId, UUID actorId) {
        return jdbc.update("""
                UPDATE organization_page_templates
                SET archived_at = now(), updated_at = now(), updated_by = ?
                WHERE id = ? AND organization_id = ? AND created_by = ? AND archived_at IS NULL
                """, actorId, templateId, organizationId, actorId);
    }

    private static VersionedTemplate mapVersion(UUID id, String name, UUID createdBy,
            UUID versionId, int version, String content, UUID versionCreatedBy,
            OffsetDateTime createdAt, OffsetDateTime versionCreatedAt) {
        return new VersionedTemplate(id, name, createdBy, versionId, version, content,
                versionCreatedBy, createdAt, versionCreatedAt);
    }

    public record TemplateHeader(UUID id, String name, UUID createdBy, int currentVersion) {}

    public record TemplateSnapshot(int version, String content) {}

    public record VersionedTemplate(UUID id, String name, UUID createdBy, UUID versionId,
            int version, String content, UUID versionCreatedBy, OffsetDateTime createdAt,
            OffsetDateTime versionCreatedAt) {}
}

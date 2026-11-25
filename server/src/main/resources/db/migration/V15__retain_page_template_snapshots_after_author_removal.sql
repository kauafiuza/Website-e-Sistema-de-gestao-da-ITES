ALTER TABLE organization_page_templates
    ALTER COLUMN created_by DROP NOT NULL,
    ALTER COLUMN updated_by DROP NOT NULL,
    DROP CONSTRAINT organization_page_templates_created_by_fkey,
    DROP CONSTRAINT organization_page_templates_updated_by_fkey,
    ADD CONSTRAINT organization_page_templates_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT organization_page_templates_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE organization_page_template_versions
    ALTER COLUMN created_by DROP NOT NULL,
    DROP CONSTRAINT organization_page_template_versions_created_by_fkey,
    ADD CONSTRAINT organization_page_template_versions_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

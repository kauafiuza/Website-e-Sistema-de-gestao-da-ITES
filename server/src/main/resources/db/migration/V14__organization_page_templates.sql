CREATE TABLE organization_page_templates (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name varchar(150) NOT NULL,
    current_version_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz,
    CONSTRAINT uq_organization_page_templates_id_org UNIQUE (id, organization_id)
);

CREATE UNIQUE INDEX uq_organization_page_templates_name
    ON organization_page_templates (organization_id, lower(name))
    WHERE archived_at IS NULL;

CREATE INDEX idx_organization_page_templates_listing
    ON organization_page_templates (organization_id, updated_at DESC, id)
    WHERE archived_at IS NULL;

CREATE TABLE organization_page_template_versions (
    id uuid PRIMARY KEY,
    template_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    version_number integer NOT NULL CHECK (version_number > 0),
    content jsonb NOT NULL,
    created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_page_template_version_template
        FOREIGN KEY (template_id, organization_id)
        REFERENCES organization_page_templates (id, organization_id) ON DELETE CASCADE,
    CONSTRAINT uq_page_template_version_number UNIQUE (template_id, version_number),
    CONSTRAINT uq_page_template_version_id_template UNIQUE (id, template_id)
);

ALTER TABLE organization_page_templates
    ADD CONSTRAINT fk_page_template_current_version
    FOREIGN KEY (current_version_id, id)
    REFERENCES organization_page_template_versions (id, template_id)
    DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_page_template_versions_history
    ON organization_page_template_versions (template_id, version_number DESC);

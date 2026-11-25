CREATE TABLE organizations (
    id uuid PRIMARY KEY,
    name varchar(150) NOT NULL,
    created_at timestamp NOT NULL
);

CREATE TABLE organization_memberships (
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role varchar(20) NOT NULL CHECK (role IN ('OWNER', 'MEMBER')),
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL,
    PRIMARY KEY (organization_id, user_id)
);
CREATE UNIQUE INDEX uk_organization_memberships_default_user
    ON organization_memberships (user_id) WHERE is_default;
CREATE INDEX idx_organization_memberships_user
    ON organization_memberships (user_id, is_default);

CREATE TEMPORARY TABLE legacy_user_organizations ON COMMIT DROP AS
SELECT id AS user_id, gen_random_uuid() AS organization_id
FROM users;

INSERT INTO organizations (id, name, created_at)
SELECT legacy.organization_id,
       left(COALESCE(NULLIF(btrim(u.company_name), ''), u.first_name || ' ' || u.last_name || ' workspace'), 150),
       u.created_at
FROM users u
JOIN legacy_user_organizations legacy ON legacy.user_id = u.id;

INSERT INTO organization_memberships (organization_id, user_id, role, is_default, created_at)
SELECT legacy.organization_id, u.id, 'OWNER', true, u.created_at
FROM users u
JOIN legacy_user_organizations legacy ON legacy.user_id = u.id;

ALTER TABLE projects ADD COLUMN organization_id uuid;
UPDATE projects p
SET organization_id = m.organization_id
FROM organization_memberships m
WHERE m.user_id = p.owner_id AND m.is_default;
ALTER TABLE projects ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE projects ADD CONSTRAINT fk_projects_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id);
CREATE INDEX idx_projects_organization_updated
    ON projects (organization_id, updated_at DESC, id DESC);

ALTER TABLE themes ADD COLUMN organization_id uuid;
UPDATE themes t
SET organization_id = m.organization_id
FROM organization_memberships m
WHERE m.user_id = t.owner_id AND m.is_default;
ALTER TABLE themes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE themes ADD CONSTRAINT fk_themes_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id);

ALTER TABLE projects DROP CONSTRAINT fk_projects_theme_owner;
ALTER TABLE themes DROP CONSTRAINT uk_themes_owner_name;
ALTER TABLE themes ADD CONSTRAINT uk_themes_id_organization UNIQUE (id, organization_id);
ALTER TABLE projects ADD CONSTRAINT fk_projects_theme_organization
    FOREIGN KEY (theme_id, organization_id) REFERENCES themes(id, organization_id)
    ON DELETE SET NULL (theme_id);
CREATE UNIQUE INDEX uk_themes_organization_name
    ON themes (organization_id, lower(name));
CREATE INDEX idx_themes_organization_updated
    ON themes (organization_id, updated_at DESC, id DESC);

CREATE TABLE themes (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name varchar(80) NOT NULL,
    configuration jsonb NOT NULL,
    created_at timestamp NOT NULL,
    updated_at timestamp NOT NULL,
    CONSTRAINT uk_themes_owner_name UNIQUE (owner_id, name),
    CONSTRAINT uk_themes_id_owner UNIQUE (id, owner_id)
);
CREATE INDEX idx_themes_owner_updated ON themes (owner_id, updated_at DESC, id DESC);

ALTER TABLE projects ADD COLUMN theme_id uuid;
ALTER TABLE projects ADD CONSTRAINT fk_projects_theme_owner
    FOREIGN KEY (theme_id, owner_id) REFERENCES themes(id, owner_id);
CREATE INDEX idx_projects_theme ON projects (theme_id) WHERE theme_id IS NOT NULL;

ALTER TABLE projects ADD COLUMN site_role varchar(12);
ALTER TABLE projects ADD CONSTRAINT ck_projects_site_role CHECK (site_role IS NULL OR site_role = 'ROOT');
CREATE UNIQUE INDEX uq_projects_root_site ON projects(site_role) WHERE site_role = 'ROOT';

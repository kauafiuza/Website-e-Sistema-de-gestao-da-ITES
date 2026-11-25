ALTER TABLE projects
    ADD COLUMN route_blueprint jsonb NOT NULL DEFAULT '[]'::jsonb;

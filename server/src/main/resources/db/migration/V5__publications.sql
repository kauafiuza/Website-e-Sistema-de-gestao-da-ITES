CREATE TABLE publications (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    public_key varchar(190) NOT NULL UNIQUE,
    active boolean NOT NULL DEFAULT true,
    current_version integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE publication_versions (
    id uuid PRIMARY KEY,
    publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    document jsonb NOT NULL,
    route_blueprint jsonb NOT NULL,
    project_revision bigint NOT NULL,
    published_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    UNIQUE (publication_id, version_number)
);
CREATE INDEX idx_publication_versions_retention ON publication_versions(publication_id, version_number DESC);

CREATE TABLE publication_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    event_type varchar(20) NOT NULL CHECK (event_type IN ('view', 'interaction')),
    occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_publication_events_stats ON publication_events(publication_id, occurred_at);

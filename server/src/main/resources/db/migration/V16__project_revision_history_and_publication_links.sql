CREATE TABLE project_revisions (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    revision_number bigint NOT NULL,
    revision_kind varchar(24) NOT NULL CHECK (revision_kind IN ('DRAFT', 'PUBLICATION_SNAPSHOT')),
    document jsonb NOT NULL,
    route_blueprint jsonb NOT NULL,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_project_draft_revision_number
    ON project_revisions(project_id, revision_number)
    WHERE revision_kind = 'DRAFT';
CREATE INDEX idx_project_revisions_history
    ON project_revisions(project_id, revision_number DESC, id DESC)
    WHERE revision_kind = 'DRAFT';

INSERT INTO project_revisions
    (id, project_id, revision_number, revision_kind, document, route_blueprint, created_by, created_at)
SELECT gen_random_uuid(), p.id, p.revision, 'DRAFT', p.document, p.route_blueprint, p.owner_id,
       COALESCE(p.updated_at AT TIME ZONE 'UTC', now())
FROM projects p;

-- Remove publication versions already outside the exposed retention window.
DELETE FROM publication_versions v
USING publications p
WHERE p.id = v.publication_id
  AND ((v.expires_at IS NOT NULL AND v.expires_at <= now())
       OR v.version_number < GREATEST(p.current_version - 2, 1));

-- Preserve an identified immutable snapshot for every retained legacy publication version.
INSERT INTO project_revisions
    (id, project_id, revision_number, revision_kind, document, route_blueprint, created_by, created_at)
SELECT v.id, p.project_id, v.project_revision, 'PUBLICATION_SNAPSHOT',
       v.document, v.route_blueprint, pr.owner_id, v.published_at
FROM publication_versions v
JOIN publications p ON p.id = v.publication_id
JOIN projects pr ON pr.id = p.project_id;

ALTER TABLE publication_versions ADD COLUMN project_revision_id uuid;
UPDATE publication_versions SET project_revision_id = id;
ALTER TABLE publication_versions ALTER COLUMN project_revision_id SET NOT NULL;
ALTER TABLE publication_versions
    ADD CONSTRAINT fk_publication_version_project_revision
        FOREIGN KEY (project_revision_id) REFERENCES project_revisions(id) ON DELETE CASCADE;
CREATE INDEX idx_publication_versions_project_revision
    ON publication_versions(project_revision_id);

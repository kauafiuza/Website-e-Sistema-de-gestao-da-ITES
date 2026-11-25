ALTER TABLE organization_permission_grants
    DROP CONSTRAINT ck_organization_grant_action;

ALTER TABLE organization_permission_grants
    ADD CONSTRAINT ck_organization_grant_action CHECK (action IN (
        'PROJECT_READ', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_DELETE',
        'THEME_READ', 'THEME_CREATE', 'THEME_UPDATE', 'THEME_DELETE',
        'PUBLICATION_READ', 'PUBLICATION_MANAGE', 'PUBLICATION_APPROVE',
        'PUBLICATION_ANALYTICS_READ', 'PUBLICATION_SUBMISSIONS_READ',
        'PUBLICATION_SUBMISSIONS_EXPORT', 'PUBLICATION_ACTIVITY_READ',
        'ORGANIZATION_GRANTS_READ', 'ORGANIZATION_GRANTS_MANAGE'
    ));

ALTER TABLE organization_permission_grants
    DROP CONSTRAINT ck_organization_grant_authority_origin;

ALTER TABLE organization_permission_grants
    ADD CONSTRAINT ck_organization_grant_authority_origin CHECK (
        (authority_grant_id IS NULL OR (action IN ('PUBLICATION_SUBMISSIONS_EXPORT', 'PUBLICATION_APPROVE') AND parent_grant_id IS NULL))
        AND (action <> 'PUBLICATION_SUBMISSIONS_EXPORT' OR parent_grant_id IS NOT NULL OR authority_grant_id IS NOT NULL)
        AND (action <> 'PUBLICATION_APPROVE' OR (parent_grant_id IS NULL AND authority_grant_id IS NOT NULL))
    );

CREATE TABLE publication_review_requests (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_revision_id uuid NOT NULL REFERENCES project_revisions(id) ON DELETE CASCADE,
    operation varchar(16) NOT NULL CHECK (operation IN ('PUBLISH', 'RESTORE')),
    target_version integer,
    requester_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approver_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    state varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    decided_at timestamptz,
    consumed_at timestamptz,
    CONSTRAINT ck_publication_review_target CHECK (
        (operation = 'PUBLISH' AND target_version IS NULL)
        OR (operation = 'RESTORE' AND target_version IS NOT NULL AND target_version > 0)
    ),
    CONSTRAINT ck_publication_review_approver CHECK (
        state = 'PENDING' OR decided_at IS NOT NULL
    )
);

CREATE INDEX idx_publication_reviews_project_state
    ON publication_review_requests(project_id, state, created_at DESC);
CREATE INDEX idx_publication_reviews_revision
    ON publication_review_requests(project_revision_id, operation, target_version, state);

CREATE TABLE organization_permission_grants (
    id uuid PRIMARY KEY,
    beneficiary_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    action varchar(48) NOT NULL,
    scope_type varchar(20) NOT NULL CHECK (scope_type IN ('ORGANIZATION', 'PROJECT', 'THEME')),
    scope_id uuid NOT NULL,
    issuer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    valid_until timestamptz,
    state varchar(16) NOT NULL DEFAULT 'ACTIVE' CHECK (state IN ('ACTIVE', 'REVOKED')),
    can_delegate boolean NOT NULL DEFAULT false,
    parent_grant_id uuid REFERENCES organization_permission_grants(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    CONSTRAINT ck_organization_grant_action CHECK (action IN (
        'PROJECT_READ', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_DELETE',
        'THEME_READ', 'THEME_CREATE', 'THEME_UPDATE', 'THEME_DELETE',
        'PUBLICATION_READ', 'PUBLICATION_MANAGE', 'PUBLICATION_ANALYTICS_READ',
        'PUBLICATION_SUBMISSIONS_READ', 'PUBLICATION_ACTIVITY_READ',
        'ORGANIZATION_GRANTS_READ', 'ORGANIZATION_GRANTS_MANAGE'
    )),
    CONSTRAINT ck_organization_grant_scope CHECK (
        (scope_type = 'ORGANIZATION' AND scope_id = organization_id)
        OR (scope_type IN ('PROJECT', 'THEME') AND scope_id <> organization_id)
    ),
    CONSTRAINT ck_organization_grant_parent_not_self CHECK (parent_grant_id IS NULL OR parent_grant_id <> id)
);

CREATE INDEX idx_organization_grants_beneficiary
    ON organization_permission_grants (beneficiary_user_id, organization_id, action, state);
CREATE INDEX idx_organization_grants_parent
    ON organization_permission_grants (parent_grant_id) WHERE parent_grant_id IS NOT NULL;
CREATE INDEX idx_organization_grants_scope
    ON organization_permission_grants (organization_id, scope_type, scope_id, action, state);

INSERT INTO organization_permission_grants
    (id, beneficiary_user_id, organization_id, action, scope_type, scope_id, issuer_user_id,
     valid_until, state, can_delegate, parent_grant_id, created_at)
SELECT gen_random_uuid(), m.user_id, m.organization_id, permission.action, 'ORGANIZATION',
       m.organization_id, owner.user_id, NULL, 'ACTIVE', m.role = 'OWNER', NULL, now()
FROM organization_memberships m
JOIN LATERAL (
    SELECT user_id FROM organization_memberships
    WHERE organization_id = m.organization_id AND role = 'OWNER'
    ORDER BY created_at, user_id LIMIT 1
) owner ON true
CROSS JOIN (VALUES
    ('PROJECT_READ'), ('PROJECT_CREATE'), ('PROJECT_UPDATE'), ('PROJECT_DELETE'),
    ('THEME_READ'), ('THEME_CREATE'), ('THEME_UPDATE'), ('THEME_DELETE'),
    ('PUBLICATION_READ'), ('PUBLICATION_MANAGE'), ('PUBLICATION_ANALYTICS_READ'),
    ('PUBLICATION_SUBMISSIONS_READ'), ('PUBLICATION_ACTIVITY_READ'),
    ('ORGANIZATION_GRANTS_READ'), ('ORGANIZATION_GRANTS_MANAGE')
) AS permission(action)
WHERE m.role = 'OWNER' OR permission.action <> 'ORGANIZATION_GRANTS_MANAGE';

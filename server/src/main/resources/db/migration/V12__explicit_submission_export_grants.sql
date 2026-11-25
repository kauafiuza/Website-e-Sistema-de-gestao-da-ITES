ALTER TABLE organization_permission_grants
    ADD COLUMN authority_grant_id uuid;

ALTER TABLE organization_permission_grants
    ADD CONSTRAINT uq_organization_grant_id_org UNIQUE (id, organization_id);

ALTER TABLE organization_permission_grants
    ADD CONSTRAINT fk_organization_grant_authority
        FOREIGN KEY (authority_grant_id, organization_id)
        REFERENCES organization_permission_grants (id, organization_id)
        ON DELETE CASCADE;

ALTER TABLE organization_permission_grants
    DROP CONSTRAINT ck_organization_grant_action;

ALTER TABLE organization_permission_grants
    ADD CONSTRAINT ck_organization_grant_action CHECK (action IN (
        'PROJECT_READ', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_DELETE',
        'THEME_READ', 'THEME_CREATE', 'THEME_UPDATE', 'THEME_DELETE',
        'PUBLICATION_READ', 'PUBLICATION_MANAGE', 'PUBLICATION_ANALYTICS_READ',
        'PUBLICATION_SUBMISSIONS_READ', 'PUBLICATION_SUBMISSIONS_EXPORT',
        'PUBLICATION_ACTIVITY_READ', 'ORGANIZATION_GRANTS_READ', 'ORGANIZATION_GRANTS_MANAGE'
    ));

ALTER TABLE organization_permission_grants
    ADD CONSTRAINT ck_organization_grant_authority_origin CHECK (
        (authority_grant_id IS NULL OR (action = 'PUBLICATION_SUBMISSIONS_EXPORT' AND parent_grant_id IS NULL))
        AND (action <> 'PUBLICATION_SUBMISSIONS_EXPORT' OR parent_grant_id IS NOT NULL OR authority_grant_id IS NOT NULL)
    );

CREATE INDEX idx_organization_grants_authority
    ON organization_permission_grants (authority_grant_id) WHERE authority_grant_id IS NOT NULL;

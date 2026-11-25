CREATE TABLE organization_audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    action varchar(64) NOT NULL,
    target_type varchar(32) NOT NULL,
    target_id uuid NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_organization_audit_action CHECK (action IN (
        'INVITATION_CREATED', 'INVITATION_REVOKED', 'MEMBERSHIP_ACCEPTED', 'MEMBERSHIP_REVOKED',
        'PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'REVIEW_REQUESTED', 'REVIEW_APPROVED', 'REVIEW_REJECTED',
        'PUBLICATION_PUBLISHED', 'PUBLICATION_ACTIVATED', 'PUBLICATION_DEACTIVATED',
        'PUBLICATION_RESTORED', 'PROJECT_REVISION_RESTORED', 'PROJECT_DELETED', 'THEME_DELETED',
        'SUBMISSIONS_READ', 'SUBMISSIONS_EXPORTED', 'PAGE_TEMPLATE_CREATED',
        'PAGE_TEMPLATE_VERSION_CREATED', 'PAGE_TEMPLATE_ARCHIVED'
    )),
    CONSTRAINT ck_organization_audit_target_type CHECK (target_type IN (
        'INVITATION', 'MEMBERSHIP', 'PERMISSION_GRANT', 'PUBLICATION_REVIEW',
        'PUBLICATION', 'PROJECT', 'THEME', 'SUBMISSIONS', 'PAGE_TEMPLATE'
    ))
);

CREATE INDEX idx_organization_audit_events_tenant_page
    ON organization_audit_events (organization_id, occurred_at DESC, id DESC);

CREATE FUNCTION reject_organization_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'organization audit events are append-only';
END;
$$;

CREATE TRIGGER trg_organization_audit_events_immutable
    BEFORE UPDATE OR DELETE ON organization_audit_events
    FOR EACH ROW EXECUTE FUNCTION reject_organization_audit_event_mutation();

CREATE TRIGGER trg_organization_audit_events_no_truncate
    BEFORE TRUNCATE ON organization_audit_events
    FOR EACH STATEMENT EXECUTE FUNCTION reject_organization_audit_event_mutation();

ALTER TABLE organization_permission_grants
    DROP CONSTRAINT ck_organization_grant_action;

ALTER TABLE organization_permission_grants
    ADD CONSTRAINT ck_organization_grant_action CHECK (action IN (
        'PROJECT_READ', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_DELETE',
        'THEME_READ', 'THEME_CREATE', 'THEME_UPDATE', 'THEME_DELETE',
        'PUBLICATION_READ', 'PUBLICATION_MANAGE', 'PUBLICATION_APPROVE',
        'PUBLICATION_ANALYTICS_READ', 'PUBLICATION_SUBMISSIONS_READ',
        'PUBLICATION_SUBMISSIONS_EXPORT', 'PUBLICATION_ACTIVITY_READ',
        'ORGANIZATION_GRANTS_READ', 'ORGANIZATION_GRANTS_MANAGE', 'ORGANIZATION_AUDIT_READ'
    ));

ALTER TABLE organization_permission_grants
    DROP CONSTRAINT ck_organization_grant_authority_origin;

ALTER TABLE organization_permission_grants
    ADD CONSTRAINT ck_organization_grant_authority_origin CHECK (
        (authority_grant_id IS NULL OR (action IN ('PUBLICATION_SUBMISSIONS_EXPORT', 'PUBLICATION_APPROVE', 'ORGANIZATION_AUDIT_READ') AND parent_grant_id IS NULL))
        AND (action <> 'PUBLICATION_SUBMISSIONS_EXPORT' OR parent_grant_id IS NOT NULL OR authority_grant_id IS NOT NULL)
        AND (action <> 'PUBLICATION_APPROVE' OR (parent_grant_id IS NULL AND authority_grant_id IS NOT NULL))
        AND (action <> 'ORGANIZATION_AUDIT_READ' OR (scope_type = 'ORGANIZATION' AND scope_id = organization_id AND parent_grant_id IS NULL AND authority_grant_id IS NOT NULL AND can_delegate = false))
    );

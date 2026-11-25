ALTER TABLE organization_memberships
    ADD COLUMN state varchar(16) NOT NULL DEFAULT 'ACTIVE'
        CHECK (state IN ('ACTIVE', 'REVOKED'));

CREATE TABLE organization_invitations (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email varchar(254) NOT NULL,
    role varchar(20) NOT NULL DEFAULT 'MEMBER' CHECK (role = 'MEMBER'),
    token_hash varchar(64) NOT NULL UNIQUE,
    state varchar(16) NOT NULL DEFAULT 'PENDING'
        CHECK (state IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    invited_by_user_id uuid NOT NULL REFERENCES users(id),
    accepted_user_id uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    accepted_at timestamptz,
    revoked_at timestamptz
);

CREATE UNIQUE INDEX uk_organization_invitations_pending_email
    ON organization_invitations (organization_id, lower(email))
    WHERE state = 'PENDING';
CREATE INDEX idx_organization_invitations_org_state
    ON organization_invitations (organization_id, state, created_at DESC);

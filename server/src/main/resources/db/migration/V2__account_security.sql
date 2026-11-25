ALTER TABLE users ADD COLUMN email_verified_at timestamp with time zone;
ALTER TABLE users ADD COLUMN password_changed_at timestamp with time zone;
ALTER TABLE users ADD COLUMN terms_accepted_at timestamp with time zone;
CREATE UNIQUE INDEX uk_users_email_lower ON users (lower(email));

CREATE TABLE email_tokens (
    id uuid PRIMARY KEY,
    purpose varchar(24) NOT NULL,
    token_hash varchar(64) NOT NULL UNIQUE,
    email varchar(254) NOT NULL,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    request_ip varchar(45),
    attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX idx_email_tokens_email_purpose ON email_tokens (email, purpose, created_at DESC);
CREATE INDEX idx_email_tokens_expires ON email_tokens (expires_at);

CREATE TABLE user_sessions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL,
    last_seen_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    absolute_expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    revoke_reason varchar(32),
    user_agent varchar(255),
    ip varchar(45)
);
CREATE INDEX idx_user_sessions_user ON user_sessions (user_id, revoked_at);

ALTER TABLE refresh_tokens ADD COLUMN session_id uuid REFERENCES user_sessions(id) ON DELETE CASCADE;
ALTER TABLE refresh_tokens ADD COLUMN created_at timestamp with time zone;
ALTER TABLE refresh_tokens ADD COLUMN rotated_at timestamp with time zone;
CREATE INDEX idx_refresh_tokens_session ON refresh_tokens (session_id);

CREATE TABLE user_two_factor (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    secret_enc text NOT NULL,
    enabled_at timestamp with time zone,
    last_step bigint,
    created_at timestamp with time zone NOT NULL
);
CREATE TABLE user_recovery_codes (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash varchar(64) NOT NULL,
    used_at timestamp with time zone
);
CREATE INDEX idx_user_recovery_codes_user ON user_recovery_codes (user_id);

CREATE TABLE users (
    id uuid PRIMARY KEY,
    first_name varchar(80) NOT NULL,
    last_name varchar(80) NOT NULL,
    email varchar(254) NOT NULL,
    password_hash text NOT NULL,
    company_name varchar(150),
    active boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL,
    updated_at timestamp NOT NULL,
    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE projects (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL CONSTRAINT fk_projects_owner REFERENCES users(id),
    name varchar(150) NOT NULL,
    document jsonb NOT NULL,
    revision bigint NOT NULL DEFAULT 1,
    created_at timestamp NOT NULL,
    updated_at timestamp NOT NULL
);
CREATE INDEX idx_projects_owner_updated ON projects (owner_id, updated_at DESC, id DESC);

CREATE TABLE refresh_tokens (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    token_hash varchar(64) NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

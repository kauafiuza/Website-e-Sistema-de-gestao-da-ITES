-- Cria o modelo relacional acadêmico em um banco PostgreSQL vazio e dedicado.
CREATE TABLE users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  whatsapp text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE permissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  description text NOT NULL
);

CREATE TABLE user_roles (
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id bigint NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE organizations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  economic_sector text NOT NULL,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE demands (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text GENERATED ALWAYS AS ('ITES-' || lpad(id::text, 8, '0')) STORED UNIQUE,
  requester_id bigint NOT NULL REFERENCES users(id),
  organization_id bigint REFERENCES organizations(id),
  capacity text NOT NULL CHECK (capacity IN ('GROUP','FORUM','PARTNER','OTHER')),
  capacity_other text,
  service text NOT NULL,
  description text NOT NULL CHECK (length(btrim(description)) >= 10),
  urgency text NOT NULL CHECK (urgency IN ('LOW','MEDIUM','HIGH')),
  status text NOT NULL DEFAULT 'Pendente'
    CHECK (status IN ('Pendente','Aceita para atendimento','Em atendimento','Concluída','Recusada','Cancelada')),
  completion_note text,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demands_capacity_other_check
    CHECK (capacity <> 'OTHER' OR nullif(btrim(capacity_other), '') IS NOT NULL),
  CONSTRAINT demands_completion_check
    CHECK (status <> 'Concluída' OR nullif(btrim(completion_note), '') IS NOT NULL)
);
CREATE INDEX demands_requester_idx ON demands(requester_id, created_at DESC);
CREATE INDEX demands_status_idx ON demands(status, created_at DESC);
CREATE INDEX demands_organization_status_idx ON demands(organization_id, status);

CREATE TABLE demand_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  demand_id bigint NOT NULL REFERENCES demands(id),
  actor_id bigint NOT NULL REFERENCES users(id),
  old_status text NOT NULL CHECK (old_status IN ('Pendente','Aceita para atendimento','Em atendimento')),
  new_status text NOT NULL CHECK (new_status IN ('Aceita para atendimento','Em atendimento','Concluída','Recusada','Cancelada')),
  justification text NOT NULL CHECK (length(btrim(justification)) > 0),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demand_events_demand_time_idx ON demand_events(demand_id, occurred_at DESC);
CREATE INDEX demand_events_actor_time_idx ON demand_events(actor_id, occurred_at DESC);

CREATE TABLE pages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  published_version_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE page_versions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page_id bigint NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  author_id bigint NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, revision),
  UNIQUE (page_id, id)
);

ALTER TABLE pages ADD CONSTRAINT pages_published_fk
  FOREIGN KEY (id, published_version_id) REFERENCES page_versions(page_id, id);

CREATE TABLE page_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page_id bigint NOT NULL REFERENCES pages(id),
  version_id bigint,
  actor_id bigint NOT NULL REFERENCES users(id),
  action text NOT NULL CHECK (action IN ('PUBLISH','UNPUBLISH')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (page_id, version_id) REFERENCES page_versions(page_id, id)
);
CREATE INDEX page_events_page_time_idx ON page_events(page_id, occurred_at DESC);

CREATE TABLE grant_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id bigint NOT NULL REFERENCES users(id),
  subject_user_id bigint NOT NULL REFERENCES users(id),
  role_id bigint NOT NULL REFERENCES roles(id),
  action text NOT NULL CHECK (action IN ('GRANT','REVOKE')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX grant_audit_subject_time_idx ON grant_audit(subject_user_id, occurred_at DESC);

ALTER TABLE organizations ADD COLUMN economic_sector varchar(120);
CREATE TABLE app_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(48) NOT NULL UNIQUE,
  name varchar(100) NOT NULL
);
CREATE TABLE app_permissions (
  code varchar(80) PRIMARY KEY,
  description varchar(240) NOT NULL
);
CREATE TABLE app_user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
CREATE TABLE app_role_permissions (
  role_id uuid NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
  permission_code varchar(80) NOT NULL REFERENCES app_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);
CREATE TABLE app_grant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES users(id),
  subject_id uuid NOT NULL REFERENCES users(id),
  role_id uuid NOT NULL REFERENCES app_roles(id),
  action varchar(12) NOT NULL CHECK (action IN ('GRANT','REVOKE')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app_roles(code,name) VALUES ('REQUESTER','Solicitante'),('ADMINISTRATOR','Administrador'),('DEMAND_MANAGER','Gestor de demandas'),('COLLABORATOR','Colaborador');
INSERT INTO app_permissions(code,description) VALUES
('users.read','Consultar usuários'),('users.manage','Gerenciar usuários'),('roles.manage','Gerenciar papéis'),
('demands.read','Consultar demandas'),('demands.review','Classificar demandas'),('demands.decide','Decidir demandas'),
('portal.content.manage','Gerenciar conteúdo'),('builder.access','Abrir editor'),('builder.pages.edit','Editar páginas'),
('builder.pages.publish','Publicar páginas'),('builder.templates.manage','Gerenciar modelos');
INSERT INTO app_role_permissions(role_id,permission_code)
SELECT r.id,p.code FROM app_roles r CROSS JOIN app_permissions p WHERE r.code='ADMINISTRATOR';
CREATE TABLE demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(32) NOT NULL UNIQUE DEFAULT ('ITES-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  requester_id uuid NOT NULL REFERENCES users(id),
  organization_id uuid REFERENCES organizations(id),
  capacity varchar(16) NOT NULL CHECK (capacity IN ('GROUP','FORUM','PARTNER','OTHER')),
  capacity_other text,
  service varchar(100) NOT NULL,
  description text NOT NULL CHECK (length(btrim(description)) >= 10),
  urgency varchar(8) NOT NULL CHECK (urgency IN ('LOW','MEDIUM','HIGH')),
  status varchar(32) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente','Aceita para atendimento','Em atendimento','Concluída','Recusada','Cancelada')),
  completion_note text,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demands_capacity_other_check CHECK (capacity <> 'OTHER' OR nullif(btrim(capacity_other),'') IS NOT NULL),
  CONSTRAINT demands_completion_check CHECK (status <> 'Concluída' OR nullif(btrim(completion_note),'') IS NOT NULL)
);
CREATE INDEX demands_requester_created_idx ON demands(requester_id,created_at DESC);
CREATE INDEX demands_status_created_idx ON demands(status,created_at DESC);
CREATE TABLE demand_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES demands(id),
  actor_id uuid NOT NULL REFERENCES users(id),
  old_status varchar(32) NOT NULL,
  new_status varchar(32) NOT NULL,
  justification text NOT NULL CHECK (length(btrim(justification)) > 0),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE institutional_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(100) NOT NULL UNIQUE,
  title varchar(180) NOT NULL,
  published_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE institutional_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES institutional_pages(id),
  revision integer NOT NULL CHECK (revision > 0),
  document jsonb NOT NULL CHECK (jsonb_typeof(document)='object'),
  author_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_id,revision), UNIQUE(page_id,id)
);
CREATE TABLE institutional_page_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES institutional_pages(id),
  version_id uuid REFERENCES institutional_page_versions(id),
  actor_id uuid NOT NULL REFERENCES users(id),
  action varchar(12) NOT NULL CHECK (action IN ('PUBLISH','UNPUBLISH')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE institutional_pages ADD CONSTRAINT institutional_page_published_fk
FOREIGN KEY(id,published_version_id) REFERENCES institutional_page_versions(page_id,id);
INSERT INTO institutional_pages(slug,title) VALUES
('inicio','Início'),('quem-somos','Quem somos'),('projetos','Projetos e empreendimentos'),('noticias','Notícias e agenda'),
('publicacoes','Publicações e biblioteca'),('ferramentas','Aplicativos e ferramentas'),('contato','Redes sociais e contato');
CREATE FUNCTION ites_demand_transition_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status <> OLD.status AND NOT (
   (OLD.status='Pendente' AND NEW.status IN ('Aceita para atendimento','Recusada','Cancelada')) OR
   (OLD.status='Aceita para atendimento' AND NEW.status IN ('Em atendimento','Cancelada')) OR
   (OLD.status='Em atendimento' AND NEW.status IN ('Concluída','Cancelada'))
 ) THEN RAISE EXCEPTION 'transição de demanda inválida'; END IF;
 NEW.updated_at=now();
 RETURN NEW;
END $$;
CREATE TRIGGER ites_demand_transition_guard BEFORE UPDATE ON demands
FOR EACH ROW EXECUTE FUNCTION ites_demand_transition_guard();

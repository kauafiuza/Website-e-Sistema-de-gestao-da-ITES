-- Execute como proprietário do banco em um ambiente acadêmico isolado.
-- Contas LOGIN são provisionadas pelo administrador fora do repositório.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ites_runtime') THEN
    CREATE ROLE ites_runtime NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ites_reporting') THEN
    CREATE ROLE ites_reporting NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ites_migration') THEN
    CREATE ROLE ites_migration NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ites_database_admin') THEN
    CREATE ROLE ites_database_admin NOLOGIN;
  END IF;
END
$$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ites_runtime, ites_reporting;
GRANT USAGE, CREATE ON SCHEMA public TO ites_migration, ites_database_admin;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC;

GRANT SELECT, INSERT ON users TO ites_runtime;
GRANT UPDATE(name, whatsapp) ON users TO ites_runtime;
GRANT SELECT, INSERT, UPDATE(name, economic_sector, contact_email) ON organizations TO ites_runtime;
GRANT SELECT, INSERT(requester_id, organization_id, capacity, capacity_other, service, description, urgency)
  ON demands TO ites_runtime;
GRANT UPDATE(review_notes) ON demands TO ites_runtime;
GRANT SELECT ON demands, demand_events, organizations, roles, permissions,
  user_roles, role_permissions, grant_audit, pages, page_versions, page_events TO ites_runtime;
GRANT INSERT(page_id, revision, document, author_id) ON page_versions TO ites_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ites_runtime;

GRANT EXECUTE ON PROCEDURE transition_demand(bigint, bigint, text, text, text) TO ites_runtime;
GRANT EXECUTE ON PROCEDURE publish_page(bigint, bigint, bigint) TO ites_runtime;
GRANT EXECUTE ON PROCEDURE unpublish_page(bigint, bigint) TO ites_runtime;
GRANT EXECUTE ON PROCEDURE assign_role(bigint, bigint, bigint) TO ites_runtime;
GRANT EXECUTE ON PROCEDURE revoke_role(bigint, bigint, bigint) TO ites_runtime;
GRANT EXECUTE ON FUNCTION demand_count(text) TO ites_runtime, ites_reporting;
GRANT EXECUTE ON FUNCTION requester_demand_count(bigint) TO ites_runtime;
GRANT EXECUTE ON FUNCTION published_page_count() TO ites_runtime, ites_reporting;

CREATE VIEW demand_reporting WITH (security_barrier = true) AS
SELECT status, urgency, service, count(*) AS demand_total
FROM demands
GROUP BY status, urgency, service;
GRANT SELECT ON demand_reporting TO ites_reporting;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ites_migration;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ites_migration;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ites_database_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ites_database_admin;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO ites_database_admin;

-- Após criar contas LOGIN fora do repositório, associe-as a um grupo apropriado:
-- GRANT ites_runtime TO ites_app_login;
-- GRANT ites_reporting TO ites_report_login;
-- GRANT ites_migration TO ites_migration_login;
-- Não conceda ites_database_admin à conta de execução da aplicação.

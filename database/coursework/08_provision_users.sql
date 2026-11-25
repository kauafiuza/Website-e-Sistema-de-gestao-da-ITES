-- Execute no banco validado por uma conta administradora.
-- Os comandos \password solicitam credenciais sem exibi-las ou armazená-las no repositório.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ites_app_login') THEN
    CREATE ROLE ites_app_login NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ites_reporting_login') THEN
    CREATE ROLE ites_reporting_login NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ites_migration_login') THEN
    CREATE ROLE ites_migration_login NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ites_database_admin_login') THEN
    CREATE ROLE ites_database_admin_login NOLOGIN;
  END IF;
END
$$;

\password ites_app_login
ALTER ROLE ites_app_login LOGIN;
GRANT ites_runtime TO ites_app_login;

\password ites_reporting_login
ALTER ROLE ites_reporting_login LOGIN;
GRANT ites_reporting TO ites_reporting_login;

\password ites_migration_login
ALTER ROLE ites_migration_login LOGIN;
GRANT ites_migration TO ites_migration_login;

\password ites_database_admin_login
ALTER ROLE ites_database_admin_login LOGIN;
GRANT ites_database_admin TO ites_database_admin_login;

SELECT rolname, rolcanlogin
FROM pg_roles
WHERE rolname IN ('ites_app_login','ites_reporting_login','ites_migration_login','ites_database_admin_login')
ORDER BY rolname;

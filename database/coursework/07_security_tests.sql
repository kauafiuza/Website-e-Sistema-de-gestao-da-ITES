-- Executar depois de 05_security.sql no mesmo banco da carga demonstrativa.
-- Os blocos capturam negações esperadas e falham se uma operação indevida for aceita.
SET ROLE ites_runtime;

SELECT count(*) AS leitura_autorizada FROM demands;
SELECT demand_count('Pendente') AS indicador_autorizado;

DO $$
DECLARE
  actor_id bigint;
  v_demand_id bigint;
  denied boolean;
BEGIN
  SELECT id INTO actor_id FROM users WHERE email = 'pessoa26@example.invalid';
  INSERT INTO demands(requester_id, capacity, service, description, urgency)
  VALUES (actor_id, 'GROUP', 'formação', 'Registro autorizado de validação', 'MEDIUM')
  RETURNING id INTO v_demand_id;
  CALL transition_demand(v_demand_id, actor_id, 'Aceita para atendimento', 'Decisão via rotina autorizada');
  IF (SELECT status FROM demands WHERE id = v_demand_id) <> 'Aceita para atendimento' THEN
    RAISE EXCEPTION 'a escrita autorizada não persistiu a decisão';
  END IF;

  denied := false;
  BEGIN
    UPDATE demands SET status = 'Recusada' WHERE id = v_demand_id;
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'o papel runtime não deveria alterar a situação diretamente';
  END IF;

  denied := false;
  BEGIN
    DELETE FROM demand_events WHERE demand_events.demand_id = v_demand_id;
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'o papel runtime não deveria excluir histórico';
  END IF;

  denied := false;
  BEGIN
    INSERT INTO demands(requester_id, capacity, service, description, urgency)
    VALUES (999999, 'GROUP', 'formação', 'Referência inexistente para teste', 'LOW');
  EXCEPTION WHEN foreign_key_violation THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'a chave estrangeira deveria impedir solicitante inexistente';
  END IF;

  denied := false;
  BEGIN
    EXECUTE 'CREATE TABLE public.runtime_schema_bypass(id integer)';
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'o papel runtime não deveria criar objetos no schema';
  END IF;
END
$$;

RESET ROLE;
SET ROLE ites_reporting;

SELECT * FROM demand_reporting ORDER BY status, urgency, service;
SELECT published_page_count() AS published_pages_for_reporting;

DO $$
DECLARE
  denied boolean := false;
BEGIN
  BEGIN
    PERFORM password_hash FROM users LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'o papel de relatórios não deveria ler credenciais';
  END IF;

  denied := false;
  BEGIN
    PERFORM 1 FROM demands LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'o papel de relatórios deveria consultar somente a visão agregada';
  END IF;

  denied := false;
  BEGIN
    CALL transition_demand(1, 26, 'Recusada', 'Decisão sem autorização');
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'o papel de relatórios não deveria executar rotinas de escrita';
  END IF;
END
$$;

RESET ROLE;
SET ROLE ites_migration;
CREATE TABLE public.migration_privilege_probe(id integer PRIMARY KEY);
DROP TABLE public.migration_privilege_probe;
RESET ROLE;

SELECT 'security_tests_passed' AS result;

SELECT 'users' AS table_name, count(*) AS rows FROM users
UNION ALL SELECT 'roles', count(*) FROM roles
UNION ALL SELECT 'permissions', count(*) FROM permissions
UNION ALL SELECT 'user_roles', count(*) FROM user_roles
UNION ALL SELECT 'role_permissions', count(*) FROM role_permissions
UNION ALL SELECT 'organizations', count(*) FROM organizations
UNION ALL SELECT 'demands', count(*) FROM demands
UNION ALL SELECT 'demand_events', count(*) FROM demand_events
UNION ALL SELECT 'pages', count(*) FROM pages
UNION ALL SELECT 'page_versions', count(*) FROM page_versions
UNION ALL SELECT 'page_events', count(*) FROM page_events
UNION ALL SELECT 'grant_audit', count(*) FROM grant_audit
ORDER BY table_name;

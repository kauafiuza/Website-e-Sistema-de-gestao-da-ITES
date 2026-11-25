-- =====================================================================
-- APD1 - Funções, gatilhos e procedimentos do Sistema de Gestão
-- =====================================================================

-- ---------------------------------------------------------------------
-- PARTE A - FUNÇÕES DE LEITURA
-- ---------------------------------------------------------------------

-- A1. Contagem de demandas por situação.
CREATE FUNCTION demand_count(p_status text)
RETURNS bigint
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT count(*) FROM demands WHERE status = p_status $$;

-- A2. Contagem de demandas de um solicitante.
CREATE FUNCTION requester_demand_count(p_user_id bigint)
RETURNS bigint
LANGUAGE sql STABLE
AS $$ SELECT count(*) FROM demands WHERE requester_id = p_user_id $$;

-- A3. Contagem de páginas publicadas no portal.
CREATE FUNCTION published_page_count()
RETURNS bigint
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT count(*) FROM pages WHERE published_version_id IS NOT NULL $$;

-- ---------------------------------------------------------------------
-- PARTE B - GATILHOS DE VALIDAÇÃO E AUDITORIA
-- ---------------------------------------------------------------------

-- B1. Validação das mudanças de situação das demandas.
CREATE FUNCTION transition_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> OLD.status AND NOT (
    (OLD.status = 'Pendente' AND NEW.status IN ('Aceita para atendimento','Recusada','Cancelada')) OR
    (OLD.status = 'Aceita para atendimento' AND NEW.status IN ('Em atendimento','Cancelada')) OR
    (OLD.status = 'Em atendimento' AND NEW.status IN ('Concluída','Cancelada'))
  ) THEN
    RAISE EXCEPTION 'transição de demanda inválida: % -> %', OLD.status, NEW.status;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

-- B2. Execução da validação antes da mudança de situação.
CREATE TRIGGER transition_guard
BEFORE UPDATE OF status ON demands
FOR EACH ROW EXECUTE FUNCTION transition_guard();

-- B3. Proteção contra alterações no histórico de decisões.
CREATE FUNCTION event_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'o histórico de decisões é imutável';
END
$$;

-- B4. Impede a edição ou exclusão de decisões registradas.
CREATE TRIGGER event_immutable
BEFORE UPDATE OR DELETE ON demand_events
FOR EACH ROW EXECUTE FUNCTION event_immutable();

-- B5. Registro automático da publicação ou retirada de páginas.
CREATE FUNCTION page_publish_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id bigint;
BEGIN
  IF NEW.published_version_id IS DISTINCT FROM OLD.published_version_id THEN
    actor_id := nullif(current_setting('ites.actor_id', true), '')::bigint;
    IF actor_id IS NULL THEN
      RAISE EXCEPTION 'ator obrigatório para publicar ou retirar uma página';
    END IF;
    INSERT INTO page_events(page_id, version_id, actor_id, action)
    VALUES (
      NEW.id,
      NEW.published_version_id,
      actor_id,
      CASE WHEN NEW.published_version_id IS NULL THEN 'UNPUBLISH' ELSE 'PUBLISH' END
    );
  END IF;
  RETURN NEW;
END
$$;

-- B6. Executa o registro de auditoria ao alterar a publicação.
CREATE TRIGGER page_publish_audit
AFTER UPDATE OF published_version_id ON pages
FOR EACH ROW EXECUTE FUNCTION page_publish_audit();

-- ---------------------------------------------------------------------
-- PARTE C - PROCEDIMENTOS DE OPERAÇÃO
-- ---------------------------------------------------------------------

-- C1. Mudança de situação da demanda com registro da decisão.
CREATE PROCEDURE transition_demand(
  p_demand_id bigint,
  p_actor_id bigint,
  p_status text,
  p_justification text,
  p_completion_note text DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  previous_status text;
BEGIN
  IF nullif(btrim(p_justification), '') IS NULL THEN
    RAISE EXCEPTION 'justificativa obrigatória';
  END IF;
  SELECT status INTO previous_status FROM demands WHERE id = p_demand_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'demanda não encontrada';
  END IF;
  IF p_status = previous_status THEN
    RAISE EXCEPTION 'a demanda já está nessa situação';
  END IF;
  UPDATE demands
  SET status = p_status,
      completion_note = CASE WHEN p_status = 'Concluída' THEN p_completion_note ELSE completion_note END
  WHERE id = p_demand_id;
  INSERT INTO demand_events(demand_id, actor_id, old_status, new_status, justification)
  VALUES (p_demand_id, p_actor_id, previous_status, p_status, btrim(p_justification));
END
$$;

-- C2. Publicação de uma versão específica da página.
CREATE PROCEDURE publish_page(p_page_id bigint, p_version_id bigint, p_actor_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM page_versions WHERE id = p_version_id AND page_id = p_page_id
  ) THEN
    RAISE EXCEPTION 'versão não pertence à página informada';
  END IF;
  PERFORM set_config('ites.actor_id', p_actor_id::text, true);
  UPDATE pages SET published_version_id = p_version_id WHERE id = p_page_id;
END
$$;

-- C3. Retirada de uma página publicada.
CREATE PROCEDURE unpublish_page(p_page_id bigint, p_actor_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pages WHERE id = p_page_id) THEN
    RAISE EXCEPTION 'página não encontrada';
  END IF;
  PERFORM set_config('ites.actor_id', p_actor_id::text, true);
  UPDATE pages SET published_version_id = NULL WHERE id = p_page_id;
END
$$;

-- C4. Concessão de um papel a um usuário.
CREATE PROCEDURE assign_role(p_user_id bigint, p_role_id bigint, p_actor_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  affected_rows integer;
BEGIN
  INSERT INTO user_roles(user_id, role_id)
  VALUES (p_user_id, p_role_id)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows > 0 THEN
    INSERT INTO grant_audit(actor_id, subject_user_id, role_id, action)
    VALUES (p_actor_id, p_user_id, p_role_id, 'GRANT');
  END IF;
END
$$;

-- C5. Revogação de um papel de um usuário.
CREATE PROCEDURE revoke_role(p_user_id bigint, p_role_id bigint, p_actor_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  affected_rows integer;
BEGIN
  DELETE FROM user_roles WHERE user_id = p_user_id AND role_id = p_role_id;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows > 0 THEN
    INSERT INTO grant_audit(actor_id, subject_user_id, role_id, action)
    VALUES (p_actor_id, p_user_id, p_role_id, 'REVOKE');
  END IF;
END
$$;

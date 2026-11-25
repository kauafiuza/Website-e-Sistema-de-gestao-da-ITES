-- Verificações reexecutáveis de integridade, rotinas e automações.
DO $$
DECLARE
  table_name text;
  row_total bigint;
  table_names text[] := ARRAY[
    'users','roles','permissions','user_roles','role_permissions','organizations','demands','demand_events',
    'pages','page_versions','page_events','grant_audit'
  ];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    EXECUTE format('SELECT count(*) FROM %I', table_name) INTO row_total;
    IF row_total < 20 THEN
      RAISE EXCEPTION 'a tabela % contém apenas % linhas', table_name, row_total;
    END IF;
  END LOOP;

  IF demand_count('Pendente') < 1 OR published_page_count() <> 20 OR
     requester_demand_count((SELECT id FROM users WHERE email = 'pessoa01@example.invalid')) < 1 OR
     requester_demand_count(999999) <> 0 OR demand_count('SITUACAO_INEXISTENTE') <> 0 THEN
    RAISE EXCEPTION 'indicadores retornaram valores incompatíveis com a carga';
  END IF;

  -- Testa decisão, avanço de atendimento e conclusão com justificativa.
  DECLARE
    pending_id bigint;
    v_actor_id bigint;
    v_page_id bigint;
    v_version_id bigint;
    rejected boolean;
    event_total bigint;
    audit_before bigint;
    subject_id bigint;
    requester_role_id bigint;
  BEGIN
    SELECT id INTO v_actor_id FROM users WHERE email = 'pessoa26@example.invalid';
    SELECT id INTO pending_id FROM demands WHERE status = 'Pendente' ORDER BY id LIMIT 1;
    CALL transition_demand(pending_id, v_actor_id, 'Aceita para atendimento', 'Demanda aceita no teste positivo');
    CALL transition_demand(pending_id, v_actor_id, 'Em atendimento', 'Atendimento iniciado no teste positivo');

    rejected := false;
    BEGIN
      CALL transition_demand(pending_id, v_actor_id, 'Concluída', 'Conclusão sem nota', NULL);
    EXCEPTION WHEN check_violation THEN
      rejected := true;
    END;
    IF NOT rejected THEN
      RAISE EXCEPTION 'a conclusão sem nota deveria ser recusada';
    END IF;

    CALL transition_demand(pending_id, v_actor_id, 'Concluída', 'Atendimento finalizado', 'Atividade realizada e registrada');
    rejected := false;
    BEGIN
      CALL transition_demand(pending_id, v_actor_id, 'Pendente', 'Tentativa de retrocesso', NULL);
    EXCEPTION WHEN OTHERS THEN
      rejected := true;
    END;
    IF NOT rejected THEN
      RAISE EXCEPTION 'uma transição terminal inválida deveria ser recusada';
    END IF;

    rejected := false;
    BEGIN
      CALL transition_demand(
        (SELECT id FROM demands WHERE status = 'Pendente' ORDER BY id LIMIT 1),
        v_actor_id, 'Aceita para atendimento', '   ', NULL
      );
    EXCEPTION WHEN OTHERS THEN
      rejected := true;
    END;
    IF NOT rejected THEN
      RAISE EXCEPTION 'uma decisão sem justificativa deveria ser recusada';
    END IF;

    SELECT count(*) INTO event_total FROM demand_events WHERE demand_id = pending_id;
    IF event_total <> 3 THEN
      RAISE EXCEPTION 'eram esperados três eventos para a demanda de validação';
    END IF;

    rejected := false;
    BEGIN
      UPDATE demand_events SET justification = 'alterado'
      WHERE id = (SELECT id FROM demand_events WHERE demand_id = pending_id ORDER BY id LIMIT 1);
    EXCEPTION WHEN OTHERS THEN
      rejected := true;
    END;
    IF NOT rejected THEN
      RAISE EXCEPTION 'o gatilho deveria impedir alteração do histórico';
    END IF;

    SELECT id INTO v_page_id FROM pages ORDER BY id LIMIT 1;
    INSERT INTO page_versions(page_id, revision, document, author_id)
    SELECT v_page_id, 2, pv.document || jsonb_build_object('revisaoTeste', true), v_actor_id
    FROM page_versions pv WHERE pv.page_id = v_page_id AND pv.revision = 1;
    SELECT pv.id INTO v_version_id FROM page_versions pv WHERE pv.page_id = v_page_id AND pv.revision = 2;
    CALL publish_page(v_page_id, v_version_id, v_actor_id);
    CALL unpublish_page(v_page_id, v_actor_id);
    IF (SELECT count(*) FROM page_events pe WHERE pe.page_id = v_page_id) < 3 THEN
      RAISE EXCEPTION 'publicação e retirada não foram registradas pelo gatilho';
    END IF;
    IF published_page_count() <> 19 THEN
      RAISE EXCEPTION 'retirada de publicação não atualizou o indicador';
    END IF;

    rejected := false;
    BEGIN
      CALL publish_page(v_page_id, v_version_id + 100000, v_actor_id);
    EXCEPTION WHEN OTHERS THEN
      rejected := true;
    END;
    IF NOT rejected THEN
      RAISE EXCEPTION 'a publicação de versão inexistente deveria ser recusada';
    END IF;

    SELECT id INTO subject_id FROM users WHERE email = 'pessoa30@example.invalid';
    SELECT id INTO requester_role_id FROM roles WHERE code = 'REQUESTER';
    SELECT count(*) INTO audit_before FROM grant_audit
      WHERE subject_user_id = subject_id AND role_id = requester_role_id;
    CALL assign_role(subject_id, requester_role_id, v_actor_id);
    IF (SELECT count(*) FROM grant_audit WHERE subject_user_id = subject_id AND role_id = requester_role_id) <> audit_before THEN
      RAISE EXCEPTION 'concessão duplicada não deveria gerar auditoria';
    END IF;
    CALL revoke_role(subject_id, requester_role_id, v_actor_id);
    CALL assign_role(subject_id, requester_role_id, v_actor_id);
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = subject_id AND role_id = requester_role_id) OR
       (SELECT count(*) FROM grant_audit WHERE subject_user_id = subject_id AND role_id = requester_role_id) <> audit_before + 2 THEN
      RAISE EXCEPTION 'concessão e revogação deveriam alterar papel e trilha de auditoria';
    END IF;

    rejected := false;
    BEGIN
      INSERT INTO demands(requester_id, capacity, service, description, urgency)
      VALUES (v_actor_id, 'OTHER', 'formação', 'Integridade de condição', 'LOW');
    EXCEPTION WHEN check_violation THEN
      rejected := true;
    END;
    IF NOT rejected THEN
      RAISE EXCEPTION 'a condição OTHER sem descrição deveria ser recusada';
    END IF;
  END;
END
$$;

-- Demonstra quantidades, catálogos intencionais e chaves estrangeiras.
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

SELECT 'catalogo_papeis_e_permissoes_minimo_20' AS verificacao,
       (SELECT count(*) FROM roles) AS roles,
       (SELECT count(*) FROM permissions) AS permissions;

SELECT 'constraints_and_foreign_keys' AS verification,
       count(*) FILTER (WHERE convalidated) AS validated_constraints
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace;

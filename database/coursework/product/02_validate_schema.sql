-- Confere o schema criado pelas migrações e exercita as proteções operacionais.
-- Execute depois de 01_apply_migrations.sql, em banco descartável.
-- O registro de auditoria de teste é preservado porque a tabela é imutável.
\set ON_ERROR_STOP on

DO $$
DECLARE
    product_table_count integer;
    administrator_permission_count integer;
    permission_count integer;
    validation_user_id uuid := gen_random_uuid();
    validation_demand_id uuid := gen_random_uuid();
    validation_audit_id uuid := gen_random_uuid();
    rejected boolean;
BEGIN
    SELECT count(*) INTO product_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> 'flyway_schema_history';

    IF product_table_count <> 35 THEN
        RAISE EXCEPTION 'Esperadas 35 tabelas do produto; encontradas %', product_table_count;
    END IF;

    SELECT count(*) INTO permission_count FROM app_permissions;
    SELECT count(*) INTO administrator_permission_count
    FROM app_role_permissions rp
    JOIN app_roles r ON r.id = rp.role_id
    WHERE r.code = 'ADMINISTRATOR';

    IF permission_count < 17 OR administrator_permission_count <> permission_count THEN
        RAISE EXCEPTION 'As permissões do administrador não foram sincronizadas: % de %',
            administrator_permission_count, permission_count;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'uq_projects_root_site'
    ) THEN
        RAISE EXCEPTION 'Índice que limita o projeto ROOT não encontrado';
    END IF;

    IF (SELECT count(*) FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND NOT t.tgisinternal) <> 4 THEN
        RAISE EXCEPTION 'A quantidade esperada de gatilhos operacionais é 4';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM institutional_pages WHERE slug = 'inicio'
    ) OR NOT EXISTS (
        SELECT 1 FROM institutional_pages WHERE slug = 'painel-demandas'
    ) THEN
        RAISE EXCEPTION 'Páginas institucionais iniciais não foram provisionadas';
    END IF;

    -- Uma permissão temporária comprova a sincronização automática do administrador.
    INSERT INTO app_permissions(code, description)
    VALUES ('coursework.permission.sync.check', 'Permissão temporária para validar sincronização');
    IF NOT EXISTS (
        SELECT 1 FROM app_role_permissions rp
        JOIN app_roles r ON r.id = rp.role_id
        WHERE r.code = 'ADMINISTRATOR'
          AND rp.permission_code = 'coursework.permission.sync.check'
    ) THEN
        RAISE EXCEPTION 'O gatilho não sincronizou a nova permissão administrativa';
    END IF;
    DELETE FROM app_permissions WHERE code = 'coursework.permission.sync.check';

    -- Dados temporários verificam uma transição válida e uma transição proibida.
    INSERT INTO users(id, first_name, last_name, email, password_hash, active, created_at, updated_at)
    VALUES (validation_user_id, 'Usuário', 'Validação',
            'validation-' || validation_user_id || '@example.invalid',
            '{HASH_SENTINELA_NAO_AUTENTICAVEL}', true, now(), now());
    INSERT INTO demands(id, requester_id, capacity, service, description, urgency)
    VALUES (validation_demand_id, validation_user_id, 'GROUP', 'formação',
            'Demanda temporária para validar o gatilho de situação', 'LOW');
    UPDATE demands SET status = 'Aceita para atendimento' WHERE id = validation_demand_id;

    rejected := false;
    BEGIN
        UPDATE demands SET status = 'Pendente' WHERE id = validation_demand_id;
    EXCEPTION WHEN raise_exception THEN
        rejected := true;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'O gatilho aceitou uma transição de demanda inválida';
    END IF;
    DELETE FROM demands WHERE id = validation_demand_id;
    DELETE FROM users WHERE id = validation_user_id;

    -- Este evento de teste permanece na tabela para respeitar a imutabilidade auditável.
    INSERT INTO organization_audit_events
        (id, organization_id, actor_user_id, action, target_type, target_id)
    VALUES (validation_audit_id, gen_random_uuid(), validation_user_id,
            'REVIEW_REQUESTED', 'PUBLICATION_REVIEW', gen_random_uuid());

    rejected := false;
    BEGIN
        UPDATE organization_audit_events
        SET action = 'REVIEW_APPROVED'
        WHERE id = validation_audit_id;
    EXCEPTION WHEN raise_exception THEN
        rejected := true;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'O gatilho permitiu alterar um evento de auditoria';
    END IF;

    rejected := false;
    BEGIN
        TRUNCATE organization_audit_events;
    EXCEPTION WHEN raise_exception THEN
        rejected := true;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'O gatilho permitiu TRUNCATE na auditoria';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace AND NOT convalidated
    ) THEN
        RAISE EXCEPTION 'Há restrições de integridade ainda não validadas';
    END IF;
END
$$;

SELECT 'product_tables' AS verification, count(*) AS total
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  AND table_name <> 'flyway_schema_history'
UNION ALL
SELECT 'application_permissions', count(*) FROM app_permissions
UNION ALL
SELECT 'administrator_permissions', count(*)
FROM app_role_permissions rp JOIN app_roles r ON r.id = rp.role_id
WHERE r.code = 'ADMINISTRATOR'
UNION ALL
SELECT 'root_project_unique_index', count(*)
FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_projects_root_site'
UNION ALL
SELECT 'institutional_pages', count(*) FROM institutional_pages;

SELECT 'immutable_audit_test_record' AS verification, count(*) AS total
FROM organization_audit_events;

SELECT c.relname AS table_name, t.tgname AS trigger_name,
       pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- =====================================================================
-- APD1 - Geração das evidências: estrutura das tabelas, dados inseridos
-- e consultas com seus resultados.
-- Executar em um banco limpo, depois de 01_schema.sql, 04_routines.sql
-- e 02_seed.sql:
--   psql -e -d ites_coursework -f 09_apd1_evidencias.sql
-- (a opção -e mostra cada comando antes do seu resultado)
-- =====================================================================

\echo '=================================================================='
\echo '1. ESTRUTURA DAS TABELAS (colunas, tipos, chaves e restrições)'
\echo '=================================================================='
\dt
\d users
\d roles
\d permissions
\d user_roles
\d role_permissions
\d organizations
\d demands
\d demand_events
\d pages
\d page_versions
\d page_events
\d grant_audit

\echo '=================================================================='
\echo '2. QUANTIDADE DE REGISTROS POR TABELA (mínimo de 20)'
\echo '=================================================================='
SELECT 'users' AS tabela, count(*) AS registros FROM users
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
ORDER BY tabela;

\echo '=================================================================='
\echo '3. DADOS INSERIDOS'
\echo '=================================================================='
SELECT id, name, email, whatsapp, active FROM users ORDER BY id;
SELECT * FROM roles ORDER BY id;
SELECT * FROM permissions ORDER BY id;
SELECT ur.user_id, u.name, r.code AS papel
  FROM user_roles ur JOIN users u ON u.id = ur.user_id JOIN roles r ON r.id = ur.role_id
 ORDER BY ur.user_id, r.code;
SELECT r.code AS papel, p.code AS permissao
  FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id
 ORDER BY r.id, p.id;
SELECT id, name, economic_sector, contact_email FROM organizations ORDER BY id;
SELECT id, code, requester_id, organization_id, capacity, capacity_other, service,
       description, urgency, status, completion_note
  FROM demands ORDER BY id;
SELECT id, demand_id, actor_id, old_status, new_status, justification FROM demand_events ORDER BY id;
SELECT id, slug, title, published_version_id FROM pages ORDER BY id;
SELECT id, page_id, revision, author_id,
       document -> 'pages' -> 0 -> 'blocks' -> 0 -> 'props' ->> 'description' AS conteudo
  FROM page_versions ORDER BY id;
SELECT id, page_id, version_id, actor_id, action FROM page_events ORDER BY id;
SELECT id, actor_id, subject_user_id, role_id, action FROM grant_audit ORDER BY id;

\echo '=================================================================='
\echo '4. CONSULTAS E SUBCONSULTAS (03_queries.sql)'
\echo '=================================================================='
\ir 03_queries.sql

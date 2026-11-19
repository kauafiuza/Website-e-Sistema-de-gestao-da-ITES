-- Popula o banco acadêmico com dados fictícios e determinísticos.
-- As senhas são sentinelas não utilizáveis para autenticação.

-- Cria identidades demonstrativas com endereços reservados para exemplos.
INSERT INTO users(name, email, password_hash, whatsapp)
SELECT 'Pessoa de Demonstração ' || n,
       'pessoa' || lpad(n::text, 2, '0') || '@example.invalid',
       '{DEMO_ONLY_NON_LOGINABLE}',
       '000000' || lpad(n::text, 4, '0')
FROM generate_series(1, 30) AS n;

-- Define os quatro papéis funcionais do exercício.
INSERT INTO roles(code, name) VALUES
  ('REQUESTER', 'Solicitante'),
  ('ADMINISTRATOR', 'Administrador'),
  ('DEMAND_MANAGER', 'Gestor de demandas'),
  ('COLLABORATOR', 'Colaborador');

-- Define permissões reais; catálogos pequenos não são preenchidos artificialmente.
INSERT INTO permissions(code, description) VALUES
  ('profile.read_own', 'Consultar o próprio perfil'),
  ('profile.manage_own', 'Atualizar o próprio perfil'),
  ('users.read', 'Consultar contas de usuários'),
  ('users.manage', 'Administrar contas de usuários'),
  ('roles.manage', 'Conceder e revogar papéis'),
  ('demands.read_own', 'Consultar as próprias demandas'),
  ('demands.read', 'Consultar demandas para análise'),
  ('demands.review', 'Classificar demandas'),
  ('demands.decide', 'Decidir demandas'),
  ('organizations.read', 'Consultar organizações'),
  ('portal.content.manage', 'Administrar conteúdo institucional'),
  ('builder.pages.edit', 'Editar páginas institucionais'),
  ('builder.pages.publish', 'Publicar páginas institucionais');

-- O papel administrativo recebe todo o catálogo de permissões.
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.code = 'ADMINISTRATOR'
ON CONFLICT DO NOTHING;

-- O gestor recebe permissões necessárias para revisar e decidir demandas.
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN ('demands.read','demands.review','demands.decide','organizations.read')
WHERE r.code = 'DEMAND_MANAGER'
ON CONFLICT DO NOTHING;

-- O colaborador recebe consulta sem poder administrativo amplo.
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN ('demands.read','organizations.read')
WHERE r.code = 'COLLABORATOR'
ON CONFLICT DO NOTHING;

-- O solicitante pode consultar apenas seu perfil e suas próprias demandas.
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN ('profile.read_own','profile.manage_own','demands.read_own')
WHERE r.code = 'REQUESTER'
ON CONFLICT DO NOTHING;

-- Registra organizações fictícias de diferentes setores econômicos.
INSERT INTO organizations(name, economic_sector, contact_email)
SELECT (ARRAY[
  'Coletivo Raízes do Morro','Grupo Mãos da Baía','Associação Maré Viva','Rede de Costura Solidária',
  'Cooperativa Sementes de Itaipu','Coletivo Cultura em Rede','Grupo Sabores de Niterói','Associação Artes da Região',
  'Rede de Agricultura Urbana','Cooperativa de Reciclagem Horizonte','Coletivo Mulheres da Pesca','Grupo Tecendo Histórias',
  'Associação Feira Popular','Coletivo Juventude Criativa','Rede de Alimentação Comunitária','Grupo Cerâmica da Costa',
  'Cooperativa de Serviços do Leste','Coletivo Memória e Território','Associação Ecos da Serra','Rede de Produção Local'
])[n],
       (ARRAY['artesanato','agricultura','cultura','alimentação','serviços'])[(n % 5) + 1],
       'contato' || lpad(n::text, 2, '0') || '@example.invalid'
FROM generate_series(1, 20) AS n;

-- Distribui demandas entre organizações, capacidades, serviços, urgências e situações.
INSERT INTO demands(requester_id, organization_id, capacity, capacity_other, service, description, urgency, status, completion_note)
SELECT u.id,
       CASE WHEN n % 7 = 0 THEN NULL ELSE o.id END,
       CASE (n % 4) WHEN 0 THEN 'OTHER' WHEN 1 THEN 'GROUP' WHEN 2 THEN 'FORUM' ELSE 'PARTNER' END,
       CASE WHEN n % 4 = 0 THEN 'Representante comunitário' ELSE NULL END,
       (ARRAY['formação','comunicação','comercialização','apoio administrativo','parceria'])[(n % 5) + 1],
       'Solicitação demonstrativa de apoio institucional número ' || n,
       (ARRAY['LOW','MEDIUM','HIGH'])[(n % 3) + 1],
       (ARRAY['Pendente','Aceita para atendimento','Em atendimento','Concluída','Recusada','Cancelada'])[((n - 1) % 6) + 1],
       CASE WHEN (n - 1) % 6 = 3 THEN 'Atividade concluída e registrada para demonstração' ELSE NULL END
FROM generate_series(1, 30) AS n
JOIN users u ON u.email = 'pessoa' || lpad((((n - 1) % 25) + 1)::text, 2, '0') || '@example.invalid'
LEFT JOIN organizations o ON o.id = ((n - 1) % 20) + 1;

-- Gera eventos ilustrativos para demandas que já passaram por análise.
INSERT INTO demand_events(demand_id, actor_id, old_status, new_status, justification)
SELECT d.id,
       actor.id,
       CASE d.status
         WHEN 'Aceita para atendimento' THEN 'Pendente'
         WHEN 'Em atendimento' THEN 'Aceita para atendimento'
         WHEN 'Concluída' THEN 'Em atendimento'
         ELSE 'Pendente'
       END,
       d.status,
       'Decisão fictícia registrada para demonstrar o histórico da solicitação ' || d.code
FROM demands d
CROSS JOIN users actor
WHERE actor.email = 'pessoa26@example.invalid'
  AND d.status <> 'Pendente';

-- Cria páginas institucionais com conteúdo demonstrativo.
INSERT INTO pages(slug, title) VALUES
  ('inicio','Início'),
  ('quem-somos','Quem somos'),
  ('como-atuamos','Como atuamos'),
  ('projetos','Projetos apoiados'),
  ('empreendimentos','Empreendimentos solidários'),
  ('noticias','Notícias'),
  ('agenda','Agenda de eventos'),
  ('publicacoes','Publicações'),
  ('biblioteca','Biblioteca'),
  ('ferramentas','Aplicativos e ferramentas'),
  ('contato','Contato'),
  ('submeter-demanda','Solicitar apoio'),
  ('formacao','Formação em economia solidária'),
  ('comercializacao','Comercialização em rede'),
  ('comunicacao','Comunicação comunitária'),
  ('parcerias','Parcerias institucionais'),
  ('feira-solidaria','Feira de economia solidária'),
  ('memoria-territorial','Memória e território'),
  ('tecnologia-social','Tecnologia social'),
  ('perguntas-frequentes','Perguntas frequentes');

-- Cria um documento JSONB inicial por página, usando a mesma revisão lógica.
INSERT INTO page_versions(page_id, revision, document, author_id)
SELECT p.id,
       1,
       jsonb_build_object(
         'version', 1,
         'name', p.title,
         'pages', jsonb_build_array(jsonb_build_object(
           'id', 'pagina-' || p.id,
           'name', p.title,
           'slug', p.slug,
           'blocks', jsonb_build_array(jsonb_build_object(
             'id', 'bloco-' || p.id,
             'definitionId', 'hero-classic',
             'props', jsonb_build_object('title', p.title, 'description', 'Conteúdo institucional demonstrativo da ITES.')
           ))
         ))
       ),
       u.id
FROM pages p
CROSS JOIN users u
WHERE u.email = 'pessoa26@example.invalid';

-- Atribui papéis pelo procedimento para preencher também a trilha de auditoria.
DO $$
DECLARE
  user_row record;
  requester_role bigint;
  administrator_role bigint;
  manager_role bigint;
  collaborator_role bigint;
  administrator_id bigint;
BEGIN
  SELECT id INTO requester_role FROM roles WHERE code = 'REQUESTER';
  SELECT id INTO administrator_role FROM roles WHERE code = 'ADMINISTRATOR';
  SELECT id INTO manager_role FROM roles WHERE code = 'DEMAND_MANAGER';
  SELECT id INTO collaborator_role FROM roles WHERE code = 'COLLABORATOR';
  SELECT id INTO administrator_id FROM users WHERE email = 'pessoa26@example.invalid';

  FOR user_row IN SELECT id FROM users ORDER BY id LOOP
    CALL assign_role(user_row.id, requester_role, administrator_id);
  END LOOP;
  FOR user_row IN SELECT id FROM users WHERE email BETWEEN 'pessoa26@example.invalid' AND 'pessoa30@example.invalid' ORDER BY id LOOP
    CALL assign_role(user_row.id, administrator_role, administrator_id);
  END LOOP;
  FOR user_row IN SELECT id FROM users WHERE email BETWEEN 'pessoa01@example.invalid' AND 'pessoa05@example.invalid' ORDER BY id LOOP
    CALL assign_role(user_row.id, manager_role, administrator_id);
  END LOOP;
  FOR user_row IN SELECT id FROM users WHERE email BETWEEN 'pessoa06@example.invalid' AND 'pessoa10@example.invalid' ORDER BY id LOOP
    CALL assign_role(user_row.id, collaborator_role, administrator_id);
  END LOOP;
END
$$;

-- Publica as revisões por procedimento; o gatilho registra cada publicação.
DO $$
DECLARE
  page_row record;
  administrator_id bigint;
BEGIN
  SELECT id INTO administrator_id FROM users WHERE email = 'pessoa26@example.invalid';
  FOR page_row IN
    SELECT p.id AS page_id, v.id AS version_id
    FROM pages p JOIN page_versions v ON v.page_id = p.id
    ORDER BY p.id
  LOOP
    CALL publish_page(page_row.page_id, page_row.version_id, administrator_id);
  END LOOP;
END
$$;

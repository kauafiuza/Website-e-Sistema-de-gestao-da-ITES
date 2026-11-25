-- Popula o banco acadêmico com dados fictícios e determinísticos.
-- As senhas são sentinelas não utilizáveis para autenticação.
-- Os e-mails usam o domínio reservado example.invalid (dados fictícios);
-- os usuários 26 a 30 compõem a equipe interna da ITES.
INSERT INTO users(name, email, password_hash, whatsapp)
SELECT (ARRAY[
  'Ana Paula Ferreira', 'Marcos Vinícius Souza', 'Juliana Rocha Lima', 'Carlos Eduardo Martins', 'Fernanda Alves Costa',
  'Rafael Nogueira Dias', 'Patrícia Mendes Ribeiro', 'Lucas Henrique Barbosa', 'Camila Duarte Pinto', 'Thiago Cardoso Freitas',
  'Mariana Gomes Teixeira', 'Eduardo Lopes Moreira', 'Beatriz Carvalho Santos', 'Gustavo Araújo Pereira', 'Larissa Monteiro Vieira',
  'Diego Fernandes Castro', 'Aline Batista Correia', 'Rodrigo Pires Cavalcanti', 'Vanessa Lacerda Moura', 'Felipe Rezende Azevedo',
  'Renata Fonseca Brandão', 'André Luiz Sampaio', 'Débora Antunes Farias', 'Leonardo Machado Reis', 'Simone Tavares Braga',
  'Helena Coutinho Prado', 'Ricardo Viana Lemos', 'Cláudia Barros Siqueira', 'Paulo Roberto Amaral', 'Luana Medeiros Quintela'
])[n],
       'pessoa' || lpad(n::text, 2, '0') || '@example.invalid',
       '{DEMO_ONLY_NON_LOGINABLE}',
       '(21) 9' || (8100 + n * 37)::text || '-' || lpad((1000 + n * 263 % 9000)::text, 4, '0')
FROM generate_series(1, 30) AS n;

-- Catálogo de 20 papéis. Os quatro primeiros são os perfis do módulo M3 do
-- documento da ITES; os demais detalham responsabilidades do portal, da
-- triagem, do planejamento (M7), dos relatórios (M8) e da auditoria.
INSERT INTO roles(code, name) VALUES
  ('REQUESTER', 'Solicitante'),
  ('ADMINISTRATOR', 'Administrador'),
  ('DEMAND_MANAGER', 'Gestor de demandas'),
  ('COLLABORATOR', 'Colaborador'),
  ('TRIAGE_ANALYST', 'Analista de triagem'),
  ('ORGANIZATION_REPRESENTATIVE', 'Representante de organização'),
  ('COORDINATOR', 'Coordenação da ITES'),
  ('PLAN_MANAGER', 'Gestor de planos de atendimento'),
  ('ACTIVITY_RESPONSIBLE', 'Responsável por atividades'),
  ('REPORT_VIEWER', 'Leitor de relatórios'),
  ('REPORT_EXPORTER', 'Exportador de relatórios'),
  ('AUDITOR', 'Auditor'),
  ('USER_MANAGER', 'Gestor de contas de usuários'),
  ('CONTENT_EDITOR', 'Editor de conteúdo institucional'),
  ('CONTENT_PUBLISHER', 'Publicador de conteúdo institucional'),
  ('NEWS_EDITOR', 'Editor de notícias e agenda'),
  ('PUBLICATIONS_EDITOR', 'Editor de publicações'),
  ('PROJECTS_EDITOR', 'Editor de projetos e empreendimentos incubados'),
  ('PARTNERSHIP_MANAGER', 'Gestor de parcerias'),
  ('SUPPORT', 'Suporte técnico');

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
  ('builder.pages.publish', 'Publicar páginas institucionais'),
  ('demands.create', 'Registrar novas demandas'),
  ('demands.cancel', 'Cancelar demandas'),
  ('organizations.manage', 'Cadastrar e atualizar organizações'),
  ('plans.manage', 'Criar e acompanhar planos de atendimento'),
  ('reports.read', 'Consultar relatórios e indicadores'),
  ('reports.export', 'Exportar relatórios'),
  ('audit.read', 'Consultar trilhas de auditoria');

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.code = 'ADMINISTRATOR'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN ('demands.read','demands.review','demands.decide','organizations.read')
WHERE r.code = 'DEMAND_MANAGER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN ('demands.read','organizations.read')
WHERE r.code = 'COLLABORATOR'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN ('profile.read_own','profile.manage_own','demands.read_own')
WHERE r.code = 'REQUESTER'
ON CONFLICT DO NOTHING;

-- Permissões dos papéis complementares.
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
  ('REQUESTER', 'demands.create'),
  ('DEMAND_MANAGER', 'demands.cancel'),
  ('DEMAND_MANAGER', 'plans.manage'),
  ('TRIAGE_ANALYST', 'demands.read'),
  ('TRIAGE_ANALYST', 'demands.review'),
  ('TRIAGE_ANALYST', 'organizations.read'),
  ('ORGANIZATION_REPRESENTATIVE', 'demands.create'),
  ('ORGANIZATION_REPRESENTATIVE', 'demands.read_own'),
  ('ORGANIZATION_REPRESENTATIVE', 'organizations.manage'),
  ('COORDINATOR', 'demands.read'),
  ('COORDINATOR', 'demands.decide'),
  ('COORDINATOR', 'reports.read'),
  ('COORDINATOR', 'roles.manage'),
  ('PLAN_MANAGER', 'plans.manage'),
  ('PLAN_MANAGER', 'demands.read'),
  ('ACTIVITY_RESPONSIBLE', 'plans.manage'),
  ('REPORT_VIEWER', 'reports.read'),
  ('REPORT_EXPORTER', 'reports.read'),
  ('REPORT_EXPORTER', 'reports.export'),
  ('AUDITOR', 'audit.read'),
  ('AUDITOR', 'reports.read'),
  ('USER_MANAGER', 'users.read'),
  ('USER_MANAGER', 'users.manage'),
  ('CONTENT_EDITOR', 'builder.pages.edit'),
  ('CONTENT_EDITOR', 'portal.content.manage'),
  ('CONTENT_PUBLISHER', 'builder.pages.publish'),
  ('NEWS_EDITOR', 'builder.pages.edit'),
  ('PUBLICATIONS_EDITOR', 'builder.pages.edit'),
  ('PROJECTS_EDITOR', 'builder.pages.edit'),
  ('PARTNERSHIP_MANAGER', 'organizations.manage'),
  ('PARTNERSHIP_MANAGER', 'organizations.read'),
  ('SUPPORT', 'users.read')
) AS m(role_code, permission_code)
JOIN roles r ON r.code = m.role_code
JOIN permissions p ON p.code = m.permission_code
ON CONFLICT DO NOTHING;

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

INSERT INTO demands(requester_id, organization_id, capacity, capacity_other, service, description, urgency, status, completion_note)
SELECT u.id,
       CASE WHEN n % 7 = 0 THEN NULL ELSE o.id END,
       CASE (n % 4) WHEN 0 THEN 'OTHER' WHEN 1 THEN 'GROUP' WHEN 2 THEN 'FORUM' ELSE 'PARTNER' END,
       CASE WHEN n % 4 = 0 THEN 'Representante comunitário' ELSE NULL END,
       (ARRAY['formação','comunicação','comercialização','apoio administrativo','parceria'])[(n % 5) + 1],
       (ARRAY[
         'Criação de identidade visual e perfil nas redes sociais do coletivo.',
         'Apoio para participar de feiras e eventos de comercialização em Niterói.',
         'Orientação para formalização do grupo como associação ou cooperativa.',
         'Proposta de parceria para atividades de extensão com estudantes do IFRJ.',
         'Oficina de gestão de empreendimentos solidários para os integrantes do grupo.',
         'Apoio para produzir fotos e textos de divulgação dos produtos artesanais.',
         'Organização de pontos de venda coletiva para os produtos agroecológicos.',
         'Apoio na elaboração do estatuto e do regimento interno do empreendimento.',
         'Busca de parceria com a prefeitura para uso de espaço da feira municipal.',
         'Formação em precificação justa dos produtos vendidos na feira do bairro.',
         'Planejamento de comunicação para divulgar a feira de economia solidária.',
         'Estruturação de venda on-line com entrega por cestas semanais.',
         'Organização da documentação para emissão de nota fiscal como MEI.',
         'Articulação com o fórum regional de economia solidária para ações conjuntas.',
         'Curso introdutório de cooperativismo e autogestão para novos associados.',
         'Elaboração de catálogo digital dos produtos para envio por WhatsApp.',
         'Apoio na negociação com restaurantes locais para fornecimento de hortaliças.',
         'Apoio na prestação de contas de um pequeno projeto financiado por edital.',
         'Parceria para projeto de reciclagem com escolas da rede pública.',
         'Capacitação em controle financeiro básico e fluxo de caixa do coletivo.',
         'Produção de vídeo curto apresentando a história e o trabalho do grupo.',
         'Definição de estratégia de venda para a nova linha de produtos de cerâmica.',
         'Orientação sobre controle de estoque e registro de vendas do grupo.',
         'Apoio técnico para submissão de projeto a edital de fomento.',
         'Oficina sobre boas práticas de manipulação de alimentos para a cozinha comunitária.',
         'Orientação para manter um calendário de publicações nas redes sociais.',
         'Inserção dos produtos do grupo em compras institucionais e mercados públicos.',
         'Apoio para inscrição do empreendimento no cadastro de economia solidária.',
         'Parceria com universidade para pesquisa sobre o impacto do grupo no território.',
         'Formação de jovens do grupo em uso de ferramentas digitais de trabalho.'
       ])[n],
       (ARRAY['LOW','MEDIUM','HIGH'])[(n % 3) + 1],
       (ARRAY['Pendente','Aceita para atendimento','Em atendimento','Concluída','Recusada','Cancelada'])[((n - 1) % 6) + 1],
       CASE WHEN (n - 1) % 6 = 3 THEN 'Atendimento concluído: ações realizadas e resultados registrados com o grupo.' ELSE NULL END
FROM generate_series(1, 30) AS n
JOIN users u ON u.email = 'pessoa' || lpad((((n - 1) % 25) + 1)::text, 2, '0') || '@example.invalid'
LEFT JOIN organizations o ON o.id = ((n - 1) % 20) + 1;

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
       CASE d.status
         WHEN 'Aceita para atendimento' THEN 'Demanda alinhada às linhas de atuação da ITES; aceita para atendimento.'
         WHEN 'Em atendimento' THEN 'Equipe definida e plano de atendimento iniciado com o grupo.'
         WHEN 'Concluída' THEN 'Ações previstas realizadas e resultados registrados.'
         WHEN 'Recusada' THEN 'Pedido fora do escopo atual da incubadora; solicitante orientado a procurar a rede parceira.'
         ELSE 'Cancelada a pedido do solicitante antes do início do atendimento.'
       END
FROM demands d
CROSS JOIN users actor
WHERE actor.email = 'pessoa26@example.invalid'
  AND d.status <> 'Pendente';

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
             'props', jsonb_build_object('title', p.title, 'description', CASE p.slug WHEN 'inicio' THEN 'Página inicial do portal da ITES, com destaques e acesso à solicitação de apoio.' WHEN 'quem-somos' THEN 'História, missão e equipe da incubadora no IFRJ Campus Niterói.' WHEN 'como-atuamos' THEN 'Metodologia de incubação baseada em autogestão e educação popular.' WHEN 'projetos' THEN 'Projetos de extensão e pesquisa apoiados pela incubadora.' WHEN 'empreendimentos' THEN 'Empreendimentos solidários incubados e acompanhados pela ITES.' WHEN 'noticias' THEN 'Notícias sobre as ações da incubadora e dos grupos apoiados.' WHEN 'agenda' THEN 'Calendário de oficinas, feiras e eventos de economia solidária.' WHEN 'publicacoes' THEN 'Artigos, relatórios e cartilhas produzidos pela equipe.' WHEN 'biblioteca' THEN 'Materiais de apoio sobre cooperativismo e economia solidária.' WHEN 'ferramentas' THEN 'Aplicativos e ferramentas digitais disponibilizados aos grupos.' WHEN 'contato' THEN 'Canais de contato e redes sociais da ITES.' WHEN 'submeter-demanda' THEN 'Como cadastrar-se e enviar uma solicitação de apoio à ITES.' WHEN 'formacao' THEN 'Cursos e oficinas de formação em economia solidária.' WHEN 'comercializacao' THEN 'Apoio à comercialização coletiva e às feiras solidárias.' WHEN 'comunicacao' THEN 'Ações de comunicação comunitária com os empreendimentos.' WHEN 'parcerias' THEN 'Instituições parceiras e como estabelecer uma parceria.' WHEN 'feira-solidaria' THEN 'Informações sobre a feira de economia solidária de Niterói.' WHEN 'memoria-territorial' THEN 'Registros de memória e identidade dos territórios atendidos.' WHEN 'tecnologia-social' THEN 'Tecnologias sociais desenvolvidas com as comunidades.' WHEN 'perguntas-frequentes' THEN 'Respostas às dúvidas mais comuns sobre a incubadora.' END)
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

-- =====================================================================
-- APD1 - Consultas de negócio do Sistema de Gestão de Demandas da ITES
-- 5 consultas simples/qualificadas, 3 consultas com JOIN (agrupamento,
-- agregação e filtro) e 3 subconsultas (EXISTS, comparação e IN).
-- =====================================================================

-- ---------------------------------------------------------------------
-- PARTE A - CONSULTAS SIMPLES / QUALIFICADAS
-- ---------------------------------------------------------------------

-- A1. Fila de trabalho: demandas pendentes, das mais recentes para as mais antigas.
SELECT code, service, urgency, created_at
FROM demands
WHERE status = 'Pendente'
ORDER BY created_at DESC, code;

-- A2. Priorização: demandas de urgência alta que ainda não foram encerradas.
SELECT code, service, status
FROM demands
WHERE urgency = 'HIGH'
  AND status NOT IN ('Concluída', 'Recusada', 'Cancelada')
ORDER BY code;

-- A3. Recorte por setor econômico: organizações de artesanato.
SELECT name, economic_sector, contact_email
FROM organizations
WHERE economic_sector = 'artesanato'
ORDER BY name;

-- A4. Demandas de pessoas sem organização vinculada ou com condição "outros",
--     que exigem atenção na triagem para identificar quem o solicitante representa.
SELECT code, capacity, capacity_other, service
FROM demands
WHERE organization_id IS NULL
   OR capacity = 'OTHER'
ORDER BY code;

-- A5. Inventário do conteúdo público: páginas do portal já publicadas.
SELECT slug, title
FROM pages
WHERE published_version_id IS NOT NULL
ORDER BY slug;

-- ---------------------------------------------------------------------
-- PARTE B - CONSULTAS COM JOIN, AGRUPAMENTO, AGREGAÇÃO E FILTRO
-- ---------------------------------------------------------------------

-- B1. Demandas em andamento por organização e situação
--     (exclui as recusadas e canceladas).
SELECT o.name AS organizacao,
       d.status AS situacao,
       count(*) AS total
FROM organizations o
JOIN demands d ON d.organization_id = o.id
WHERE d.status NOT IN ('Recusada', 'Cancelada')
GROUP BY o.id, o.name, d.status
ORDER BY o.name, d.status;

-- B2. Decisões (aceites e recusas) registradas por responsável, a partir do histórico.
SELECT u.name AS responsavel,
       count(*) AS decisoes,
       count(*) FILTER (WHERE e.new_status = 'Recusada') AS recusas
FROM users u
JOIN demand_events e ON e.actor_id = u.id
WHERE e.new_status IN ('Aceita para atendimento', 'Recusada')
GROUP BY u.id, u.name
ORDER BY decisoes DESC;

-- B3. Serviços mais solicitados por setor econômico, considerando só as
--     combinações com mais de uma demanda (setor da organização x serviço pedido).
SELECT o.economic_sector AS setor,
       d.service AS servico,
       count(*) AS total
FROM organizations o
JOIN demands d ON d.organization_id = o.id
GROUP BY o.economic_sector, d.service
HAVING count(*) > 1
ORDER BY total DESC, setor, servico;

-- ---------------------------------------------------------------------
-- PARTE C - SUBCONSULTAS
-- ---------------------------------------------------------------------

-- C1. (EXISTS) Organizações com pelo menos uma demanda aceita para atendimento.
SELECT o.name
FROM organizations o
WHERE EXISTS (
        SELECT 1
        FROM demands d
        WHERE d.organization_id = o.id
          AND d.status = 'Aceita para atendimento'
      )
ORDER BY o.name;

-- C2. (Comparação com subconsulta escalar) Solicitantes com mais demandas
--     do que a média dos solicitantes.
SELECT u.name,
       (SELECT count(*) FROM demands d WHERE d.requester_id = u.id) AS demandas
FROM users u
WHERE (SELECT count(*) FROM demands d WHERE d.requester_id = u.id) >
      (SELECT avg(c) FROM (SELECT count(*) AS c FROM demands GROUP BY requester_id) q)
ORDER BY demandas DESC, u.name;

-- C3. (IN aninhado) Solicitantes com demanda de urgência alta ligada a
--     organizações do setor de artesanato.
SELECT u.name
FROM users u
WHERE u.id IN (
        SELECT d.requester_id
        FROM demands d
        WHERE d.urgency = 'HIGH'
          AND d.organization_id IN (
                SELECT o.id
                FROM organizations o
                WHERE o.economic_sector = 'artesanato'
              )
      )
ORDER BY u.name;

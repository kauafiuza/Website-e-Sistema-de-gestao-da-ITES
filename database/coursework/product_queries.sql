-- Lista a fila de demandas pendentes para acompanhamento da equipe.
SELECT code, status, urgency, service, created_at
FROM demands
WHERE status = 'Pendente'
ORDER BY created_at DESC;

-- Prioriza as solicitações classificadas com urgência alta.
SELECT code, service, created_at
FROM demands
WHERE urgency = 'HIGH'
ORDER BY created_at DESC;

-- Consulta organizações por setor econômico, sem confundir setor e serviço pedido.
SELECT name, economic_sector
FROM organizations
WHERE economic_sector = 'artesanato'
ORDER BY name;

-- Localiza demandas registradas nos últimos 30 dias.
SELECT code, status, created_at
FROM demands
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND created_at < CURRENT_DATE + INTERVAL '1 day'
ORDER BY created_at;

-- Lista as publicações que estão ativas.
SELECT public_key, project_id, current_version
FROM publications
WHERE active
ORDER BY created_at DESC;

-- Conta demandas por organização e situação atual.
SELECT o.name, d.status, count(*) AS total_demands
FROM organizations o
JOIN demands d ON d.organization_id = o.id
GROUP BY o.id, o.name, d.status
ORDER BY o.name, d.status;

-- Conta decisões de aceite e recusa por responsável.
SELECT u.first_name, u.last_name, e.new_status, count(*) AS decisions
FROM users u
JOIN demand_events e ON e.actor_id = u.id
WHERE e.new_status IN ('Aceita para atendimento', 'Recusada')
GROUP BY u.id, u.first_name, u.last_name, e.new_status
ORDER BY decisions DESC, u.last_name;

-- Compara o setor das organizações com os serviços solicitados à ITES.
SELECT o.economic_sector, d.service, count(*) AS total_demands
FROM organizations o
JOIN demands d ON d.organization_id = o.id
GROUP BY o.economic_sector, d.service
ORDER BY total_demands DESC, o.economic_sector;

-- Encontra organizações que já tiveram alguma demanda aceita.
SELECT o.id, o.name
FROM organizations o
WHERE EXISTS (
    SELECT 1 FROM demands d
    WHERE d.organization_id = o.id
      AND d.status = 'Aceita para atendimento'
)
ORDER BY o.name;

-- Encontra solicitantes com volume acima da média por solicitante.
SELECT u.id, u.first_name, u.last_name
FROM users u
WHERE (
    SELECT count(*) FROM demands d WHERE d.requester_id = u.id
) > (
    SELECT avg(requester_total)
    FROM (
        SELECT count(*) AS requester_total
        FROM demands
        GROUP BY requester_id
    ) demand_totals
)
ORDER BY u.last_name, u.first_name;

-- Encontra solicitantes com demandas urgentes de organizações de artesanato.
SELECT u.id, u.first_name, u.last_name
FROM users u
WHERE u.id IN (
    SELECT d.requester_id
    FROM demands d
    WHERE d.urgency = 'HIGH'
      AND d.organization_id IN (
          SELECT o.id FROM organizations o
          WHERE o.economic_sector = 'artesanato'
      )
)
ORDER BY u.last_name, u.first_name;

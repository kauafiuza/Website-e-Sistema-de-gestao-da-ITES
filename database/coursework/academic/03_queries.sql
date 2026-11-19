-- Consultas acadêmicas executáveis após 01_schema.sql e 02_seed.sql.
-- Cada resultado demonstra uma operação relacional aplicada ao domínio da ITES.

-- CONSULTAS SIMPLES

-- 1. Mostra a fila de demandas que ainda aguarda análise.
SELECT code, created_at
FROM demands
WHERE status = 'Pendente'
ORDER BY created_at DESC;

-- 2. Prioriza as demandas classificadas com urgência alta.
SELECT code, service
FROM demands
WHERE urgency = 'HIGH'
ORDER BY code;

-- 3. Localiza organizações de artesanato, sem confundir setor com serviço solicitado.
SELECT name, economic_sector
FROM organizations
WHERE economic_sector = 'artesanato'
ORDER BY name;

-- 4. Consulta demandas dentro de um intervalo de datas semiaberto.
SELECT code, status
FROM demands
WHERE created_at >= DATE '2020-01-01'
  AND created_at < DATE '2100-01-01'
ORDER BY created_at;

-- 5. Lista páginas que possuem uma versão publicada.
SELECT slug, title
FROM pages
WHERE published_version_id IS NOT NULL
ORDER BY slug;

-- CONSULTAS COM JOIN E AGREGAÇÃO

-- 6. Conta demandas por organização e situação.
SELECT o.name, d.status, count(*) AS total
FROM organizations o
JOIN demands d ON d.organization_id = o.id
GROUP BY o.id, o.name, d.status
ORDER BY o.name, d.status;

-- 7. Conta decisões de aceite e recusa por responsável.
SELECT u.name, count(*) AS decisions
FROM users u
JOIN demand_events e ON e.actor_id = u.id
WHERE e.new_status IN ('Aceita para atendimento', 'Recusada')
GROUP BY u.id, u.name
ORDER BY decisions DESC;

-- 8. Compara o setor econômico das organizações com os serviços solicitados.
SELECT o.economic_sector, d.service, count(*) AS total
FROM organizations o
JOIN demands d ON d.organization_id = o.id
GROUP BY o.economic_sector, d.service
ORDER BY total DESC;

-- SUBCONSULTAS

-- 9. Usa EXISTS para localizar organizações com alguma demanda aceita.
SELECT o.name
FROM organizations o
WHERE EXISTS (
    SELECT 1
    FROM demands d
    WHERE d.organization_id = o.id
      AND d.status = 'Aceita para atendimento'
)
ORDER BY o.name;

-- 10. Compara o volume de cada solicitante com a média de demandas por solicitante.
SELECT u.name
FROM users u
WHERE (
    SELECT count(*)
    FROM demands d
    WHERE d.requester_id = u.id
) > (
    SELECT avg(requester_total)
    FROM (
        SELECT count(*) AS requester_total
        FROM demands
        GROUP BY requester_id
    ) demand_totals
)
ORDER BY u.name;

-- 11. Usa IN aninhado para localizar pessoas com demanda urgente de artesanato.
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

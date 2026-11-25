package br.com.ites.server.services.Ites;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DemandAnalyticsService {
    private static final Set<String> STATUSES = Set.of("Pendente", "Aceita para atendimento", "Em atendimento", "Concluída", "Recusada", "Cancelada");
    private static final Set<String> URGENCIES = Set.of("LOW", "MEDIUM", "HIGH");
    private final JdbcTemplate jdbc;

    public DemandAnalyticsService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Map<String,Object> query(String status, String urgency, LocalDate from, LocalDate to, String search, boolean includeRecords) {
        validateFilters(status, urgency, from, to);
        String term = searchPattern(search);
        Object[] args = {status,status,urgency,urgency,from,from,to,to,term,term,term,term,term};
        Map<String,Object> summary = jdbc.queryForMap("""
                SELECT count(*) AS total,
                  count(*) FILTER (WHERE d.status='Pendente') AS pending,
                  count(*) FILTER (WHERE d.status='Aceita para atendimento') AS accepted,
                  count(*) FILTER (WHERE d.status='Recusada') AS rejected,
                  count(*) FILTER (WHERE d.urgency='HIGH') AS high_urgency
                FROM demands d JOIN users u ON u.id=d.requester_id LEFT JOIN organizations o ON o.id=d.organization_id
                WHERE (CAST(? AS varchar) IS NULL OR d.status=?) AND (CAST(? AS varchar) IS NULL OR d.urgency=?)
                  AND (CAST(? AS date) IS NULL OR d.created_at >= CAST(? AS date))
                  AND (CAST(? AS date) IS NULL OR d.created_at < (CAST(? AS date) + interval '1 day'))
                  AND (CAST(? AS text) IS NULL OR d.code ILIKE ? OR d.description ILIKE ? OR u.first_name ILIKE ? OR o.name ILIKE ?)
                """, args);
        List<Map<String,Object>> statuses = grouped("d.status", status, urgency, from, to, term);
        List<Map<String,Object>> urgencies = grouped("d.urgency", status, urgency, from, to, term);
        List<Map<String,Object>> services = grouped("d.service", status, urgency, from, to, term);
        List<Map<String,Object>> sectors = grouped("COALESCE(o.economic_sector,'Não informado')", status, urgency, from, to, term);
        List<Map<String,Object>> monthly = jdbc.queryForList("""
                SELECT to_char(date_trunc('month', d.created_at), 'YYYY-MM') AS label, count(*) AS value
                FROM demands d JOIN users u ON u.id=d.requester_id LEFT JOIN organizations o ON o.id=d.organization_id
                WHERE (CAST(? AS varchar) IS NULL OR d.status=?) AND (CAST(? AS varchar) IS NULL OR d.urgency=?)
                  AND (CAST(? AS date) IS NULL OR d.created_at >= CAST(? AS date)) AND (CAST(? AS date) IS NULL OR d.created_at < (CAST(? AS date) + interval '1 day'))
                  AND (CAST(? AS text) IS NULL OR d.code ILIKE ? OR d.description ILIKE ? OR u.first_name ILIKE ? OR o.name ILIKE ?)
                GROUP BY date_trunc('month', d.created_at) ORDER BY date_trunc('month', d.created_at)
                """, args);
        List<Map<String,Object>> rows = includeRecords ? rows(status, urgency, from, to, term, 500) : List.of();
        return Map.of("summary",summary,"byStatus",statuses,"byUrgency",urgencies,"byService",services,"byOrganizationSector",sectors,"byMonth",monthly,"demands",rows);
    }

    public List<Map<String,Object>> rows(String status, String urgency, LocalDate from, LocalDate to, String search, int limit) {
        validateFilters(status, urgency, from, to);
        String term = searchPattern(search);
        return jdbc.queryForList("""
                SELECT d.id,d.code,d.service,d.description,d.urgency,d.status,d.created_at,
                  u.id AS requester_id,u.first_name,u.last_name,o.id AS organization_id,o.name AS organization_name
                FROM demands d JOIN users u ON u.id=d.requester_id LEFT JOIN organizations o ON o.id=d.organization_id
                WHERE (CAST(? AS varchar) IS NULL OR d.status=?) AND (CAST(? AS varchar) IS NULL OR d.urgency=?)
                  AND (CAST(? AS date) IS NULL OR d.created_at >= CAST(? AS date)) AND (CAST(? AS date) IS NULL OR d.created_at < (CAST(? AS date) + interval '1 day'))
                  AND (CAST(? AS text) IS NULL OR d.code ILIKE ? OR d.description ILIKE ? OR u.first_name ILIKE ? OR o.name ILIKE ?)
                ORDER BY d.created_at DESC LIMIT ?
                """, status,status,urgency,urgency,from,from,to,to,term,term,term,term,term,limit);
    }

    public Map<String,Object> detail(UUID id) {
        List<Map<String,Object>> records = jdbc.queryForList("""
                SELECT d.id,d.code,d.capacity,d.capacity_other,d.service,d.description,d.urgency,d.status,d.review_notes,
                  d.completion_note,d.created_at,d.updated_at,u.first_name,u.last_name,o.name AS organization_name
                FROM demands d JOIN users u ON u.id=d.requester_id LEFT JOIN organizations o ON o.id=d.organization_id
                WHERE d.id=?
                """,id);
        if (records.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Demanda não encontrada");
        return Map.of("demand",records.getFirst(),"history",jdbc.queryForList("""
                SELECT e.old_status,e.new_status,e.justification,e.occurred_at,u.first_name,u.last_name
                FROM demand_events e JOIN users u ON u.id=e.actor_id WHERE e.demand_id=? ORDER BY e.occurred_at,e.id
                """,id));
    }

    private List<Map<String,Object>> grouped(String dimension, String status, String urgency, LocalDate from, LocalDate to, String term) {
        String sql = """
                SELECT %s AS label,count(*) AS value FROM demands d
                JOIN users u ON u.id=d.requester_id LEFT JOIN organizations o ON o.id=d.organization_id
                WHERE (CAST(? AS varchar) IS NULL OR d.status=?) AND (CAST(? AS varchar) IS NULL OR d.urgency=?)
                  AND (CAST(? AS date) IS NULL OR d.created_at >= CAST(? AS date)) AND (CAST(? AS date) IS NULL OR d.created_at < (CAST(? AS date) + interval '1 day'))
                  AND (CAST(? AS text) IS NULL OR d.code ILIKE ? OR d.description ILIKE ? OR u.first_name ILIKE ? OR o.name ILIKE ?)
                GROUP BY %s ORDER BY value DESC,label
                """.formatted(dimension, dimension);
        return jdbc.queryForList(sql,status,status,urgency,urgency,from,from,to,to,term,term,term,term,term);
    }

    private static String searchPattern(String search) {
        if (search == null || search.isBlank()) return null;
        String normalized = search.trim();
        if (normalized.length() > 200)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Busca muito extensa");
        return "%" + normalized + "%";
    }

    private static void validateFilters(String status, String urgency, LocalDate from, LocalDate to) {
        if (status != null && !STATUSES.contains(status))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Situação inválida");
        if (urgency != null && !URGENCIES.contains(urgency))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Urgência inválida");
        if (from != null && to != null && to.isBefore(from))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"O fim do período antecede o início");
    }
}

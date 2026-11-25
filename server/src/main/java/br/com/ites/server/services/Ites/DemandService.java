package br.com.ites.server.services.Ites;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DemandService {
    private final JdbcTemplate jdbc;
    private final ItesAccessService access;

    public DemandService(JdbcTemplate jdbc, ItesAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    public record NewDemand(UUID organizationId, String capacity, String capacityOther,
                            String service, String description, String urgency) {}
    public record Decision(String status, String justification, String completionNote) {}

    public Map<String, Object> create(UUID userId, NewDemand request) {
        if (request == null || request.capacity() == null || request.service() == null
                || request.description() == null || request.urgency() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados obrigatórios ausentes");
        }
        if (request.organizationId() != null) {
            Boolean associated = jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM organization_memberships WHERE organization_id=? AND user_id=?)
                    """, Boolean.class, request.organizationId(), userId);
            if (!Boolean.TRUE.equals(associated)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Organização não associada ao solicitante");
            }
        }
        UUID id = UUID.randomUUID();
        try {
            jdbc.update("""
                    INSERT INTO demands(id,requester_id,organization_id,capacity,capacity_other,service,description,urgency)
                    VALUES(?,?,?,?,?,?,?,?)
                    """, id, userId, request.organizationId(), request.capacity(), request.capacityOther(),
                    request.service(), request.description(), request.urgency());
        } catch (org.springframework.dao.DataIntegrityViolationException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados da demanda inválidos", error);
        }
        return getOwned(userId, id);
    }

    public List<Map<String, Object>> listOwned(UUID userId) {
        return jdbc.queryForList("""
                SELECT d.id,d.code,d.capacity,d.service,d.description,d.urgency,d.status,d.organization_id,d.created_at,d.updated_at,
                       (SELECT e.justification FROM demand_events e WHERE e.demand_id=d.id ORDER BY e.occurred_at DESC LIMIT 1) AS decision_justification
                FROM demands d WHERE requester_id=? ORDER BY created_at DESC LIMIT 100
                """, userId);
    }

    public Map<String, Object> getOwned(UUID userId, UUID id) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT d.id,d.code,d.capacity,d.capacity_other,d.service,d.description,d.urgency,d.status,
                       d.organization_id,d.completion_note,d.created_at,d.updated_at,
                       (SELECT e.justification FROM demand_events e WHERE e.demand_id=d.id ORDER BY e.occurred_at DESC LIMIT 1) AS decision_justification
                FROM demands d WHERE id=? AND requester_id=?
                """, id, userId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Demanda não encontrada");
        return rows.getFirst();
    }

    public List<Map<String, Object>> listForReview(UUID userId, String status) {
        access.require(userId, "demands.read");
        return jdbc.queryForList("""
                SELECT d.id,d.code,d.service,d.description,d.urgency,d.status,d.review_notes,d.created_at,
                       u.first_name,u.last_name,u.email,o.name AS organization_name
                FROM demands d JOIN users u ON u.id=d.requester_id
                LEFT JOIN organizations o ON o.id=d.organization_id
                WHERE (? IS NULL OR d.status=?) ORDER BY d.created_at DESC LIMIT 100
                """, status, status);
    }

    public void classify(UUID actorId, UUID id, String notes) {
        access.require(actorId, "demands.review");
        if (notes == null || notes.isBlank() || notes.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Classificação inválida");
        }
        if (jdbc.update("UPDATE demands SET review_notes=? WHERE id=?", notes, id) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Demanda não encontrada");
        }
    }

    @Transactional
    public Map<String,Object> decide(UUID actorId, UUID id, Decision request) {
        access.require(actorId, "demands.decide");
        if (request == null || request.status() == null || request.justification() == null
                || request.justification().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Justificativa obrigatória");
        }
        String oldStatus = jdbc.query("SELECT status FROM demands WHERE id=? FOR UPDATE",
                rs -> rs.next() ? rs.getString(1) : null, id);
        if (oldStatus == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Demanda não encontrada");
        boolean valid = switch (oldStatus) {
            case "Pendente" -> List.of("Aceita para atendimento", "Recusada", "Cancelada").contains(request.status());
            case "Aceita para atendimento" -> List.of("Em atendimento", "Cancelada").contains(request.status());
            case "Em atendimento" -> List.of("Concluída", "Cancelada").contains(request.status());
            default -> false;
        };
        if (!valid || ("Concluída".equals(request.status()) &&
                (request.completionNote() == null || request.completionNote().isBlank()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transição inválida ou conclusão incompleta");
        }
        jdbc.update("UPDATE demands SET status=?,completion_note=?,updated_at=now() WHERE id=?",
                request.status(), request.completionNote(), id);
        jdbc.update("""
                INSERT INTO demand_events(demand_id,actor_id,old_status,new_status,justification)
                VALUES(?,?,?,?,?)
                """, id, actorId, oldStatus, request.status(), request.justification());
        return jdbc.queryForMap("SELECT id,code,status,updated_at FROM demands WHERE id=?", id);
    }
}

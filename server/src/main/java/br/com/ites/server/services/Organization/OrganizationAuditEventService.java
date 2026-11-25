package br.com.ites.server.services.Organization;

import br.com.ites.server.utils.pagination.PageRequest;
import br.com.ites.server.utils.pagination.PageResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Grava eventos administrativos sem receber payloads ou valores pessoais. */
@Service
public class OrganizationAuditEventService {
    private final JdbcTemplate jdbc;
    public OrganizationAuditEventService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record AuditEvent(UUID id, UUID organizationId, UUID actorUserId, String action,
                             String targetType, UUID targetId, OffsetDateTime occurredAt) {}

    /** Deve ser chamado dentro da transação do caso de uso que originou o evento. */
    public void append(UUID organizationId, UUID actorUserId, String action,
            String targetType, UUID targetId) {
        jdbc.update("""
                INSERT INTO organization_audit_events
                    (organization_id, actor_user_id, action, target_type, target_id)
                VALUES (?, ?, ?, ?, ?)
                """, organizationId, actorUserId, action, targetType, targetId);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditEvent> list(UUID organizationId, int page, int size) {
        PageRequest request = PageRequest.of(page, size, 100);
        List<AuditEvent> events = jdbc.query("""
                SELECT id, organization_id, actor_user_id, action, target_type, target_id, occurred_at
                FROM organization_audit_events
                WHERE organization_id = ?
                ORDER BY occurred_at DESC, id DESC
                LIMIT ? OFFSET ?
                """, (rs, row) -> new AuditEvent(
                rs.getObject("id", UUID.class), rs.getObject("organization_id", UUID.class),
                rs.getObject("actor_user_id", UUID.class), rs.getString("action"),
                rs.getString("target_type"), rs.getObject("target_id", UUID.class),
                rs.getObject("occurred_at", OffsetDateTime.class)),
                organizationId, request.size(), request.offset());
        Long total = jdbc.queryForObject("""
                SELECT count(*) FROM organization_audit_events WHERE organization_id = ?
                """, Long.class, organizationId);
        return PageResponse.of(events, request, total == null ? 0 : total);
    }
}

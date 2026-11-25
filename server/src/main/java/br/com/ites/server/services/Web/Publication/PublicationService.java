package br.com.ites.server.services.Web.Publication;

import br.com.ites.server.models.Web.Project.ProjectEntity;
import br.com.ites.server.repositories.Web.Project.ProjectRepository;
import br.com.ites.server.repositories.Web.Project.ProjectRevisionRepository;
import br.com.ites.server.repositories.Web.Project.ProjectRevisionRepository.RevisionSnapshot;
import br.com.ites.server.repositories.Web.Publication.PublicationRepository;
import br.com.ites.server.repositories.Web.Publication.PublicationRepository.SummaryRow;
import br.com.ites.server.repositories.Web.Publication.PublicationReviewRepository;
import br.com.ites.server.repositories.Web.Publication.PublicationReviewRepository.ReviewRequest;
import br.com.ites.server.repositories.Web.Publication.PublicationReviewRepository.InboxRequest;
import br.com.ites.server.repositories.Organization.OrganizationRepository;
import br.com.ites.server.models.Organization.PermissionAction;
import br.com.ites.server.models.Organization.GrantScopeType;
import br.com.ites.server.services.Organization.OrganizationAuthorizationService;
import br.com.ites.server.services.Organization.OrganizationAuditEventService;
import br.com.ites.server.services.Organization.OrganizationFeatureService;
import br.com.ites.server.services.Ites.ItesAccessService;
import br.com.ites.server.models.Organization.OrganizationFeature;
import br.com.ites.server.utils.pagination.PageRequest;
import br.com.ites.server.utils.pagination.PageResponse;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class PublicationService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final JdbcTemplate db;
    private final ProjectRepository projects;
    private final ProjectRevisionRepository revisions;
    private final PublicationRepository publications;
    private final PublicationReviewRepository reviews;
    private final ObjectMapper json;
    private final OrganizationRepository organizations;
    private final OrganizationAuthorizationService authorization;
    private final OrganizationFeatureService features;
    private final FormResourceVersionService formVersions;
    private final OrganizationAuditEventService auditEvents;
    private final ItesAccessService access;

    public PublicationService(JdbcTemplate db, ProjectRepository projects, ProjectRevisionRepository revisions,
                              PublicationRepository publications, ObjectMapper json,
                              PublicationReviewRepository reviews,
                              OrganizationRepository organizations,
                              OrganizationAuthorizationService authorization,
                              OrganizationFeatureService features,
                              FormResourceVersionService formVersions,
                              OrganizationAuditEventService auditEvents, ItesAccessService access) {
        this.db = db;
        this.projects = projects;
        this.revisions = revisions;
        this.publications = publications;
        this.reviews = reviews;
        this.json = json;
        this.organizations = organizations;
        this.authorization = authorization;
        this.features = features;
        this.formVersions = formVersions;
        this.auditEvents = auditEvents;
        this.access = access;
    }

    public record Version(int number, long projectRevision, UUID projectRevisionId,
                          OffsetDateTime publishedAt, OffsetDateTime expiresAt) {}
    public record Publication(UUID projectId, String projectName, String publicKey, boolean active,
                              int currentVersion, long views, long clicks, long interactions,
                              JsonNode preview, List<Version> versions) {}
    public record PublicPage(String publicKey, int version, long projectRevision,
                             JsonNode document, String pageId, JsonNode formReferences) {}
    public record DailyActivity(LocalDate day, long views, long clicks, long interactions) {}
    public record ActivityEvent(long id, String type, int version, String path, String target,
                                OffsetDateTime occurredAt) {}
    public record Analytics(List<DailyActivity> daily, PageResponse<ActivityEvent> recent) {}
    public enum ReviewOperation { PUBLISH, RESTORE }
    public record ReviewDecision(boolean approved) {}
    public record ReviewPreview(long projectRevision, JsonNode document) {}

    @Transactional
    public Publication publish(UUID ownerId, UUID selectedOrganizationId, UUID projectId, UUID reviewRequestId) {
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        requireProject(ownerId, organizationId, projectId, PermissionAction.PUBLICATION_MANAGE);
        List<UUID> owned = db.query("SELECT id FROM projects WHERE id = ? AND organization_id = ? FOR UPDATE",
                (rs, row) -> UUID.fromString(rs.getString(1)), projectId, organizationId);
        if (owned.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        ProjectEntity project = projects.findByIdAndOrganization_Id(projectId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        RevisionSnapshot draftRevision = revisions.findDraft(projectId, project.getRevision())
                .orElseThrow(() -> new IllegalStateException("Revisão atual do projeto não encontrada"));
        JsonNode draftDocument = readDocument(draftRevision.documentJson());
        JsonNode formReferences = formVersions.snapshotReferences(organizationId, projectId, draftDocument);
        boolean rootAdministrator = access.isSystemAdministrator(ownerId) && Boolean.TRUE.equals(
                db.queryForObject("SELECT site_role='ROOT' FROM projects WHERE id=?", Boolean.class, projectId));
        if (!rootAdministrator)
            consumeApprovedReview(ownerId, organizationId, projectId, reviewRequestId,
                    draftRevision.id(), ReviewOperation.PUBLISH, null);
        List<UUID> existing = db.query("SELECT id FROM publications WHERE project_id = ? FOR UPDATE",
                (rs, row) -> UUID.fromString(rs.getString(1)), projectId);
        UUID publicationId;
        if (existing.isEmpty()) {
            publicationId = UUID.randomUUID();
            byte[] entropy = new byte[18];
            RANDOM.nextBytes(entropy);
            String slug = Normalizer.normalize(project.getName(), Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "").toLowerCase(java.util.Locale.ROOT)
                    .replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
            if (slug.isBlank()) slug = "projeto";
            String key = slug.substring(0, Math.min(slug.length(), 100)) + "-"
                    + Base64.getUrlEncoder().withoutPadding().encodeToString(entropy);
            db.update("INSERT INTO publications(id, project_id, organization_id, public_key) VALUES (?, ?, ?, ?)",
                    publicationId, projectId, organizationId, key);
        } else publicationId = existing.getFirst();

        if (!existing.isEmpty()) {
            Boolean sameSnapshot = db.queryForObject("""
                    SELECT EXISTS (
                        SELECT 1 FROM publication_versions v
                        JOIN publications p ON p.id = v.publication_id AND v.version_number = p.current_version
                        WHERE p.id = ? AND v.project_revision = ?
                          AND v.document = ?::jsonb AND v.route_blueprint = ?::jsonb
                          AND v.form_references = ?::jsonb
                    )
                    """, Boolean.class, publicationId, draftRevision.revision(),
                    draftRevision.documentJson(), draftRevision.routeBlueprintJson(), formReferences.toString());
            if (Boolean.TRUE.equals(sameSnapshot)) {
                db.update("UPDATE publications SET active = true WHERE id = ?", publicationId);
                auditEvents.append(organizationId, ownerId, "PUBLICATION_PUBLISHED", "PUBLICATION", publicationId);
                return findPublication(organizationId, projectId);
            }
        }
        int version = db.queryForObject("SELECT current_version FROM publications WHERE id = ?", Integer.class, publicationId) + 1;
        db.update("UPDATE publication_versions SET expires_at = now() + interval '30 days' WHERE publication_id = ? AND version_number = ?",
                publicationId, version - 1);
        db.update("""
                INSERT INTO publication_versions
                    (id, publication_id, project_id, version_number, document, route_blueprint,
                     project_revision, project_revision_id, form_references)
                VALUES (?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, ?::jsonb)
                """, UUID.randomUUID(), publicationId, projectId, version, draftRevision.documentJson(),
                draftRevision.routeBlueprintJson(), draftRevision.revision(), draftRevision.id(), formReferences.toString());
        db.update("UPDATE publications SET current_version = ?, active = true WHERE id = ?", version, publicationId);
        purgePublicationHistory(publicationId, version - 2);
        auditEvents.append(organizationId, ownerId, "PUBLICATION_PUBLISHED", "PUBLICATION", publicationId);
        return findPublication(organizationId, projectId);
    }

    @Transactional(readOnly = true)
    public PageResponse<Publication> list(UUID ownerId, UUID selectedOrganizationId, int page, int size, String query, String sort) {
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        authorization.requireOrganization(ownerId, organizationId, PermissionAction.PUBLICATION_READ);
        String cleanQuery = query == null ? "" : query.strip();
        if (cleanQuery.length() > 120 || !List.of("recent", "old", "name").contains(sort))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filtro de publicações inválido");
        return publications.findByOrganization(organizationId, cleanQuery, sort, PageRequest.of(page, size, 10))
                .map(this::toPublication);
    }

    @Transactional(readOnly = true)
    public Publication get(UUID ownerId, UUID selectedOrganizationId, UUID projectId) {
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        requireProject(ownerId, organizationId, projectId, PermissionAction.PUBLICATION_READ);
        return findPublication(organizationId, projectId);
    }

    private Publication findPublication(UUID organizationId, UUID projectId) {
        return publications.findByOrganizationAndProject(organizationId, projectId)
                .map(this::toPublication)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional
    public Publication setActive(UUID ownerId, UUID selectedOrganizationId, UUID projectId, boolean active) {
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        requireProject(ownerId, organizationId, projectId, PermissionAction.PUBLICATION_MANAGE);
        int changed = db.update("UPDATE publications p SET active = ? FROM projects pr WHERE p.project_id = pr.id AND p.project_id = ? AND pr.organization_id = ?", active, projectId, organizationId);
        if (changed == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        UUID publicationId = db.queryForObject("SELECT id FROM publications WHERE project_id = ?", UUID.class, projectId);
        auditEvents.append(organizationId, ownerId, active ? "PUBLICATION_ACTIVATED" : "PUBLICATION_DEACTIVATED",
                "PUBLICATION", publicationId);
        return findPublication(organizationId, projectId);
    }

    @Transactional
    public Publication restore(UUID ownerId, UUID selectedOrganizationId, UUID projectId, int version,
                               UUID reviewRequestId) {
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        requireProject(ownerId, organizationId, projectId, PermissionAction.PUBLICATION_MANAGE);
        List<UUID> locked = db.query("SELECT p.id FROM publications p JOIN projects pr ON pr.id = p.project_id WHERE p.project_id = ? AND pr.organization_id = ? FOR UPDATE OF p",
                (rs, row) -> UUID.fromString(rs.getString(1)), projectId, organizationId);
        if (locked.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        UUID id = locked.getFirst();
        Publication publication = findPublication(organizationId, projectId);
        if (version == publication.currentVersion()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Versão já está ativa");
        List<UUID> snapshots = db.query("SELECT v.project_revision_id FROM publication_versions v JOIN publications p ON p.id = v.publication_id WHERE p.project_id = ? AND v.version_number = ? AND (v.expires_at IS NULL OR v.expires_at > now())",
                (rs, row) -> rs.getObject(1, UUID.class), projectId, version);
        if (snapshots.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        consumeApprovedReview(ownerId, organizationId, projectId, reviewRequestId,
                snapshots.getFirst(), ReviewOperation.RESTORE, version);
        int next = publication.currentVersion() + 1;
        db.update("UPDATE publication_versions SET expires_at = now() + interval '30 days' WHERE publication_id = ? AND version_number = ?", id, publication.currentVersion());
        db.update("INSERT INTO publication_versions(id, publication_id, project_id, version_number, document, route_blueprint, project_revision, project_revision_id, expires_at, form_references) SELECT ?, publication_id, project_id, ?, document, route_blueprint, project_revision, project_revision_id, NULL, form_references FROM publication_versions WHERE publication_id = ? AND version_number = ?",
                UUID.randomUUID(), next, id, version);
        db.update("UPDATE publications SET current_version = ?, active = true WHERE id = ?", next, id);
        purgePublicationHistory(id, next - 2);
        auditEvents.append(organizationId, ownerId, "PUBLICATION_RESTORED", "PUBLICATION", id);
        return findPublication(organizationId, projectId);
    }

    @Transactional(readOnly = true)
    public List<ReviewRequest> listReviewRequests(UUID actorId, UUID selectedOrganizationId, UUID projectId) {
        UUID organizationId = organizationId(actorId, selectedOrganizationId);
        if (!projects.existsByIdAndOrganization_Id(projectId, organizationId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        boolean canReadProject = authorization.allowsResource(actorId, organizationId,
                PermissionAction.PROJECT_READ, GrantScopeType.PROJECT, projectId);
        boolean canReadPublication = authorization.allowsResource(actorId, organizationId,
                PermissionAction.PUBLICATION_READ, GrantScopeType.PROJECT, projectId);
        boolean canApprove = authorization.allowsResource(actorId, organizationId,
                PermissionAction.PUBLICATION_APPROVE, GrantScopeType.PROJECT, projectId);
        if (!canReadProject && !canReadPublication && !canApprove)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return reviews.list(organizationId, projectId);
    }

    @Transactional(readOnly = true)
    public boolean canDecideReview(UUID actorId, UUID selectedOrganizationId, ReviewRequest request) {
        if (!"PENDING".equals(request.state()) || request.requesterUserId().equals(actorId)) return false;
        UUID organizationId = organizationId(actorId, selectedOrganizationId);
        return authorization.allowsResource(actorId, organizationId, PermissionAction.PUBLICATION_APPROVE,
                GrantScopeType.PROJECT, request.projectId());
    }

    @Transactional(readOnly = true)
    public List<InboxRequest> listReviewInbox(UUID actorId, UUID selectedOrganizationId) {
        UUID organizationId = organizationId(actorId, selectedOrganizationId);
        if (!authorization.allowsAnyProject(actorId, organizationId, PermissionAction.PUBLICATION_APPROVE))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return reviews.listPendingForOrganization(organizationId, actorId).stream()
                .filter(item -> authorization.allowsResource(actorId, organizationId,
                        PermissionAction.PUBLICATION_APPROVE, GrantScopeType.PROJECT,
                        item.request().projectId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ReviewPreview reviewPreview(UUID actorId, UUID selectedOrganizationId, UUID projectId,
            UUID requestId) {
        UUID organizationId = organizationId(actorId, selectedOrganizationId);
        if (!projects.existsByIdAndOrganization_Id(projectId, organizationId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        ReviewRequest request = reviews.find(organizationId, projectId, requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!canDecideReview(actorId, organizationId, request))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        RevisionSnapshot revision = revisions.findForReview(organizationId, projectId, request.projectRevisionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return new ReviewPreview(revision.revision(), readDocument(revision.documentJson()));
    }

    @Transactional
    public ReviewRequest requestReview(UUID actorId, UUID selectedOrganizationId, UUID projectId,
            UUID projectRevisionId, ReviewOperation operation, Integer targetVersion) {
        UUID organizationId = organizationId(actorId, selectedOrganizationId);
        requireOneOfProjectActions(actorId, organizationId, projectId,
                PermissionAction.PROJECT_READ, PermissionAction.PUBLICATION_MANAGE);
        if (operation == ReviewOperation.PUBLISH) {
            if (targetVersion != null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PUBLISH não recebe versão de destino");
            List<UUID> current = db.query("""
                    SELECT r.id FROM project_revisions r JOIN projects p ON p.id = r.project_id
                    WHERE p.organization_id = ? AND p.id = ? AND r.id = ?
                      AND r.revision_kind = 'DRAFT' AND r.revision_number = p.revision
                    """, (rs, row) -> rs.getObject(1, UUID.class), organizationId, projectId, projectRevisionId);
            if (current.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "A revisão não é o rascunho atual");
        } else {
            if (targetVersion == null || targetVersion < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Versão de destino obrigatória");
            List<UUID> snapshot = db.query("""
                    SELECT v.project_revision_id FROM publication_versions v
                    JOIN publications p ON p.id = v.publication_id
                    WHERE p.project_id = ? AND p.current_version <> v.version_number
                      AND v.version_number = ? AND v.project_revision_id = ?
                      AND (v.expires_at IS NULL OR v.expires_at > now())
                    """, (rs, row) -> rs.getObject(1, UUID.class), projectId, targetVersion, projectRevisionId);
            if (snapshot.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        UUID requestId = UUID.randomUUID();
        reviews.create(requestId, projectId, projectRevisionId, operation.name(), targetVersion, actorId);
        auditEvents.append(organizationId, actorId, "REVIEW_REQUESTED", "PUBLICATION_REVIEW", requestId);
        return reviews.findForUpdate(organizationId, projectId, requestId).orElseThrow();
    }

    @Transactional
    public ReviewRequest decideReview(UUID actorId, UUID selectedOrganizationId, UUID projectId,
            UUID requestId, boolean approved) {
        UUID organizationId = organizationId(actorId, selectedOrganizationId);
        requireProject(actorId, organizationId, projectId, PermissionAction.PUBLICATION_APPROVE);
        ReviewRequest request = reviews.findForUpdate(organizationId, projectId, requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (request.requesterUserId().equals(actorId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A pessoa solicitante não pode aprovar a própria revisão");
        if (!"PENDING".equals(request.state())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Solicitação já decidida");
        reviews.decide(requestId, actorId, approved);
        auditEvents.append(organizationId, actorId, approved ? "REVIEW_APPROVED" : "REVIEW_REJECTED",
                "PUBLICATION_REVIEW", requestId);
        return reviews.findForUpdate(organizationId, projectId, requestId).orElseThrow();
    }

    private void consumeApprovedReview(UUID actorId, UUID organizationId, UUID projectId, UUID requestId,
            UUID revisionId, ReviewOperation operation, Integer targetVersion) {
        if (requestId == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Aprovação de revisão obrigatória");
        ReviewRequest request = reviews.findForUpdate(organizationId, projectId, requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Aprovação de revisão inválida"));
        if (!"APPROVED".equals(request.state()) || request.approverUserId() == null || request.consumedAt() != null
                || request.requesterUserId().equals(request.approverUserId())
                || !request.projectRevisionId().equals(revisionId)
                || !request.operation().equals(operation.name())
                || !java.util.Objects.equals(request.targetVersion(), targetVersion)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Aprovação não corresponde à revisão solicitada");
        }
        if (reviews.consume(requestId) != 1)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A aprovação já foi utilizada");
    }

    private void purgePublicationHistory(UUID publicationId, int minimumVersion) {
        List<UUID> removedSnapshots = db.query("""
                WITH removed_versions AS (
                    DELETE FROM publication_versions
                    WHERE publication_id = ?
                      AND (version_number < ? OR expires_at <= now())
                    RETURNING project_revision_id
                )
                SELECT DISTINCT removed.project_revision_id
                FROM removed_versions removed
                JOIN project_revisions r ON r.id = removed.project_revision_id
                WHERE r.revision_kind = 'PUBLICATION_SNAPSHOT'
                """, (rs, row) -> rs.getObject(1, UUID.class), publicationId, minimumVersion);
        if (removedSnapshots.isEmpty()) return;
        String placeholders = String.join(",", java.util.Collections.nCopies(removedSnapshots.size(), "?"));
        List<Object> parameters = new java.util.ArrayList<>(removedSnapshots);
        db.update("DELETE FROM project_revisions r WHERE r.id IN (" + placeholders + ") " +
                "AND r.revision_kind = 'PUBLICATION_SNAPSHOT' " +
                "AND NOT EXISTS (SELECT 1 FROM publication_versions retained WHERE retained.project_revision_id = r.id)",
                parameters.toArray());
    }

    @Transactional
    public PublicPage publicPage(String key, String path) {
        UUID organizationId = activePublicationOrganization(key);
        features.requireEnabled(organizationId, OrganizationFeature.PUBLICATIONS);
        String requested = path == null ? "" : path.replaceAll("^/|/$", "");
        List<PublicPage> pages = db.query("SELECT p.current_version, v.project_revision, v.document::text, v.route_blueprint::text, v.form_references::text FROM publications p JOIN publication_versions v ON v.publication_id = p.id AND v.version_number = p.current_version WHERE p.public_key = ? AND p.active = true",
                (rs, row) -> {
                    try {
                        JsonNode document = json.readTree(rs.getString(3));
                        JsonNode routes = json.readTree(rs.getString(4));
                        JsonNode formReferences = json.readTree(rs.getString(5));
                        String pageId = null;
                        for (JsonNode route : routes) if (route.path("path").asText().equals(requested)) pageId = route.path("pageId").asText();
                        if (requested.isBlank()) pageId = document.path("activePageId").asText();
                        return new PublicPage(key, rs.getInt(1), rs.getLong(2), document, pageId, formReferences);
                    } catch (Exception e) { throw new IllegalStateException("Snapshot inválido", e); }
                }, key);
        if (pages.isEmpty() || pages.getFirst().pageId() == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        db.update("INSERT INTO publication_events(publication_id, version_number, event_type, page_path) SELECT id, current_version, 'view', ? FROM publications WHERE public_key = ?", requested, key);
        return pages.getFirst();
    }

    @Transactional
    public void interaction(String key, String type, String path, String target) {
        if (!type.equals("click") && !type.equals("interaction"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de interação inválido");
        UUID organizationId = activePublicationOrganization(key);
        features.requireEnabled(organizationId, OrganizationFeature.PUBLICATIONS);
        String safePath = bounded(path, 300);
        String safeTarget = bounded(target, 160);
        int changed = db.update("INSERT INTO publication_events(publication_id, version_number, event_type, page_path, target) SELECT id, current_version, ?, ?, ? FROM publications WHERE public_key = ? AND active = true",
                type, safePath, safeTarget, key);
        if (changed == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    private UUID activePublicationOrganization(String key) {
        return publications.findActiveOrganizationIdByPublicKey(key)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public Analytics analytics(UUID ownerId, UUID selectedOrganizationId, UUID projectId) {
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        requireProject(ownerId, organizationId, projectId, PermissionAction.PUBLICATION_ANALYTICS_READ);
        if (publications.findByOrganizationAndProject(organizationId, projectId).isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        List<DailyActivity> daily = db.query("""
                SELECT occurred_at::date AS day,
                       count(*) FILTER (WHERE event_type = 'view') AS views,
                       count(*) FILTER (WHERE event_type = 'click') AS clicks,
                       count(*) FILTER (WHERE event_type = 'interaction') AS interactions
                FROM publication_events WHERE publication_id = (SELECT id FROM publications WHERE project_id = ?)
                  AND occurred_at >= now() - interval '30 days'
                GROUP BY occurred_at::date ORDER BY day
                """, (rs, row) -> new DailyActivity(rs.getObject(1, LocalDate.class), rs.getLong(2), rs.getLong(3), rs.getLong(4)), projectId);
        PageResponse<ActivityEvent> recent = activity(ownerId, selectedOrganizationId, projectId, 0, 10);
        return new Analytics(daily, recent);
    }

    @Transactional(readOnly = true)
    public PageResponse<ActivityEvent> activity(UUID ownerId, UUID selectedOrganizationId, UUID projectId, int page, int size) {
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        requireProject(ownerId, organizationId, projectId, PermissionAction.PUBLICATION_ACTIVITY_READ);
        if (publications.findByOrganizationAndProject(organizationId, projectId).isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        PageRequest request = PageRequest.of(page, size, 10);
        List<ActivityEvent> items = db.query("""
                SELECT id, event_type, version_number, page_path, target, occurred_at
                FROM publication_events WHERE publication_id = (SELECT id FROM publications WHERE project_id = ?)
                ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?
                """, (rs, row) -> new ActivityEvent(rs.getLong(1), rs.getString(2), rs.getInt(3),
                rs.getString(4), rs.getString(5), rs.getObject(6, OffsetDateTime.class)),
                projectId, request.size(), request.offset());
        Long total = db.queryForObject("SELECT count(*) FROM publication_events WHERE publication_id = (SELECT id FROM publications WHERE project_id = ?)", Long.class, projectId);
        return PageResponse.of(items, request, total == null ? 0 : total);
    }

    @Transactional(readOnly = true)
    public List<DailyActivity> overview(UUID ownerId, UUID selectedOrganizationId) {
        UUID organizationId = organizationId(ownerId, selectedOrganizationId);
        authorization.requireOrganization(ownerId, organizationId, PermissionAction.PUBLICATION_ANALYTICS_READ);
        return db.query("""
                SELECT e.occurred_at::date AS day,
                       count(*) FILTER (WHERE e.event_type = 'view') AS views,
                       count(*) FILTER (WHERE e.event_type = 'click') AS clicks,
                       count(*) FILTER (WHERE e.event_type = 'interaction') AS interactions
                FROM publication_events e
                JOIN publications p ON p.id = e.publication_id
                JOIN projects pr ON pr.id = p.project_id
                WHERE pr.organization_id = ? AND e.occurred_at >= now() - interval '30 days'
                GROUP BY e.occurred_at::date ORDER BY day
                """, (rs, row) -> new DailyActivity(rs.getObject(1, LocalDate.class), rs.getLong(2), rs.getLong(3), rs.getLong(4)), organizationId);
    }

    private static String bounded(String value, int max) {
        if (value == null) return null;
        String clean = value.strip();
        if (clean.length() > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Detalhe da interação muito longo");
        return clean;
    }

    private JsonNode readDocument(String document) {
        try {
            return json.readTree(document);
        } catch (Exception exception) {
            throw new IllegalStateException("Snapshot de projeto inválido", exception);
        }
    }

    private UUID organizationId(UUID userId, UUID selectedOrganizationId) {
        if (selectedOrganizationId != null) return selectedOrganizationId;
        return organizations.findDefaultOrganizationId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
    }

    private void requireProject(UUID userId, UUID organizationId, UUID projectId, PermissionAction action) {
        if (!projects.existsByIdAndOrganization_Id(projectId, organizationId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        authorization.requireResource(userId, organizationId, action, GrantScopeType.PROJECT, projectId);
    }

    private void requireOneOfProjectActions(UUID userId, UUID organizationId, UUID projectId,
            PermissionAction first, PermissionAction second) {
        if (!projects.existsByIdAndOrganization_Id(projectId, organizationId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        try {
            authorization.requireResource(userId, organizationId, first, GrantScopeType.PROJECT, projectId);
        } catch (ResponseStatusException error) {
            if (error.getStatusCode() != HttpStatus.FORBIDDEN) throw error;
            authorization.requireResource(userId, organizationId, second, GrantScopeType.PROJECT, projectId);
        }
    }

    private Publication toPublication(SummaryRow row) {
        try {
            JsonNode preview = json.readTree(row.previewJson());
            List<Version> versions = new java.util.ArrayList<>();
            for (JsonNode version : json.readTree(row.versionsJson())) {
                versions.add(new Version(version.path("number").asInt(), version.path("projectRevision").asLong(),
                        UUID.fromString(version.path("projectRevisionId").asText()),
                        date(version.get("publishedAt")), date(version.get("expiresAt"))));
            }
            return new Publication(row.projectId(), row.projectName(), row.publicKey(), row.active(),
                    row.currentVersion(), row.views(), row.clicks(), row.interactions(), preview, List.copyOf(versions));
        } catch (Exception e) {
            throw new IllegalStateException("Dados da publicação inválidos", e);
        }
    }

    private static OffsetDateTime date(JsonNode value) {
        return value == null || value.isNull() ? null : OffsetDateTime.parse(value.asText());
    }
}

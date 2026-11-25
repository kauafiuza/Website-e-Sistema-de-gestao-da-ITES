package br.com.ites.server.services.User.Auth;

import br.com.ites.server.models.User.RefreshTokenEntity;
import br.com.ites.server.models.User.UserEntity;
import br.com.ites.server.models.User.UserSessionEntity;
import br.com.ites.server.repositories.User.RefreshTokenRepository;
import br.com.ites.server.repositories.User.UserSessionRepository;
import br.com.ites.server.utils.pagination.PageRequest;
import br.com.ites.server.utils.pagination.PageResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Controla sessões e rotação de refresh tokens, incluindo detecção de reutilização. */
@Service
public class SessionService {
    public record SessionView(
            UUID id,
            Instant createdAt,
            Instant lastSeenAt,
            Instant expiresAt,
            String userAgent,
            String ip,
            boolean current) {}

    public record Issued(UserSessionEntity session, String refreshToken) {}

    public record Peeked(UUID userId, UUID sessionId) {}

    private final UserSessionRepository sessions;
    private final RefreshTokenRepository tokens;
    private final Clock clock;
    private final Duration refreshTtl;
    private final Duration maxTtl;
    private final Duration reuseGrace;

    public SessionService(
            UserSessionRepository sessions,
            RefreshTokenRepository tokens,
            Clock clock,
            @Value("${auth.refresh-token-ttl}") Duration refreshTtl,
            @Value("${auth.session-max-ttl}") Duration maxTtl,
            @Value("${auth.refresh-reuse-grace}") Duration reuseGrace) {
        this.sessions = sessions;
        this.tokens = tokens;
        this.clock = clock;
        this.refreshTtl = refreshTtl;
        this.maxTtl = maxTtl;
        this.reuseGrace = reuseGrace;
    }

    @Transactional
    public Issued create(UserEntity user, ClientInfo client) {
        Instant now = clock.instant();
        UserSessionEntity session =
                sessions.insert(
                        new UserSessionEntity(
                                user,
                                now,
                                now.plus(refreshTtl),
                                now.plus(maxTtl),
                                client.agent(),
                                client.ip()));
        return new Issued(session, issue(user, session, now));
    }

    /** Persiste a revogação da sessão quando um refresh token rotacionado é reutilizado. */
    @Transactional(noRollbackFor = AuthProblem.class)
    public Issued rotate(String raw, ClientInfo client) {
        if (raw == null || raw.isBlank()) throw AuthProblem.unauthorized();
        Instant now = clock.instant();
        RefreshTokenEntity token =
                tokens.findByHashForUpdate(TokenTools.hash(raw))
                        .orElseThrow(AuthProblem::unauthorized);
        UserSessionEntity session = token.getSession();
        if (session == null
                || !session.isActive(now)
                || !token.getUser().isActive()
                || token.getUser().getEmailVerifiedAt() == null
                || token.getRevokedAt() != null
                || !now.isBefore(token.getExpiresAt())) throw AuthProblem.unauthorized();
        if (token.getRotatedAt() != null && !now.isBefore(token.getRotatedAt().plus(reuseGrace))) {
            session.revoke(now, "REUSE_DETECTED");
            sessions.save(session);
            throw AuthProblem.unauthorized();
        }
        if (token.getRotatedAt() == null) token.rotate(now);
        session.seen(now, refreshTtl, client.agent(), client.ip());
        sessions.save(session);
        tokens.save(token);
        return new Issued(session, issue(token.getUser(), session, now));
    }

    @Transactional(readOnly = true)
    public Optional<Peeked> peek(String raw) {
        if (raw == null || raw.isBlank()) return Optional.empty();
        Instant now = clock.instant();
        return tokens.findByTokenHash(TokenTools.hash(raw))
                .filter(
                        t ->
                                t.getSession() != null
                                        && t.getSession().isActive(now)
                                        && t.getUser().isActive()
                                        && t.getUser().getEmailVerifiedAt() != null
                                        && t.getRevokedAt() == null
                                        && now.isBefore(t.getExpiresAt())
                                        && (t.getRotatedAt() == null
                                                || now.isBefore(t.getRotatedAt().plus(reuseGrace))))
                .map(t -> new Peeked(t.getUser().getId(), t.getSession().getId()));
    }

    @Transactional(readOnly = true)
    public boolean isActive(UUID userId, UUID sessionId) {
        return sessions.findById(sessionId)
                .filter(
                        s ->
                                s.getUser().getId().equals(userId)
                                        && s.getUser().isActive()
                                        && s.getUser().getEmailVerifiedAt() != null
                                        && s.isActive(clock.instant()))
                .isPresent();
    }

    @Transactional(readOnly = true)
    public PageResponse<SessionView> list(UUID userId, UUID currentSessionId, int page, int size) {
        return sessions.findActive(userId, clock.instant(), PageRequest.of(page, size, 20))
                .map(
                        session ->
                                new SessionView(
                                        session.getId(),
                                        session.getCreatedAt(),
                                        session.getLastSeenAt(),
                                        session.getExpiresAt(),
                                        session.getUserAgent(),
                                        session.getIp(),
                                        session.getId().equals(currentSessionId)));
    }

    @Transactional
    public boolean revoke(UUID userId, UUID sessionId, String reason) {
        return sessions.findById(sessionId)
                .filter(s -> s.getUser().getId().equals(userId))
                .map(
                        s -> {
                            s.revoke(clock.instant(), reason);
                            sessions.save(s);
                            return true;
                        })
                .orElse(false);
    }

    @Transactional
    public void revokeByRefresh(String raw) {
        if (raw == null || raw.isBlank()) return;
        tokens.findByHashForUpdate(TokenTools.hash(raw))
                .ifPresent(
                        t -> {
                            if (t.getSession() != null) {
                                t.getSession().revoke(clock.instant(), "LOGOUT");
                                sessions.save(t.getSession());
                            }
                        });
    }

    @Transactional
    public void revokeOthers(UUID userId, UUID keep, String reason) {
        sessions.revokeOthers(userId, keep, clock.instant(), reason);
    }

    private String issue(UserEntity user, UserSessionEntity session, Instant now) {
        String raw = TokenTools.newToken();
        tokens.save(
                new RefreshTokenEntity(
                        user, session, TokenTools.hash(raw), now, session.getExpiresAt()));
        return raw;
    }
}

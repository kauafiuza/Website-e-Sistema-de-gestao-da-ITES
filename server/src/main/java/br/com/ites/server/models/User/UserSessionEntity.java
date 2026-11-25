package br.com.ites.server.models.User;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

public class UserSessionEntity {
    private UUID id;

    private UserEntity user;

    private Instant createdAt;

    private Instant lastSeenAt;

    private Instant expiresAt;

    private Instant absoluteExpiresAt;

    private Instant revokedAt;

    private String revokeReason;

    private String userAgent;

    private String ip;

    public UserSessionEntity(UUID id, UserEntity user, Instant createdAt, Instant lastSeenAt,
                             Instant expiresAt, Instant absoluteExpiresAt, Instant revokedAt,
                             String revokeReason, String userAgent, String ip) {
        this.id = id;
        this.user = user;
        this.createdAt = createdAt;
        this.lastSeenAt = lastSeenAt;
        this.expiresAt = expiresAt;
        this.absoluteExpiresAt = absoluteExpiresAt;
        this.revokedAt = revokedAt;
        this.revokeReason = revokeReason;
        this.userAgent = userAgent;
        this.ip = ip;
    }

    public UserSessionEntity(
            UserEntity user,
            Instant now,
            Instant expiresAt,
            Instant absoluteExpiresAt,
            String agent,
            String ip) {
        this.user = user;
        this.createdAt = now;
        this.lastSeenAt = now;
        this.expiresAt = expiresAt;
        this.absoluteExpiresAt = absoluteExpiresAt;
        this.userAgent = truncate(agent, 255);
        this.ip = truncate(ip, 45);
    }

    public UUID getId() {
        return id;
    }

    public UserEntity getUser() {
        return user;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastSeenAt() {
        return lastSeenAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getAbsoluteExpiresAt() { return absoluteExpiresAt; }
    public String getRevokeReason() { return revokeReason; }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public String getIp() {
        return ip;
    }

    public boolean isActive(Instant now) {
        return revokedAt == null && now.isBefore(expiresAt) && now.isBefore(absoluteExpiresAt);
    }

    public void seen(Instant now, Duration ttl, String agent, String ip) {
        lastSeenAt = now;
        Instant proposed = now.plus(ttl);
        expiresAt = proposed.isBefore(absoluteExpiresAt) ? proposed : absoluteExpiresAt;
        if (agent != null) userAgent = truncate(agent, 255);
        if (ip != null) this.ip = truncate(ip, 45);
    }

    public void revoke(Instant now, String reason) {
        revokedAt = now;
        revokeReason = reason;
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }
}

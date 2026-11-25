package br.com.ites.server.models.User;

import java.time.Instant;
import java.util.UUID;

public class EmailTokenEntity {
    public enum Purpose {
        SIGNUP,
        PASSWORD_RESET,
        EMAIL_CHANGE,
        LOGIN_2FA
    }

    private UUID id;

    private Purpose purpose;

    private String tokenHash;

    private String email;

    private UUID userId;

    private Instant createdAt;

    private Instant expiresAt;

    private Instant consumedAt;

    private String requestIp;

    private int attempts;

    public EmailTokenEntity(UUID id, Purpose purpose, String tokenHash, String email, UUID userId,
                            Instant createdAt, Instant expiresAt, Instant consumedAt,
                            String requestIp, int attempts) {
        this.id = id;
        this.purpose = purpose;
        this.tokenHash = tokenHash;
        this.email = email;
        this.userId = userId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.consumedAt = consumedAt;
        this.requestIp = requestIp;
        this.attempts = attempts;
    }

    public EmailTokenEntity(
            Purpose purpose,
            String hash,
            String email,
            UUID userId,
            Instant now,
            Instant expires,
            String ip) {
        this.purpose = purpose;
        this.tokenHash = hash;
        this.email = email;
        this.userId = userId;
        this.createdAt = now;
        this.expiresAt = expires;
        this.requestIp = ip == null ? null : ip.substring(0, Math.min(ip.length(), 45));
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public UUID getUserId() {
        return userId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getConsumedAt() {
        return consumedAt;
    }

    public int getAttempts() {
        return attempts;
    }

    public Purpose getPurpose() { return purpose; }
    public String getTokenHash() { return tokenHash; }
    public String getRequestIp() { return requestIp; }

    public void consume(Instant now) {
        consumedAt = now;
    }

    public void failedAttempt() {
        attempts++;
    }
}

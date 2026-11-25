package br.com.ites.server.models.User;

import java.time.Instant;
import java.util.UUID;

public class RefreshTokenEntity {
    private UUID id;

    private UserEntity user;

    private UserSessionEntity session;

    // Hash hexadecimal do token; o token bruto só existe na resposta da autenticação.
    private String tokenHash;

    private Instant expiresAt;

    private Instant revokedAt;

    private Instant createdAt;

    private Instant rotatedAt;

    public RefreshTokenEntity(UUID id, UserEntity user, UserSessionEntity session, String tokenHash,
                              Instant expiresAt, Instant revokedAt, Instant createdAt, Instant rotatedAt) {
        this.id = id;
        this.user = user;
        this.session = session;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.revokedAt = revokedAt;
        this.createdAt = createdAt;
        this.rotatedAt = rotatedAt;
    }

    public RefreshTokenEntity(
            UserEntity user,
            UserSessionEntity session,
            String tokenHash,
            Instant now,
            Instant expiresAt) {
        this.user = user;
        this.session = session;
        this.tokenHash = tokenHash;
        this.createdAt = now;
        this.expiresAt = expiresAt;
    }

    public UserEntity getUser() {
        return user;
    }

    public UserSessionEntity getSession() {
        return session;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public Instant getRotatedAt() {
        return rotatedAt;
    }

    public Instant getCreatedAt() { return createdAt; }

    public UUID getId() { return id; }
    public String getTokenHash() { return tokenHash; }

    public void revoke(Instant now) {
        revokedAt = now;
    }

    public void rotate(Instant now) {
        rotatedAt = now;
    }
}

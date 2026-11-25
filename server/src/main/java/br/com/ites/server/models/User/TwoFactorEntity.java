package br.com.ites.server.models.User;

import java.time.Instant;
import java.util.UUID;

public class TwoFactorEntity {
    private UUID userId;

    private String secretEnc;

    private Instant enabledAt;

    private Long lastStep;

    private Instant createdAt;

    public TwoFactorEntity(UUID userId, String secretEnc, Instant enabledAt, Long lastStep, Instant createdAt) {
        this.userId = userId;
        this.secretEnc = secretEnc;
        this.enabledAt = enabledAt;
        this.lastStep = lastStep;
        this.createdAt = createdAt;
    }

    public TwoFactorEntity(UUID userId, String secretEnc, Instant createdAt) {
        this(userId, secretEnc, null, null, createdAt);
    }

    public UUID getUserId() {
        return userId;
    }

    public String getSecretEnc() {
        return secretEnc;
    }

    public Instant getEnabledAt() {
        return enabledAt;
    }

    public Long getLastStep() {
        return lastStep;
    }

    public Instant getCreatedAt() { return createdAt; }

    public boolean isEnabled() {
        return enabledAt != null;
    }

    public void reset(String secret, Instant now) {
        secretEnc = secret;
        enabledAt = null;
        lastStep = null;
        createdAt = now;
    }

    public void enable(Instant now) {
        enabledAt = now;
    }

    public void advanceStep(long step) {
        lastStep = step;
    }
}

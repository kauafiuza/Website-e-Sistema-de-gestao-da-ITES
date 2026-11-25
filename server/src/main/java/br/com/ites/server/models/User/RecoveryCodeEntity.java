package br.com.ites.server.models.User;

import java.time.Instant;
import java.util.UUID;

public class RecoveryCodeEntity {
    private UUID id;

    private UUID userId;

    private String codeHash;

    private Instant usedAt;

    public RecoveryCodeEntity(UUID id, UUID userId, String codeHash, Instant usedAt) {
        this.id = id;
        this.userId = userId;
        this.codeHash = codeHash;
        this.usedAt = usedAt;
    }

    public RecoveryCodeEntity(UUID userId, String hash) {
        this.userId = userId;
        this.codeHash = hash;
    }

    public UUID getId() {
        return id;
    }

    public void use(Instant now) {
        usedAt = now;
    }

    public UUID getUserId() { return userId; }
    public String getCodeHash() { return codeHash; }
    public Instant getUsedAt() { return usedAt; }
}

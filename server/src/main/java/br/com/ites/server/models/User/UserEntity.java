package br.com.ites.server.models.User;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

public class UserEntity {
    private UUID id;
    private String firstName;
    private String lastName;
    private String email;
    private String passwordHash;
    private String companyName;
    private boolean active = true;
    private Instant emailVerifiedAt;
    private Instant passwordChangedAt;
    private Instant termsAcceptedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public UserEntity(String firstName, String lastName, String email, String passwordHash) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    public UserEntity(UUID id, String firstName, String lastName, String email, String passwordHash,
                      String companyName, boolean active, Instant emailVerifiedAt,
                      Instant passwordChangedAt, Instant termsAcceptedAt,
                      LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.passwordHash = passwordHash;
        this.companyName = companyName;
        this.active = active;
        this.emailVerifiedAt = emailVerifiedAt;
        this.passwordChangedAt = passwordChangedAt;
        this.termsAcceptedAt = termsAcceptedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() {
        return id;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public Instant getPasswordChangedAt() {
        return passwordChangedAt;
    }

    public Instant getTermsAcceptedAt() {
        return termsAcceptedAt;
    }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void verifyEmail(Instant now) {
        this.emailVerifiedAt = now;
    }

    public void acceptTerms(Instant now) {
        this.termsAcceptedAt = now;
    }

    public void changePassword(String encoded, Instant now) {
        this.passwordHash = encoded;
        this.passwordChangedAt = now;
    }

    public void changeEmail(String email, Instant now) {
        this.email = email;
        this.emailVerifiedAt = now;
    }

    public String getCompanyName() { return companyName; }

    public String getFullName() {
        return (firstName + " " + lastName).trim();
    }
}

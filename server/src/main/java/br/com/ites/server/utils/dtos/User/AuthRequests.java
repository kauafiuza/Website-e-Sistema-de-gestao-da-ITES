package br.com.ites.server.utils.dtos.User;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class AuthRequests {
    private AuthRequests() {}

    public record EmailAddress(@NotBlank @Email @Size(max = 254) String email) {}

    public record Token(@NotBlank @Size(max = 100) String token) {}

    public record SignupComplete(
            @NotBlank String token,
            @NotBlank @Size(max = 80) String firstName,
            @NotBlank @Size(max = 80) String lastName,
            @NotBlank String password,
            @AssertTrue boolean acceptTerms) {}

    public record Login(@NotBlank @Email String email, @NotBlank String password) {}

    public record LoginTwoFactor(@NotBlank String challenge, String code, String recoveryCode) {}

    public record Refresh(@NotBlank String refreshToken) {}

    public record ResetPassword(@NotBlank String token, @NotBlank String password) {}

    public record ChangePassword(
            @NotBlank String currentPassword, @NotBlank String newPassword, String code) {}

    public record ChangeEmail(
            @NotBlank @Email String newEmail, @NotBlank String currentPassword, String code) {}

    public record DeleteAccount(@NotBlank String password, String code) {}

    public record TwoFactorStart(@NotBlank String password) {}

    public record TwoFactorCode(@NotBlank String code) {}

    public record TwoFactorVerify(@NotBlank String password, @NotBlank String code) {}

    public record SwitchAccount(@NotNull UUID userId) {}
}

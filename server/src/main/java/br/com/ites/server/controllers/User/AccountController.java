package br.com.ites.server.controllers.User;

import br.com.ites.server.services.User.Auth.AccountService;
import br.com.ites.server.services.User.Auth.AuthProblem;
import br.com.ites.server.services.User.Auth.AuthService;
import br.com.ites.server.services.User.Auth.SessionService;
import br.com.ites.server.services.User.Auth.TwoFactorService;
import br.com.ites.server.utils.pagination.PageResponse;
import br.com.ites.server.utils.dtos.User.AuthRequests;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/auth/account")
@Tag(name = "Conta", description = "Sessões, senha, e-mail e autenticação em dois fatores.")
@SecurityRequirement(name = "bearerAuth")
public class AccountController {
    public record AccessResponse(String accessToken, long expiresIn, UUID userId) {}

    private final AccountService account;
    private final SessionService sessions;
    private final TwoFactorService twoFactor;
    private final BrowserSessions browser;
    private final Set<String> allowedOrigins;

    public AccountController(
            AccountService account,
            SessionService sessions,
            TwoFactorService twoFactor,
            BrowserSessions browser,
            @Value("${auth.browser.allowed-origins}") String origins) {
        this.account = account;
        this.sessions = sessions;
        this.twoFactor = twoFactor;
        this.browser = browser;
        this.allowedOrigins =
                Arrays.stream(origins.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toUnmodifiableSet());
    }

    @GetMapping("/sessions")
    public PageResponse<SessionService.SessionView> sessions(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        UUID current = UUID.fromString(jwt.getClaimAsString("sid"));
        return sessions.list(userId(jwt), current, page, size);
    }

    @DeleteMapping("/sessions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        if (!sessions.revoke(userId(jwt), id, "REVOKED_BY_USER"))
            throw new AuthProblem(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sessão não encontrada.");
    }

    @DeleteMapping(value = "/sessions", params = "scope=others")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeOthers(@AuthenticationPrincipal Jwt jwt) {
        sessions.revokeOthers(
                userId(jwt), UUID.fromString(jwt.getClaimAsString("sid")), "LOGOUT_OTHERS");
    }

    @PutMapping("/password")
    public AccessResponse changePassword(
            @RequestHeader(value = "Origin", required = false) String origin,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AuthRequests.ChangePassword request,
            HttpServletRequest http,
            HttpServletResponse response) {
        checkOrigin(origin);
        BrowserSessions.Slots slots = browser.read(http);
        try {
            AuthService.TokenPair pair =
                    account.changePassword(
                            userId(jwt),
                            request.currentPassword(),
                            request.newPassword(),
                            request.code(),
                            AuthHttp.client(http));
            slots.store(pair);
            UUID refreshedUserId = browser.readTokenUser(pair.refreshToken());
            return new AccessResponse(pair.accessToken(), pair.expiresIn(), refreshedUserId);
        } finally {
            slots.write(response);
        }
    }

    @PostMapping("/email")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void changeEmail(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AuthRequests.ChangeEmail request) {
        account.requestEmailChange(
                userId(jwt), request.newEmail(), request.currentPassword(), request.code());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @RequestHeader(value = "Origin", required = false) String origin,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AuthRequests.DeleteAccount request,
            HttpServletRequest http,
            HttpServletResponse response) {
        checkOrigin(origin);
        BrowserSessions.Slots slots = browser.read(http);
        try {
            account.deleteAccount(userId(jwt), request.password(), request.code());
            slots.logout();
        } finally {
            slots.write(response);
        }
    }

    @GetMapping("/2fa")
    public TwoFactorService.Status twoFactorStatus(@AuthenticationPrincipal Jwt jwt) {
        return twoFactor.status(userId(jwt));
    }

    @PostMapping("/2fa/start")
    public TwoFactorService.Setup startTwoFactor(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AuthRequests.TwoFactorStart request) {
        return twoFactor.start(userId(jwt), request.password());
    }

    @PostMapping("/2fa/confirm")
    public TwoFactorService.Recovery confirmTwoFactor(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AuthRequests.TwoFactorCode request) {
        return twoFactor.confirm(userId(jwt), request.code());
    }

    @PostMapping("/2fa/recovery-codes")
    public TwoFactorService.Recovery recoveryCodes(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AuthRequests.TwoFactorVerify request) {
        return twoFactor.regenerate(userId(jwt), request.password(), request.code());
    }

    @DeleteMapping("/2fa")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disableTwoFactor(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AuthRequests.TwoFactorVerify request) {
        twoFactor.disable(userId(jwt), request.password(), request.code());
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    private void checkOrigin(String origin) {
        if (origin == null || !allowedOrigins.contains(origin))
            throw new AuthProblem(
                    HttpStatus.FORBIDDEN, "ORIGIN_FORBIDDEN", "Origem não permitida.");
    }
}

package br.com.ites.server.controllers.User;

import br.com.ites.server.services.User.Auth.AccountService;
import br.com.ites.server.services.User.Auth.AuthProblem;
import br.com.ites.server.services.User.Auth.AuthService;
import br.com.ites.server.services.User.Auth.PasswordResetService;
import br.com.ites.server.services.User.Auth.SignupService;
import br.com.ites.server.utils.dtos.User.AuthRequests;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/auth/browser")
@Tag(name = "Autenticação do navegador", description = "Fluxos de sessão web com cookies HttpOnly e checagem de origem.")
public class BrowserAuthController {
    public record AccessResponse(String accessToken, long expiresIn, UUID userId) {}

    public record LogoutResponse(boolean nextAccount) {}

    private final AuthService auth;
    private final SignupService signup;
    private final PasswordResetService reset;
    private final AccountService account;
    private final BrowserSessions browser;
    private final Set<String> allowedOrigins;

    public BrowserAuthController(
            AuthService auth,
            SignupService signup,
            PasswordResetService reset,
            AccountService account,
            BrowserSessions browser,
            @Value("${auth.browser.allowed-origins}") String origins) {
        this.auth = auth;
        this.signup = signup;
        this.reset = reset;
        this.account = account;
        this.browser = browser;
        this.allowedOrigins =
                Arrays.stream(origins.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toUnmodifiableSet());
    }

    @PostMapping("/register")
    public void oldRegister() {
        throw new AuthProblem(
                HttpStatus.GONE, "SIGNUP_MOVED", "Use o cadastro com confirmação por e-mail.");
    }

    @PostMapping("/signup/start")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public SignupService.LinkSent signupStart(
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody AuthRequests.EmailAddress request,
            HttpServletRequest http) {
        checkOrigin(origin);
        return signup.start(request.email(), AuthHttp.client(http), false);
    }

    @PostMapping("/signup/resend")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public SignupService.LinkSent signupResend(
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody AuthRequests.EmailAddress request,
            HttpServletRequest http) {
        checkOrigin(origin);
        return signup.start(request.email(), AuthHttp.client(http), true);
    }

    @PostMapping("/signup/verify")
    public java.util.Map<String, String> signupVerify(
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody AuthRequests.Token request,
            HttpServletRequest http) {
        checkOrigin(origin);
        return java.util.Map.of("email", signup.verify(request.token(), AuthHttp.client(http)));
    }

    @PostMapping("/signup/complete")
    @ResponseStatus(HttpStatus.CREATED)
    public AccessResponse signupComplete(
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody AuthRequests.SignupComplete request,
            HttpServletRequest http,
            HttpServletResponse response) {
        checkOrigin(origin);
        BrowserSessions.Slots slots = browser.read(http);
        try {
            AuthService.TokenPair pair =
                    signup.complete(
                            request.token(),
                            request.firstName(),
                            request.lastName(),
                            request.password(),
                            request.acceptTerms(),
                            AuthHttp.client(http),
                            slots::ensureRoom);
            slots.store(pair);
            return access(pair);
        } finally {
            slots.write(response);
        }
    }

    @PostMapping("/login")
    public Object login(
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody AuthRequests.Login request,
            HttpServletRequest http,
            HttpServletResponse response) {
        checkOrigin(origin);
        BrowserSessions.Slots slots = browser.read(http);
        try {
            return grant(
                    auth.login(
                            request.email(),
                            request.password(),
                            AuthHttp.client(http),
                            slots::ensureRoom),
                    slots);
        } finally {
            slots.write(response);
        }
    }

    @PostMapping("/login/2fa")
    public AccessResponse loginTwoFactor(
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody AuthRequests.LoginTwoFactor request,
            HttpServletRequest http,
            HttpServletResponse response) {
        checkOrigin(origin);
        BrowserSessions.Slots slots = browser.read(http);
        try {
            AuthService.TokenPair pair =
                    auth.loginTwoFactor(
                            request.challenge(),
                            request.code(),
                            request.recoveryCode(),
                            AuthHttp.client(http),
                            slots::ensureRoom);
            slots.store(pair);
            return access(pair);
        } finally {
            slots.write(response);
        }
    }

    @PostMapping("/password/forgot")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void forgot(
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody AuthRequests.EmailAddress request,
            HttpServletRequest http) {
        checkOrigin(origin);
        reset.forgot(request.email(), AuthHttp.client(http));
    }

    @PostMapping("/password/reset")
    public Object reset(
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody AuthRequests.ResetPassword request,
            HttpServletRequest http,
            HttpServletResponse response) {
        checkOrigin(origin);
        BrowserSessions.Slots slots = browser.read(http);
        try {
            return grant(
                    reset.reset(
                            request.token(),
                            request.password(),
                            AuthHttp.client(http),
                            slots::ensureRoom),
                    slots);
        } finally {
            slots.write(response);
        }
    }

    @PostMapping("/refresh")
    public AccessResponse refresh(
            @RequestHeader(value = "Origin", required = false) String origin,
            HttpServletRequest http,
            HttpServletResponse response) {
        checkOrigin(origin);
        BrowserSessions.Slots slots = browser.read(http);
        try {
            return access(slots.refresh(AuthHttp.client(http)));
        } finally {
            slots.write(response);
        }
    }

    @GetMapping("/accounts")
    public java.util.List<BrowserSessions.Account> accounts(
            @RequestHeader(value = "X-Requested-With", required = false) String requested,
            HttpServletRequest http,
            HttpServletResponse response) {
        checkRequested(requested);
        BrowserSessions.Slots slots = browser.read(http);
        try {
            return slots.accounts();
        } finally {
            slots.write(response);
        }
    }

    @PostMapping("/switch")
    public AccessResponse switchAccount(
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody AuthRequests.SwitchAccount request,
            HttpServletRequest http,
            HttpServletResponse response) {
        checkOrigin(origin);
        BrowserSessions.Slots slots = browser.read(http);
        try {
            return access(slots.switchTo(request.userId(), AuthHttp.client(http)));
        } finally {
            slots.write(response);
        }
    }

    @PostMapping("/logout")
    public LogoutResponse logout(
            @RequestHeader(value = "Origin", required = false) String origin,
            HttpServletRequest http,
            HttpServletResponse response) {
        checkOrigin(origin);
        BrowserSessions.Slots slots = browser.read(http);
        try {
            return new LogoutResponse(slots.logout());
        } finally {
            slots.write(response);
        }
    }

    @PostMapping("/logout/all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logoutAll(
            @RequestHeader(value = "Origin", required = false) String origin,
            HttpServletRequest http,
            HttpServletResponse response) {
        checkOrigin(origin);
        BrowserSessions.Slots slots = browser.read(http);
        try {
            slots.logoutAll();
        } finally {
            slots.write(response);
        }
    }

    private Object grant(AuthService.LoginResult result, BrowserSessions.Slots slots) {
        if (result instanceof AuthService.TokenPair pair) {
            slots.store(pair);
            return access(pair);
        }
        return result;
    }

    private AccessResponse access(AuthService.TokenPair pair) {
        UUID userId = browser.readTokenUser(pair.refreshToken());
        return new AccessResponse(pair.accessToken(), pair.expiresIn(), userId);
    }

    private void checkOrigin(String origin) {
        if (origin == null || !allowedOrigins.contains(origin))
            throw new AuthProblem(
                    HttpStatus.FORBIDDEN, "ORIGIN_FORBIDDEN", "Origem não permitida.");
    }

    private void checkRequested(String value) {
        if (value == null)
            throw new AuthProblem(
                    HttpStatus.FORBIDDEN, "CSRF_HEADER_REQUIRED", "Cabeçalho obrigatório ausente.");
    }
}

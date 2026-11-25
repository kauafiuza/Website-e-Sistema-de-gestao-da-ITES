package br.com.ites.server.controllers.User;

import br.com.ites.server.services.User.Auth.AccountService;
import br.com.ites.server.services.User.Auth.AuthProblem;
import br.com.ites.server.services.User.Auth.AuthService;
import br.com.ites.server.services.User.Auth.PasswordResetService;
import br.com.ites.server.services.User.Auth.SignupService;
import br.com.ites.server.utils.dtos.User.AuthRequests;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@Tag(name = "Autenticação por token", description = "Cadastro, login, recuperação de conta e perfil.")
public class AuthController {
    private final AuthService auth;
    private final SignupService signup;
    private final PasswordResetService reset;
    private final AccountService account;

    public AuthController(
            AuthService auth,
            SignupService signup,
            PasswordResetService reset,
            AccountService account) {
        this.auth = auth;
        this.signup = signup;
        this.reset = reset;
        this.account = account;
    }

    @PostMapping("/register")
    public void oldRegister() {
        throw new AuthProblem(
                HttpStatus.GONE, "SIGNUP_MOVED", "Use o cadastro com confirmação por e-mail.");
    }

    @PostMapping("/signup/start")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public SignupService.LinkSent signupStart(
            @Valid @RequestBody AuthRequests.EmailAddress request, HttpServletRequest http) {
        return signup.start(request.email(), AuthHttp.client(http), false);
    }

    @PostMapping("/signup/resend")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public SignupService.LinkSent signupResend(
            @Valid @RequestBody AuthRequests.EmailAddress request, HttpServletRequest http) {
        return signup.start(request.email(), AuthHttp.client(http), true);
    }

    @PostMapping("/signup/verify")
    public Map<String, String> signupVerify(
            @Valid @RequestBody AuthRequests.Token request, HttpServletRequest http) {
        return Map.of("email", signup.verify(request.token(), AuthHttp.client(http)));
    }

    @PostMapping("/signup/complete")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthService.TokenPair signupComplete(
            @Valid @RequestBody AuthRequests.SignupComplete request, HttpServletRequest http) {
        return signup.complete(
                request.token(),
                request.firstName(),
                request.lastName(),
                request.password(),
                request.acceptTerms(),
                AuthHttp.client(http));
    }

    @PostMapping("/login")
    public AuthService.LoginResult login(
            @Valid @RequestBody AuthRequests.Login request, HttpServletRequest http) {
        return auth.login(request.email(), request.password(), AuthHttp.client(http));
    }

    @PostMapping("/login/2fa")
    public AuthService.TokenPair loginTwoFactor(
            @Valid @RequestBody AuthRequests.LoginTwoFactor request, HttpServletRequest http) {
        return auth.loginTwoFactor(
                request.challenge(), request.code(), request.recoveryCode(), AuthHttp.client(http));
    }

    @PostMapping("/refresh")
    public AuthService.TokenPair refresh(
            @Valid @RequestBody AuthRequests.Refresh request, HttpServletRequest http) {
        return auth.refresh(request.refreshToken(), AuthHttp.client(http));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody AuthRequests.Refresh request) {
        auth.logout(request.refreshToken());
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    public AccountService.Profile me(@AuthenticationPrincipal Jwt jwt) {
        return account.profile(UUID.fromString(jwt.getSubject()));
    }

    @PostMapping("/password/forgot")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void forgot(
            @Valid @RequestBody AuthRequests.EmailAddress request, HttpServletRequest http) {
        reset.forgot(request.email(), AuthHttp.client(http));
    }

    @PostMapping("/password/reset/verify")
    public Map<String, String> verifyReset(
            @Valid @RequestBody AuthRequests.Token request, HttpServletRequest http) {
        return Map.of("email", reset.verify(request.token(), AuthHttp.client(http)));
    }

    @PostMapping("/password/reset")
    public AuthService.LoginResult reset(
            @Valid @RequestBody AuthRequests.ResetPassword request, HttpServletRequest http) {
        return reset.reset(request.token(), request.password(), AuthHttp.client(http));
    }

    @PostMapping("/email/confirm")
    public Map<String, String> confirmEmail(@Valid @RequestBody AuthRequests.Token request) {
        return Map.of("email", account.confirmEmailChange(request.token()));
    }
}

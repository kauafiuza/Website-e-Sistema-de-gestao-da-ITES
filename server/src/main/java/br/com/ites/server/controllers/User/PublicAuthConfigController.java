package br.com.ites.server.controllers.User;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Expõe apenas as opções públicas de criação de conta, sem revelar configurações secretas. */
@RestController
@RequestMapping("/public/auth")
public class PublicAuthConfigController {
    private final boolean emailSignupEnabled;

    public PublicAuthConfigController(@Value("${mailer.enabled:false}") boolean emailSignupEnabled) {
        this.emailSignupEnabled = emailSignupEnabled;
    }

    @GetMapping("/config")
    public Map<String, Boolean> config() {
        return Map.of("emailSignupEnabled", emailSignupEnabled);
    }
}

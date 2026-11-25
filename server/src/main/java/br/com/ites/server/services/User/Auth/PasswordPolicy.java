package br.com.ites.server.services.User.Auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Component
public class PasswordPolicy {
    public void validate(String password, String email, String firstName, String lastName) {
        if (password == null
                || password.codePointCount(0, password.length()) < 8
                || password.getBytes(StandardCharsets.UTF_8).length > 72
                || password.chars().distinct().count() == 1
                || contains(password, email.split("@", 2)[0])
                || contains(password, firstName)
                || contains(password, lastName))
            throw new AuthProblem(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "PASSWORD_POLICY",
                    "A senha não atende aos requisitos.");
    }

    private static boolean contains(String password, String part) {
        return part != null
                && part.length() >= 3
                && password.toLowerCase(Locale.ROOT).contains(part.toLowerCase(Locale.ROOT));
    }
}

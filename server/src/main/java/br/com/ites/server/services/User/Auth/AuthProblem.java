package br.com.ites.server.services.User.Auth;

import org.springframework.http.HttpStatus;

public class AuthProblem extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public AuthProblem(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }

    public static AuthProblem invalidToken() {
        return new AuthProblem(
                HttpStatus.BAD_REQUEST, "TOKEN_INVALID", "Link inválido ou já utilizado.");
    }

    public static AuthProblem expiredToken() {
        return new AuthProblem(HttpStatus.GONE, "TOKEN_EXPIRED", "O link expirou.");
    }

    public static AuthProblem unauthorized() {
        return new AuthProblem(
                HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Credenciais ou sessão inválidas.");
    }

    public static AuthProblem wrongPassword() {
        return new AuthProblem(
                HttpStatus.UNPROCESSABLE_ENTITY, "WRONG_PASSWORD", "Senha atual incorreta.");
    }
}

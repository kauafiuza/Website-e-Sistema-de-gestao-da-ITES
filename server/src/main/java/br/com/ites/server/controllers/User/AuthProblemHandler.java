package br.com.ites.server.controllers.User;

import br.com.ites.server.services.User.Auth.AuthProblem;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class AuthProblemHandler {
    @ExceptionHandler(AuthProblem.class)
    ResponseEntity<Map<String, Object>> handle(AuthProblem problem) {
        return ResponseEntity.status(problem.status())
                .body(
                        Map.of(
                                "status",
                                problem.status().value(),
                                "code",
                                problem.code(),
                                "message",
                                problem.getMessage()));
    }
}

package br.com.ites.server.utils.pagination;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Validates bounded offset pagination for collection endpoints. */
public record PageRequest(int page, int size) {
    private static final long MAX_OFFSET = 1_000_000L;

    public static PageRequest of(int page, int size, int maxSize) {
        if (page < 0 || size < 1 || size > maxSize || (long) page * size > MAX_OFFSET) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parâmetros de paginação inválidos");
        }
        return new PageRequest(page, size);
    }

    public int offset() {
        return Math.toIntExact((long) page * size);
    }
}

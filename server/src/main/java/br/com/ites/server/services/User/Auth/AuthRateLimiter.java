package br.com.ites.server.services.User.Auth;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Component
public class AuthRateLimiter {
    private record Window(Instant start, int count) {}

    private final Cache<String, Window> windows =
            Caffeine.newBuilder()
                    .expireAfterWrite(Duration.ofHours(1))
                    .maximumSize(100_000)
                    .build();
    private final Clock clock;

    public AuthRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public void check(String rule, String key, int limit, Duration duration) {
        String id = rule + ":" + key.trim().toLowerCase(Locale.ROOT);
        Instant now = clock.instant();
        Window window =
                windows.asMap()
                        .compute(
                                id,
                                (k, old) ->
                                        old == null || !now.isBefore(old.start().plus(duration))
                                                ? new Window(now, 1)
                                                : new Window(old.start(), old.count() + 1));
        if (window.count() > limit)
            throw new AuthProblem(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "RATE_LIMITED",
                    "Muitas tentativas. Tente novamente mais tarde.");
    }

    public void clear(String rule, String key) {
        windows.invalidate(rule + ":" + key.trim().toLowerCase(Locale.ROOT));
    }
}

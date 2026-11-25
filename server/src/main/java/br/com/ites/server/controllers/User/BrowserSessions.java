package br.com.ites.server.controllers.User;

import br.com.ites.server.services.User.Auth.AccountService;
import br.com.ites.server.services.User.Auth.AuthProblem;
import br.com.ites.server.services.User.Auth.AuthService;
import br.com.ites.server.services.User.Auth.ClientInfo;
import br.com.ites.server.services.User.Auth.SessionService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Component
public class BrowserSessions {
    public record Account(
            UUID userId, String firstName, String lastName, String email, boolean active) {}

    private static final String PREFIX = "vh_refresh_";
    private static final String ACTIVE = "vh_account";
    private static final String LEGACY = "vh_refresh";
    private static final String PATH = "/";
    private static final Pattern SLOT = Pattern.compile("[a-z2-7]{8}");
    private static final char[] ALPHABET = "abcdefghijklmnopqrstuvwxyz234567".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();
    private final SessionService sessions;
    private final AccountService accounts;
    private final AuthService auth;
    private final boolean secure;
    private final Duration ttl;

    public BrowserSessions(
            SessionService sessions,
            AccountService accounts,
            AuthService auth,
            @Value("${auth.browser.secure-cookie}") boolean secure,
            @Value("${auth.refresh-token-ttl}") Duration ttl) {
        this.sessions = sessions;
        this.accounts = accounts;
        this.auth = auth;
        this.secure = secure;
        this.ttl = ttl;
    }

    public Slots read(HttpServletRequest request) {
        return new Slots(request);
    }

    public UUID readTokenUser(String refreshToken) {
        return sessions.peek(refreshToken).orElseThrow(AuthProblem::unauthorized).userId();
    }

    public final class Slots {
        private final Map<String, String> tokens = new LinkedHashMap<>();
        private final Map<String, ResponseCookie> outgoing = new LinkedHashMap<>();
        private String active;
        private Map<String, SessionService.Peeked> valid;

        Slots(HttpServletRequest request) {
            String legacy = null;
            if (request.getCookies() != null)
                for (Cookie cookie : request.getCookies()) {
                    if (cookie.getName().equals(ACTIVE)
                            && SLOT.matcher(cookie.getValue()).matches())
                        active = cookie.getValue();
                    else if (cookie.getName().equals(LEGACY)) legacy = cookie.getValue();
                    else if (cookie.getName().startsWith(PREFIX) && tokens.size() < 10) {
                        String slot = cookie.getName().substring(PREFIX.length());
                        if (SLOT.matcher(slot).matches())
                            tokens.putIfAbsent(slot, cookie.getValue());
                    }
                }
            if (legacy != null && !legacy.isBlank()) {
                String slot = newSlot();
                tokens.put(slot, legacy);
                outgoing.put(LEGACY, cookie(LEGACY, "", Duration.ZERO));
                outgoing.put(PREFIX + slot, cookie(PREFIX + slot, legacy, ttl));
                if (active == null) setActive(slot);
            }
        }

        public void ensureRoom(UUID userId) {
            if (userId != null
                    && valid().values().stream().anyMatch(v -> v.userId().equals(userId))) return;
            if (valid().size() >= 5)
                throw new AuthProblem(
                        HttpStatus.CONFLICT,
                        "ACCOUNT_LIMIT",
                        "Limite de cinco contas conectadas neste navegador.");
        }

        public List<Account> accounts() {
            String current = activeSlot();
            List<Account> connected = new ArrayList<>();
            for (Map.Entry<String, SessionService.Peeked> entry : valid().entrySet()) {
                accounts.findProfile(entry.getValue().userId())
                        .ifPresent(
                                profile ->
                                        connected.add(
                                                account(profile, entry.getKey().equals(current))));
            }
            connected.sort(Comparator.comparing(Account::active).reversed());
            return connected;
        }

        public void store(AuthService.TokenPair pair) {
            SessionService.Peeked peeked =
                    sessions.peek(pair.refreshToken()).orElseThrow(AuthProblem::unauthorized);
            String existing =
                    valid().entrySet().stream()
                            .filter(e -> e.getValue().userId().equals(peeked.userId()))
                            .map(Map.Entry::getKey)
                            .findFirst()
                            .orElse(null);
            ensureRoom(peeked.userId());
            String slot = existing == null ? newSlot() : existing;
            if (existing != null)
                sessions.revoke(peeked.userId(), valid.get(existing).sessionId(), "REPLACED");
            tokens.put(slot, pair.refreshToken());
            valid = null;
            outgoing.put(PREFIX + slot, cookie(PREFIX + slot, pair.refreshToken(), ttl));
            setActive(slot);
        }

        public AuthService.TokenPair refresh(ClientInfo client) {
            for (String slot : order()) {
                try {
                    AuthService.TokenPair pair = auth.refresh(tokens.get(slot), client);
                    tokens.put(slot, pair.refreshToken());
                    valid = null;
                    outgoing.put(PREFIX + slot, cookie(PREFIX + slot, pair.refreshToken(), ttl));
                    setActive(slot);
                    return pair;
                } catch (AuthProblem e) {
                    drop(slot);
                }
            }
            throw AuthProblem.unauthorized();
        }

        public AuthService.TokenPair switchTo(UUID userId, ClientInfo client) {
            String slot =
                    valid().entrySet().stream()
                            .filter(e -> e.getValue().userId().equals(userId))
                            .map(Map.Entry::getKey)
                            .findFirst()
                            .orElseThrow(
                                    () ->
                                            new AuthProblem(
                                                    HttpStatus.NOT_FOUND,
                                                    "ACCOUNT_NOT_CONNECTED",
                                                    "Conta não conectada."));
            AuthService.TokenPair pair = auth.refresh(tokens.get(slot), client);
            tokens.put(slot, pair.refreshToken());
            valid = null;
            outgoing.put(PREFIX + slot, cookie(PREFIX + slot, pair.refreshToken(), ttl));
            setActive(slot);
            return pair;
        }

        public boolean logout() {
            String slot = activeSlot();
            if (slot != null) {
                sessions.revokeByRefresh(tokens.get(slot));
                drop(slot);
            }
            return activeSlot() != null;
        }

        public void logoutAll() {
            for (String slot : new ArrayList<>(tokens.keySet())) {
                sessions.revokeByRefresh(tokens.get(slot));
                drop(slot);
            }
        }

        public void write(HttpServletResponse response) {
            outgoing.values()
                    .forEach(c -> response.addHeader(HttpHeaders.SET_COOKIE, c.toString()));
        }

        private Map<String, SessionService.Peeked> valid() {
            if (valid == null) {
                valid = new LinkedHashMap<>();
                Set<UUID> seen = new java.util.HashSet<>();
                for (String slot : new ArrayList<>(tokens.keySet())) {
                    Optional<SessionService.Peeked> peeked = sessions.peek(tokens.get(slot));
                    if (peeked.isEmpty() || !seen.add(peeked.get().userId())) drop(slot);
                    else valid.put(slot, peeked.get());
                }
            }
            return valid;
        }

        private String activeSlot() {
            if (active != null && valid().containsKey(active)) return active;
            String first = valid().keySet().stream().findFirst().orElse(null);
            if (first == null) outgoing.put(ACTIVE, cookie(ACTIVE, "", Duration.ZERO));
            else setActive(first);
            return first;
        }

        private List<String> order() {
            List<String> result = new ArrayList<>();
            String current = activeSlot();
            if (current != null) result.add(current);
            tokens.keySet().stream().filter(s -> !s.equals(current)).forEach(result::add);
            return result;
        }

        private void drop(String slot) {
            tokens.remove(slot);
            outgoing.put(PREFIX + slot, cookie(PREFIX + slot, "", Duration.ZERO));
            if (slot.equals(active)) active = null;
        }

        private void setActive(String slot) {
            active = slot;
            outgoing.put(ACTIVE, cookie(ACTIVE, slot, ttl));
        }
    }

    private ResponseCookie cookie(String name, String value, Duration age) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path(PATH)
                .maxAge(age)
                .build();
    }

    private static String newSlot() {
        StringBuilder out = new StringBuilder(8);
        for (int i = 0; i < 8; i++) out.append(ALPHABET[RANDOM.nextInt(ALPHABET.length)]);
        return out.toString();
    }

    private static Account account(AccountService.Profile user, boolean active) {
        return new Account(user.id(), user.firstName(), user.lastName(), user.email(), active);
    }
}

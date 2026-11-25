package br.com.ites.server;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.UUID;

@Import({TestcontainersConfiguration.class, RecordingMailGateway.class})
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(
        properties = {
            "auth.jwt.secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
            "auth.totp-encryption-key=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
            "auth.refresh-reuse-grace=PT0S"
        })
class AuthFlowTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RecordingMailGateway.Inbox inbox;
    @Autowired org.springframework.security.oauth2.jwt.JwtDecoder decoder;
    @Autowired javax.crypto.SecretKey key;
    @Autowired br.com.ites.server.services.User.Auth.SessionService sessions;

    @Test
    void signupRequiresMailAndSingleUseToken() throws Exception {
        String email = email();
        String token = start(email);
        mvc.perform(
                        post("/auth/signup/verify")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(Map.of("token", token))))
                .andExpect(status().isOk());
        mvc.perform(
                        post("/auth/signup/complete")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(complete(token, "weak", true)))
                .andExpect(status().isUnprocessableEntity());
        JsonNode created = signupComplete(token);
        var raw =
                org.springframework.security.oauth2.jwt.NimbusJwtDecoder.withSecretKey(key)
                        .build()
                        .decode(created.get("accessToken").asText());
        assertEquals("access", raw.getClaimAsString("token_use"));
        assertTrue(raw.getAudience().contains("ites-portal"), raw.getAudience().toString());
        assertEquals(
                br.com.ites.server.services.User.Auth.AuthService.ISSUER,
                raw.getIssuer().toString());
        assertTrue(
                sessions.isActive(
                        UUID.fromString(raw.getSubject()),
                        UUID.fromString(raw.getClaimAsString("sid"))));
        try {
            decoder.decode(created.get("accessToken").asText());
        } catch (org.springframework.security.oauth2.jwt.JwtValidationException e) {
            throw new AssertionError(e.getErrors().toString(), e);
        }
        JsonNode profile =
                body(
                        mvc.perform(get("/auth/me").header("Authorization", bearer(created)))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        assertEquals(email, profile.get("email").asText());
        assertEquals("Ada", profile.get("firstName").asText());
        assertEquals("Lovelace", profile.get("lastName").asText());
        assertEquals(raw.getSubject(), profile.get("id").asText());
        mvc.perform(
                        post("/auth/signup/complete")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(complete(token, "StrongPass1!", true)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void refreshReplayRevokesSessionAndAccessToken() throws Exception {
        String email = email();
        signupComplete(start(email));
        JsonNode login =
                body(
                        mvc.perform(
                                        post("/auth/login")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        json.writeValueAsString(
                                                                Map.of(
                                                                        "email",
                                                                        email,
                                                                        "password",
                                                                        "StrongPass1!"))))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        String old = login.get("refreshToken").asText();
        JsonNode rotated =
                body(
                        mvc.perform(
                                        post("/auth/refresh")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        json.writeValueAsString(
                                                                Map.of("refreshToken", old))))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        mvc.perform(
                        post("/auth/refresh")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(Map.of("refreshToken", old))))
                .andExpect(status().isUnauthorized());
        mvc.perform(
                        post("/auth/refresh")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "refreshToken",
                                                        rotated.get("refreshToken").asText()))))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/auth/me").header("Authorization", bearer(rotated)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void passwordResetRevokesOldSession() throws Exception {
        String email = email();
        JsonNode first = signupComplete(start(email));
        mvc.perform(
                        post("/auth/password/forgot")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isAccepted());
        String token = inbox.token(email, "Redefina sua senha");
        JsonNode next =
                body(
                        mvc.perform(
                                        post("/auth/password/reset")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        json.writeValueAsString(
                                                                Map.of(
                                                                        "token",
                                                                        token,
                                                                        "password",
                                                                        "FreshPassword2!"))))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        mvc.perform(get("/auth/me").header("Authorization", bearer(first)))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/auth/me").header("Authorization", bearer(next)))
                .andExpect(status().isOk());
    }

    @Test
    void twoFactorChallengesLoginAndRecoveryCodeIsSingleUse() throws Exception {
        String email = email();
        JsonNode first = signupComplete(start(email));
        JsonNode setup =
                body(
                        mvc.perform(
                                        post("/auth/account/2fa/start")
                                                .header("Authorization", bearer(first))
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        json.writeValueAsString(
                                                                Map.of(
                                                                        "password",
                                                                        "StrongPass1!"))))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        String code =
                br.com.ites.server.services.User.Auth.TotpSupport.code(
                        base32(setup.get("secret").asText()),
                        java.time.Instant.now().getEpochSecond() / 30);
        JsonNode recovery =
                body(
                        mvc.perform(
                                        post("/auth/account/2fa/confirm")
                                                .header("Authorization", bearer(first))
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        json.writeValueAsString(
                                                                Map.of("code", code))))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        String recoveryCode = recovery.get("codes").get(0).asText();
        JsonNode challenge =
                body(
                        mvc.perform(
                                        post("/auth/login")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        json.writeValueAsString(
                                                                Map.of(
                                                                        "email",
                                                                        email,
                                                                        "password",
                                                                        "StrongPass1!"))))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        assertTrue(challenge.get("twoFactorRequired").asBoolean());
        JsonNode authenticated =
                body(
                        mvc.perform(
                                        post("/auth/login/2fa")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        json.writeValueAsString(
                                                                Map.of(
                                                                        "challenge",
                                                                        challenge
                                                                                .get("challenge")
                                                                                .asText(),
                                                                        "recoveryCode",
                                                                        recoveryCode))))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        mvc.perform(get("/auth/me").header("Authorization", bearer(authenticated)))
                .andExpect(status().isOk());
        mvc.perform(
                        post("/auth/login/2fa")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "challenge",
                                                        challenge.get("challenge").asText(),
                                                        "recoveryCode",
                                                        recoveryCode))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void emailChangeAndAccountDeletionInvalidateAccess() throws Exception {
        String email = email();
        JsonNode first = signupComplete(start(email));
        String nextEmail = email();
        mvc.perform(
                        post("/auth/account/email")
                                .header("Authorization", bearer(first))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "newEmail",
                                                        nextEmail,
                                                        "currentPassword",
                                                        "StrongPass1!"))))
                .andExpect(status().isAccepted());
        String token = inbox.token(nextEmail, "Confirme seu novo e-mail");
        mvc.perform(
                        post("/auth/email/confirm")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(Map.of("token", token))))
                .andExpect(status().isOk());
        mvc.perform(get("/auth/me").header("Authorization", bearer(first)))
                .andExpect(status().isUnauthorized());
        JsonNode next =
                body(
                        mvc.perform(
                                        post("/auth/login")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        json.writeValueAsString(
                                                                Map.of(
                                                                        "email",
                                                                        nextEmail,
                                                                        "password",
                                                                        "StrongPass1!"))))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        mvc.perform(
                        delete("/auth/account")
                                .header("Origin", "http://localhost:5173")
                                .header("Authorization", bearer(next))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of("password", "StrongPass1!"))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/auth/me").header("Authorization", bearer(next)))
                .andExpect(status().isUnauthorized());
        mvc.perform(
                        post("/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "email",
                                                        nextEmail,
                                                        "password",
                                                        "StrongPass1!"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void browserRefreshUsesHttpOnlyCookieAndChecksOrigin() throws Exception {
        String token = start(email());
        mvc.perform(
                        post("/auth/browser/signup/complete")
                                .header("Origin", "https://evil.example")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(complete(token, "StrongPass1!", true)))
                .andExpect(status().isForbidden());
        var response =
                mvc.perform(
                                post("/auth/browser/signup/complete")
                                        .header("Origin", "http://localhost:5173")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(complete(token, "StrongPass1!", true)))
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse();
        assertTrue(response.getHeader("Set-Cookie").contains("HttpOnly"));
        assertTrue(response.getHeader("Set-Cookie").contains("SameSite=Strict"));
        Cookie cookie = cookie(response);
        JsonNode accounts =
                body(
                        mvc.perform(
                                        get("/auth/browser/accounts")
                                                .header("X-Requested-With", "XMLHttpRequest")
                                                .cookie(cookie))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString());
        assertEquals(1, accounts.size());
        assertEquals("Ada", accounts.get(0).get("firstName").asText());
        var refreshed =
                mvc.perform(
                                post("/auth/browser/refresh")
                                        .header("Origin", "http://localhost:5173")
                                        .cookie(cookie))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse();
        Cookie next = cookie(refreshed);
        assertNotEquals(cookie.getValue(), next.getValue());
        mvc.perform(
                        post("/auth/browser/logout")
                                .header("Origin", "http://localhost:5173")
                                .cookie(next))
                .andExpect(status().isOk());
        mvc.perform(
                        post("/auth/browser/refresh")
                                .header("Origin", "http://localhost:5173")
                                .cookie(next))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void browserSignupAndAccountManagementUseCanonicalRoutes() throws Exception {
        String email = email();
        mvc.perform(
                        post("/auth/browser/signup/start")
                                .header("Origin", "http://localhost:5173")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isAccepted());
        String token = inbox.token(email, "Confirme seu e-mail");
        var signup =
                mvc.perform(
                                post("/auth/browser/signup/complete")
                                        .header("Origin", "http://localhost:5173")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(complete(token, "StrongPass1!", true)))
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse();
        String accessToken = body(signup.getContentAsString()).get("accessToken").asText();
        Cookie refresh = cookie(signup);
        mvc.perform(
                        put("/auth/account/password")
                                .header("Origin", "http://localhost:5173")
                                .header("Authorization", "Bearer " + accessToken)
                                .cookie(refresh)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(Map.of(
                                        "currentPassword", "StrongPass1!",
                                        "newPassword", "NewStrongPass2!"))))
                .andExpect(status().isOk());
        mvc.perform(
                        put("/auth/browser/account/password")
                                .header("Origin", "http://localhost:5173")
                                .header("Authorization", "Bearer " + accessToken)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(Map.of(
                                        "currentPassword", "StrongPass1!",
                                        "newPassword", "OtherStrongPass3!"))))
                .andExpect(status().isUnauthorized());
    }

    private String email() {
        return "auth-" + UUID.randomUUID() + "@example.com";
    }

    private String start(String email) throws Exception {
        mvc.perform(
                        post("/auth/signup/start")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isAccepted());
        return inbox.token(email, "Confirme seu e-mail");
    }

    private JsonNode signupComplete(String token) throws Exception {
        return body(
                mvc.perform(
                                post("/auth/signup/complete")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(complete(token, "StrongPass1!", true)))
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse()
                        .getContentAsString());
    }

    private String complete(String token, String password, boolean acceptTerms) {
        return json.writeValueAsString(
                Map.of(
                        "token",
                        token,
                        "firstName",
                        "Ada",
                        "lastName",
                        "Lovelace",
                        "password",
                        password,
                        "acceptTerms",
                        acceptTerms));
    }

    private JsonNode body(String value) {
        return json.readTree(value);
    }

    private String bearer(JsonNode result) {
        return "Bearer " + result.get("accessToken").asText();
    }

    private Cookie cookie(org.springframework.mock.web.MockHttpServletResponse response) {
        String header =
                response.getHeaders("Set-Cookie").stream()
                        .filter(value -> value.startsWith("vh_refresh_"))
                        .findFirst()
                        .orElseThrow();
        String[] pair = header.split(";", 2)[0].split("=", 2);
        return new Cookie(pair[0], pair[1]);
    }

    private byte[] base32(String value) {
        byte[] bytes = new byte[value.length() * 5 / 8];
        int buffer = 0, bits = 0, index = 0;
        for (char c : value.toCharArray()) {
            int digit = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
            if (digit < 0) throw new IllegalArgumentException("Invalid base32");
            buffer = (buffer << 5) | digit;
            bits += 5;
            if (bits >= 8) {
                bytes[index++] = (byte) (buffer >>> (bits - 8));
                bits -= 8;
            }
        }
        return bytes;
    }
}

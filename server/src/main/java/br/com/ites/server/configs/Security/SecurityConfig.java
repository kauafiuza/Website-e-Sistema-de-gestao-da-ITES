package br.com.ites.server.configs.Security;

import br.com.ites.server.services.User.Auth.AuthService;
import br.com.ites.server.services.User.Auth.SessionService;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

import jakarta.servlet.DispatcherType;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Base64;
import java.util.UUID;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

@Configuration
public class SecurityConfig {
    // Usa o formato {bcrypt} para permitir evolução do algoritmo de hash de senha.
    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    // A chave de assinatura deve vir do ambiente; não pode ser uma senha curta ou texto fixo no
    // código.
    @Bean
    SecretKey jwtKey(@Value("${auth.jwt.secret}") String encoded) {
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(encoded);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("AUTH_JWT_SECRET must be base64 encoded", e);
        }
        if (bytes.length < 32)
            throw new IllegalStateException(
                    "AUTH_JWT_SECRET must contain at least 32 random bytes");
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    // O mesmo segredo assina o access token e valida sua assinatura nas rotas protegidas.
    @Bean
    JwtEncoder jwtEncoder(SecretKey key) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey key, SessionService sessions) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).build();
        var defaults = JwtValidators.createDefault();
        decoder.setJwtValidator(
                jwt -> {
                    var result = defaults.validate(jwt);
                    if (result.hasErrors()) return result;
                    try {
                        if (!"access".equals(jwt.getClaimAsString("token_use"))
                                || !jwt.getAudience().contains("ites-portal")
                                || !AuthService.ISSUER.equals(jwt.getIssuer().toString())
                                || !sessions.isActive(
                                        UUID.fromString(jwt.getSubject()),
                                        UUID.fromString(jwt.getClaimAsString("sid"))))
                            return OAuth2TokenValidatorResult.failure(
                                    new OAuth2Error("invalid_token"));
                        return OAuth2TokenValidatorResult.success();
                    } catch (RuntimeException e) {
                        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
                    }
                });
        return decoder;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // As rotas de navegador usam cookie HttpOnly e checagem de Origin no controller.
        return http.csrf(csrf -> csrf.disable())
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(
                        auth ->
                                auth.requestMatchers(HttpMethod.GET, "/ites/pages", "/ites/pages/*").permitAll()
                                        .dispatcherTypeMatchers(DispatcherType.ERROR)
                                        .permitAll()
                                        .requestMatchers(
                                                "/auth/account", "/auth/account/**")
                                        .authenticated()
                                        .requestMatchers(
                                                "/auth/register",
                                                "/auth/login",
                                                "/auth/login/2fa",
                                                "/auth/refresh",
                                                "/auth/logout",
                                                "/auth/signup/**",
                                                "/auth/password/**",
                                                "/auth/email/confirm",
                                                "/auth/browser/**",
                                                "/public/**",
                                                "/organizations/invitations/lookup",
                                                "/swagger-ui.html",
                                                "/swagger-ui/**",
                                                "/v3/api-docs",
                                                "/v3/api-docs/**",
                                                "/actuator/health")
                                        .permitAll()
                                        .anyRequest()
                                        .authenticated())
                .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
                .build();
    }
}

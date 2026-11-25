package br.com.ites.server.controllers.Ites;

import br.com.ites.server.services.Ites.ItesAccessService;
import br.com.ites.server.services.Ites.ItesUserProvisioningService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ites/users")
public class ItesUserController {
    private final JdbcTemplate jdbc;
    private final ItesAccessService access;
    private final ItesUserProvisioningService provisioning;

    public ItesUserController(
            JdbcTemplate jdbc,
            ItesAccessService access,
            ItesUserProvisioningService provisioning) {
        this.jdbc = jdbc;
        this.access = access;
        this.provisioning = provisioning;
    }

    public record NewUser(
            @NotBlank @Size(max = 80) String firstName,
            @NotBlank @Size(max = 80) String lastName,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank String password) {}

    @GetMapping
    public List<Map<String,Object>> list(@AuthenticationPrincipal Jwt jwt) {
        access.require(UUID.fromString(jwt.getSubject()), "users.read");
        return jdbc.queryForList("SELECT id,first_name,last_name,email,active FROM users ORDER BY created_at DESC LIMIT 100");
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ItesUserProvisioningService.CreatedUser create(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody NewUser request) {
        UUID actorId = UUID.fromString(jwt.getSubject());
        access.require(actorId, "users.manage");
        return provisioning.create(
                actorId,
                request.firstName(),
                request.lastName(),
                request.email(),
                request.password());
    }
}

package br.com.ites.server.controllers.Ites;

import br.com.ites.server.services.Ites.DemandService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ites/demands")
public class DemandController {
    private final DemandService demands;

    public DemandController(DemandService demands) { this.demands = demands; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> create(@AuthenticationPrincipal Jwt jwt, @RequestBody DemandService.NewDemand request) {
        return demands.create(UUID.fromString(jwt.getSubject()), request);
    }

    @GetMapping
    public List<Map<String,Object>> mine(@AuthenticationPrincipal Jwt jwt) {
        return demands.listOwned(UUID.fromString(jwt.getSubject()));
    }

    @GetMapping("/{id}")
    public Map<String,Object> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return demands.getOwned(UUID.fromString(jwt.getSubject()), id);
    }

    @GetMapping("/review")
    public List<Map<String,Object>> review(@AuthenticationPrincipal Jwt jwt, @RequestParam(required=false) String status) {
        return demands.listForReview(UUID.fromString(jwt.getSubject()), status);
    }

    public record Classification(String notes) {}

    @PatchMapping("/{id}/classification")
    public void classify(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody Classification request) {
        demands.classify(UUID.fromString(jwt.getSubject()), id, request.notes());
    }

    @PostMapping("/{id}/decision")
    public Map<String,Object> decide(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                     @RequestBody DemandService.Decision request) {
        return demands.decide(UUID.fromString(jwt.getSubject()), id, request);
    }
}

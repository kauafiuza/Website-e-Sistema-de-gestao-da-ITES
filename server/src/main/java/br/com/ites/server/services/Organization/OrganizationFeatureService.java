package br.com.ites.server.services.Organization;

import br.com.ites.server.models.Organization.OrganizationFeature;
import br.com.ites.server.repositories.Organization.OrganizationFeatureRepository;
import br.com.ites.server.repositories.Organization.PermissionGrantRepository;
import br.com.ites.server.services.Ites.ItesAccessService;
import br.com.ites.server.utils.dtos.Organization.OrganizationFeatureResponseDTO;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrganizationFeatureService {
    private final OrganizationFeatureRepository features;
    private final PermissionGrantRepository memberships;
    private final ItesAccessService access;

    public OrganizationFeatureService(OrganizationFeatureRepository features,
            PermissionGrantRepository memberships, ItesAccessService access) {
        this.features = features;
        this.memberships = memberships;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<OrganizationFeatureResponseDTO> list(UUID userId, UUID organizationId) {
        if (access.isSystemAdministrator(userId)) {
            if (!memberships.organizationExists(organizationId))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            return features.listCurrent(organizationId).stream()
                    .map(feature -> new OrganizationFeatureResponseDTO(feature.featureKey(), feature.version(),
                            feature.name(), feature.description(), feature.enabled()))
                    .toList();
        }
        requireMember(userId, organizationId);
        return features.listCurrent(organizationId).stream()
                .map(feature -> new OrganizationFeatureResponseDTO(feature.featureKey(), feature.version(),
                        feature.name(), feature.description(), feature.enabled()))
                .toList();
    }

    @Transactional
    public void initializeDefaults(UUID organizationId) {
        features.initializeDefaults(organizationId);
    }

    public void requireEnabled(UUID organizationId, OrganizationFeature feature) {
        if (!features.isEnabled(organizationId, feature)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Este recurso não está disponível para a organização");
        }
    }

    private void requireMember(UUID userId, UUID organizationId) {
        if (!memberships.isMember(userId, organizationId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }
}

package com.autocrm.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.autocrm.model.DealershipSite;

public interface DealershipSiteRepository extends JpaRepository<DealershipSite, Long> {
    Optional<DealershipSite> findBySlugAndPublishedTrue(String slug);
    boolean existsBySlug(String slug);
    boolean existsByTenantIdAndPublishedTrueAndConfigContaining(Long tenantId, String value);
}

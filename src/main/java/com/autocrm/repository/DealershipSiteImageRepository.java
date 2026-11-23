package com.autocrm.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import com.autocrm.model.DealershipSiteImage;

public interface DealershipSiteImageRepository extends JpaRepository<DealershipSiteImage, UUID> {
    boolean existsByIdAndTenantId(UUID id, Long tenantId);
    java.util.Optional<DealershipSiteImage> findByIdAndTenantId(UUID id, Long tenantId);
}

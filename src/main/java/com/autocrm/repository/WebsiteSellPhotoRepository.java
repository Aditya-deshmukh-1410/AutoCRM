package com.autocrm.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import com.autocrm.model.WebsiteSellPhoto;

public interface WebsiteSellPhotoRepository extends JpaRepository<WebsiteSellPhoto, UUID> {
    List<WebsiteSellPhoto> findByLeadIdAndTenantId(Long leadId, Long tenantId);
    Optional<WebsiteSellPhoto> findByIdAndLeadIdAndTenantId(UUID id, Long leadId, Long tenantId);
}

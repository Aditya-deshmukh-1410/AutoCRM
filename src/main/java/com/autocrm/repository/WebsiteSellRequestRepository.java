package com.autocrm.repository;

import com.autocrm.model.WebsiteSellRequest;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WebsiteSellRequestRepository extends JpaRepository<WebsiteSellRequest, Long> {
    List<WebsiteSellRequest> findTop100ByTenantIdOrderByCreatedAtDesc(Long tenantId);
    Optional<WebsiteSellRequest> findByLeadIdAndTenantId(Long leadId, Long tenantId);
}

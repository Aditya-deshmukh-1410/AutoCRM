package com.autocrm.repository;

import com.autocrm.model.CrmNotification;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrmNotificationRepository extends JpaRepository<CrmNotification, UUID> {
    List<CrmNotification> findTop100ByTenantIdOrderByCreatedAtDesc(Long tenantId);
    long countByTenantIdAndReadFalse(Long tenantId);
    Optional<CrmNotification> findByIdAndTenantId(UUID id, Long tenantId);
    List<CrmNotification> findByTenantIdAndReadFalse(Long tenantId);
}

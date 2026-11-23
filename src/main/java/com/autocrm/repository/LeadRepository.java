package com.autocrm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.autocrm.model.Lead;

public interface LeadRepository extends JpaRepository<Lead, Long> {

    List<Lead> findByTenantId(Long tenantId);

    List<Lead> findByTenantIdAndAssignedUserId(Long tenantId, Long assignedUserId);

    Optional<Lead> findByLeadIdAndTenantId(Long leadId, Long tenantId);
    boolean existsByLeadIdAndTenantId(Long leadId, Long tenantId);
}

package com.autocrm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.autocrm.model.Finance;

public interface FinanceRepository extends JpaRepository<Finance, Long> {

    List<Finance> findByTenantId(Long tenantId);

    Optional<Finance> findByFinanceIdAndTenantId(Long financeId, Long tenantId);
}
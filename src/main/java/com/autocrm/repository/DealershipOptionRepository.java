package com.autocrm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.autocrm.model.DealershipOption;
import com.autocrm.model.DealershipOptionType;

public interface DealershipOptionRepository extends JpaRepository<DealershipOption, Long> {
    List<DealershipOption> findByTenantIdOrderByOptionTypeAscValueAsc(Long tenantId);
    List<DealershipOption> findByTenantIdAndOptionType(Long tenantId, DealershipOptionType optionType);
    Optional<DealershipOption> findByOptionIdAndTenantId(Long optionId, Long tenantId);
    boolean existsByTenantIdAndOptionTypeAndNormalizedValue(Long tenantId, DealershipOptionType optionType,
            String normalizedValue);
    boolean existsByTenantIdAndOptionTypeAndNormalizedValueAndOptionIdNot(Long tenantId,
            DealershipOptionType optionType, String normalizedValue, Long optionId);
    long countByTenantIdAndOptionTypeAndActiveTrue(Long tenantId, DealershipOptionType optionType);
}

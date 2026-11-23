package com.autocrm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.autocrm.model.Sale;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    List<Sale> findByTenantId(Long tenantId);

    Optional<Sale> findBySaleIdAndTenantId(Long saleId, Long tenantId);

    Optional<Sale> findByVehicleIdAndTenantIdAndSaleStatus(Long vehicleId, Long tenantId, String saleStatus);

    boolean existsByVehicleIdAndTenantIdAndSaleStatusAndSaleIdNot(Long vehicleId, Long tenantId, String saleStatus,
            Long saleId);
}

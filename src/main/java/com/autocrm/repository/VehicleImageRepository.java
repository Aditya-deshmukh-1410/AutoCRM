package com.autocrm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.autocrm.model.VehicleImage;

public interface VehicleImageRepository extends JpaRepository<VehicleImage, Long> {

    long countByVehicleIdAndTenantId(Long vehicleId, Long tenantId);

    List<VehicleImage> findByVehicleIdAndTenantIdOrderByCreatedAtAsc(Long vehicleId, Long tenantId);

    Optional<VehicleImage> findByVehicleImageIdAndVehicleIdAndTenantId(Long vehicleImageId, Long vehicleId,
            Long tenantId);
}

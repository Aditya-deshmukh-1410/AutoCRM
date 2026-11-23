package com.autocrm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.autocrm.model.VehicleInspection;

public interface VehicleInspectionRepository extends JpaRepository<VehicleInspection, Long> {

    List<VehicleInspection> findByTenantId(Long tenantId);

    Optional<VehicleInspection> findByInspectionIdAndTenantId(Long inspectionId, Long tenantId);

    List<VehicleInspection> findByVehicleIdAndTenantIdOrderByInspectionDateDescInspectionIdDesc(Long vehicleId,
            Long tenantId);
}
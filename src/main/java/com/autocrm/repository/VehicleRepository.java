package com.autocrm.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.jpa.repository.JpaRepository;

import com.autocrm.model.Vehicle;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    List<Vehicle> findByTenantId(Long tenantId);

    List<Vehicle> findByPubliclyVisibleTrueOrderByVehicleIdDesc();

    Optional<Vehicle> findByVehicleIdAndPubliclyVisibleTrue(Long vehicleId);
    Optional<Vehicle> findByVehicleIdAndTenantId(Long vehicleId, Long tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Vehicle v where v.vehicleId = :vehicleId and v.tenantId = :tenantId")
    Optional<Vehicle> findByVehicleIdAndTenantIdForUpdate(@Param("vehicleId") Long vehicleId,
            @Param("tenantId") Long tenantId);

    boolean existsByRegistrationNumberAndTenantId(String registrationNumber, Long tenantId);
}

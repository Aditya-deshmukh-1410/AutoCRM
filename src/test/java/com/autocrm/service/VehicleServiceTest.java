package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.autocrm.exception.BusinessException;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.TenantRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.TenantContext;

@ExtendWith(MockitoExtension.class)
class VehicleServiceTest {

    private static final Long TENANT_ID = 37L;
    private static final Long VEHICLE_ID = 51L;

    @Mock private VehicleRepository vehicleRepository;
    @Mock private AuditLogService auditLogService;
    @Mock private VehicleImageService vehicleImageService;
    @Mock private TenantRepository tenantRepository;

    private VehicleService service;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TENANT_ID);
        service = new VehicleService(vehicleRepository, auditLogService, vehicleImageService, tenantRepository);
    }

    @AfterEach
    void clearTenantContext() {
        TenantContext.clear();
    }

    @Test
    void duplicateRegistrationDuringCreateIsAConflict() {
        when(vehicleRepository.existsByRegistrationNumberAndTenantId("ABC123", TENANT_ID)).thenReturn(true);

        BusinessException error = assertThrows(BusinessException.class, () -> service.createVehicle(vehicle("ABC123")));

        assertEquals("Vehicle with this registration number already exists", error.getMessage());
        verify(vehicleRepository, never()).save(org.mockito.ArgumentMatchers.any(Vehicle.class));
    }

    @Test
    void createNormalizesAndPersistsPublicListingDetails() {
        when(vehicleRepository.existsByRegistrationNumberAndTenantId("ABC123", TENANT_ID)).thenReturn(false);
        when(vehicleRepository.save(org.mockito.ArgumentMatchers.any(Vehicle.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        Vehicle request = vehicle("ABC123");
        request.setBodyType(" SUV/MUV ");
        request.setOwnerType(" First ");
        request.setDescription("  One careful owner.  ");
        request.setRegistrationAt(" MH-03 ");
        request.setRegistrationType(" Individual ");
        request.setInsuranceType(" Comprehensive ");
        request.setSellerNote("  Full service history.  ");
        request.setPubliclyVisible(true);

        Vehicle created = service.createVehicle(request);

        assertEquals("SUV/MUV", created.getBodyType());
        assertEquals("First", created.getOwnerType());
        assertEquals("One careful owner.", created.getDescription());
        assertEquals("MH-03", created.getRegistrationAt());
        assertEquals("Individual", created.getRegistrationType());
        assertEquals("Comprehensive", created.getInsuranceType());
        assertEquals("Full service history.", created.getSellerNote());
        assertEquals(TENANT_ID, created.getTenantId());
        assertFalse(created.isPubliclyVisible(), "A new vehicle must still be explicitly published by an admin.");
    }

    @Test
    void duplicateRegistrationDuringUpdateIsAConflict() {
        Vehicle existing = vehicle("OLD123");
        existing.setVehicleId(VEHICLE_ID);
        when(vehicleRepository.findByVehicleIdAndTenantId(VEHICLE_ID, TENANT_ID)).thenReturn(Optional.of(existing));
        when(vehicleRepository.existsByRegistrationNumberAndTenantId("NEW123", TENANT_ID)).thenReturn(true);

        BusinessException error = assertThrows(BusinessException.class,
                () -> service.updateVehicle(VEHICLE_ID, vehicle("NEW123")));

        assertEquals("Vehicle with this registration number already exists", error.getMessage());
        verify(vehicleRepository, never()).save(org.mockito.ArgumentMatchers.any(Vehicle.class));
    }

    @Test
    void vehicleOutsideTenantRemainsNotFound() {
        when(vehicleRepository.findByVehicleIdAndTenantId(VEHICLE_ID, TENANT_ID)).thenReturn(Optional.empty());

        RuntimeException error = assertThrows(RuntimeException.class, () -> service.getVehicleById(VEHICLE_ID));

        assertEquals(RuntimeException.class, error.getClass());
        assertEquals("Vehicle not found", error.getMessage());
        verify(vehicleRepository).findByVehicleIdAndTenantId(VEHICLE_ID, TENANT_ID);
    }

    private Vehicle vehicle(String registrationNumber) {
        Vehicle vehicle = new Vehicle();
        vehicle.setMake("Make");
        vehicle.setModel("Model");
        vehicle.setRegistrationNumber(registrationNumber);
        vehicle.setStatus("AVAILABLE");
        return vehicle;
    }
}

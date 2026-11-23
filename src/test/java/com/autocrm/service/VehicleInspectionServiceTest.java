package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.autocrm.model.Vehicle;
import com.autocrm.model.VehicleInspection;
import com.autocrm.repository.VehicleInspectionRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.TenantContext;

@ExtendWith(MockitoExtension.class)
class VehicleInspectionServiceTest {

    private static final Long TENANT_ID = 7L;
    private static final Long VEHICLE_ID = 21L;

    @Mock
    private VehicleInspectionRepository inspectionRepository;
    @Mock
    private VehicleRepository vehicleRepository;
    @Mock
    private AuditLogService auditLogService;

    private VehicleInspectionService service;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TENANT_ID);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken("staff@dealership.test", "unused",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        SecurityContextHolder.setContext(context);
        service = new VehicleInspectionService(inspectionRepository, vehicleRepository, auditLogService);
    }

    @AfterEach
    void clearContexts() {
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    void createsInspectionWithServerControlledTenantAndInspectorAndRecordsAudit() {
        VehicleInspection request = new VehicleInspection();
        request.setInspectionId(900L);
        request.setVehicleId(VEHICLE_ID);
        request.setTenantId(999L);
        request.setInspectorEmail("spoofed@example.test");
        request.setInspectionDate(LocalDate.of(2026, 10, 18));

        when(vehicleRepository.findByVehicleIdAndTenantId(VEHICLE_ID, TENANT_ID))
                .thenReturn(Optional.of(vehicle()));
        when(inspectionRepository.save(any(VehicleInspection.class))).thenAnswer(invocation -> {
            VehicleInspection saved = invocation.getArgument(0);
            saved.setInspectionId(91L);
            return saved;
        });

        VehicleInspection saved = service.createInspection(request);

        assertEquals(91L, saved.getInspectionId());
        assertEquals(VEHICLE_ID, saved.getVehicleId());
        assertEquals(TENANT_ID, saved.getTenantId());
        assertEquals("staff@dealership.test", saved.getInspectorEmail());
        verify(auditLogService).record("VEHICLE_INSPECTION_CREATED", "VEHICLE", VEHICLE_ID,
                "Inspection #91 recorded; status: Not recorded");
    }

    @Test
    void rejectsVehicleOutsideCurrentTenantBeforeSavingOrAuditing() {
        VehicleInspection request = new VehicleInspection();
        request.setVehicleId(VEHICLE_ID);
        request.setInspectionDate(LocalDate.of(2026, 10, 18));
        when(vehicleRepository.findByVehicleIdAndTenantId(VEHICLE_ID, TENANT_ID)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.createInspection(request));

        verify(inspectionRepository, never()).save(any(VehicleInspection.class));
        verify(auditLogService, never()).record(any(), any(), any(), any());
    }

    @Test
    void listsInspectionsOnlyAfterTenantScopedVehicleLookup() {
        when(vehicleRepository.findByVehicleIdAndTenantId(VEHICLE_ID, TENANT_ID))
                .thenReturn(Optional.of(vehicle()));
        when(inspectionRepository.findByVehicleIdAndTenantIdOrderByInspectionDateDescInspectionIdDesc(
                VEHICLE_ID, TENANT_ID)).thenReturn(List.of());

        assertEquals(List.of(), service.getInspectionsForVehicle(VEHICLE_ID));

        verify(inspectionRepository).findByVehicleIdAndTenantIdOrderByInspectionDateDescInspectionIdDesc(
                VEHICLE_ID, TENANT_ID);
    }

    private Vehicle vehicle() {
        Vehicle vehicle = new Vehicle();
        vehicle.setVehicleId(VEHICLE_ID);
        vehicle.setTenantId(TENANT_ID);
        return vehicle;
    }
}

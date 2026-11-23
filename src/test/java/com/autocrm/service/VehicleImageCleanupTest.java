package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.autocrm.model.Vehicle;
import com.autocrm.model.VehicleImage;
import com.autocrm.exception.VehicleImageUploadException;
import com.autocrm.repository.VehicleImageRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.repository.TenantRepository;
import com.autocrm.security.TenantContext;

class VehicleImageCleanupTest {

    private static final Long TENANT_ID = 73L;
    private static final Long VEHICLE_ID = 812L;

    @TempDir
    Path imageStorage;

    private VehicleRepository vehicleRepository;
    private VehicleImageRepository imageRepository;
    private AuditLogService auditLogService;
    private VehicleService vehicleService;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TENANT_ID);
        TransactionSynchronizationManager.initSynchronization();
        vehicleRepository = mock(VehicleRepository.class);
        imageRepository = mock(VehicleImageRepository.class);
        auditLogService = mock(AuditLogService.class);
        VehicleImageService imageService = new VehicleImageService(mock(VehicleService.class), imageRepository,
                imageStorage.toAbsolutePath().toString());
        vehicleService = new VehicleService(vehicleRepository, auditLogService, imageService, mock(TenantRepository.class));

        Vehicle vehicle = new Vehicle();
        vehicle.setVehicleId(VEHICLE_ID);
        vehicle.setTenantId(TENANT_ID);
        vehicle.setStatus("AVAILABLE");
        when(vehicleRepository.findByVehicleIdAndTenantIdForUpdate(VEHICLE_ID, TENANT_ID))
                .thenReturn(Optional.of(vehicle));
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        TenantContext.clear();
    }

    @Test
    void deletingVehicleRemovesItsImageMetadataAndStoredFileAfterCommit() throws Exception {
        VehicleImage image = new VehicleImage(VEHICLE_ID, TENANT_ID, "image/png", 5L);
        Path storedFile = imageStorage.resolve(image.getStorageFilename());
        Files.writeString(storedFile, "test image");
        when(imageRepository.findByVehicleIdAndTenantIdOrderByCreatedAtAsc(VEHICLE_ID, TENANT_ID))
                .thenReturn(List.of(image));

        vehicleService.deleteVehicle(VEHICLE_ID);

        verify(imageRepository).deleteAll(List.of(image));
        assertTrue(Files.exists(storedFile), "the file remains available until the database commit");
        for (TransactionSynchronization synchronization : TransactionSynchronizationManager.getSynchronizations()) {
            synchronization.afterCommit();
        }
        assertFalse(Files.exists(storedFile));
        verify(vehicleRepository).delete(org.mockito.ArgumentMatchers.any(Vehicle.class));
        verify(auditLogService).record("VEHICLE_DELETED", "VEHICLE", VEHICLE_ID,
                "status: AVAILABLE -> DELETED");
    }

    @Test
    void deletingVehicleWithoutImagesStillDeletesVehicleAndRecordsAudit() {
        when(imageRepository.findByVehicleIdAndTenantIdOrderByCreatedAtAsc(VEHICLE_ID, TENANT_ID))
                .thenReturn(List.of());

        vehicleService.deleteVehicle(VEHICLE_ID);

        verify(imageRepository).findByVehicleIdAndTenantIdOrderByCreatedAtAsc(VEHICLE_ID, TENANT_ID);
        verify(vehicleRepository).delete(org.mockito.ArgumentMatchers.any(Vehicle.class));
        verify(auditLogService).record("VEHICLE_DELETED", "VEHICLE", VEHICLE_ID,
                "status: AVAILABLE -> DELETED");
    }

    @Test
    void fileDeletionFailureIsReportedAfterVehicleAndMetadataDeletion() throws Exception {
        VehicleImage image = new VehicleImage(VEHICLE_ID, TENANT_ID, "image/png", 5L);
        Path storedFile = imageStorage.resolve(image.getStorageFilename());
        Files.createDirectory(storedFile);
        Files.writeString(storedFile.resolve("retained"), "prevents directory deletion");
        when(imageRepository.findByVehicleIdAndTenantIdOrderByCreatedAtAsc(VEHICLE_ID, TENANT_ID))
                .thenReturn(List.of(image));

        vehicleService.deleteVehicle(VEHICLE_ID);

        VehicleImageUploadException failure = assertThrows(VehicleImageUploadException.class, () -> {
            for (TransactionSynchronization synchronization : TransactionSynchronizationManager.getSynchronizations()) {
                synchronization.afterCommit();
            }
        });

        assertTrue(Files.exists(storedFile));
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, failure.getStatus());
        assertTrue(failure.getMessage().contains("could not be removed"));
        verify(imageRepository).deleteAll(List.of(image));
        verify(vehicleRepository).delete(org.mockito.ArgumentMatchers.any(Vehicle.class));
    }
}

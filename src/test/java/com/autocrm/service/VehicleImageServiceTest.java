package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import javax.imageio.ImageIO;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.autocrm.exception.VehicleImageUploadException;
import com.autocrm.model.Vehicle;
import com.autocrm.model.VehicleImage;
import com.autocrm.repository.VehicleImageRepository;
import com.autocrm.security.TenantContext;

class VehicleImageServiceTest {
    private static final Long TENANT_ID = 19L;
    private static final Long VEHICLE_ID = 21L;

    @TempDir Path imageStorage;

    private VehicleService vehicleService;
    private VehicleImageRepository imageRepository;
    private VehicleImageService service;
    private AtomicInteger photoCount;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TENANT_ID);
        TransactionSynchronizationManager.initSynchronization();
        vehicleService = mock(VehicleService.class);
        imageRepository = mock(VehicleImageRepository.class);
        service = new VehicleImageService(vehicleService, imageRepository, imageStorage.toAbsolutePath().toString());
        Vehicle vehicle = new Vehicle();
        vehicle.setVehicleId(VEHICLE_ID);
        vehicle.setTenantId(TENANT_ID);
        when(vehicleService.getVehicleByIdForUpdate(VEHICLE_ID)).thenReturn(vehicle);
        photoCount = new AtomicInteger();
        when(imageRepository.countByVehicleIdAndTenantId(VEHICLE_ID, TENANT_ID))
                .thenAnswer(invocation -> (long) photoCount.get());
        when(imageRepository.saveAndFlush(any(VehicleImage.class))).thenAnswer(invocation -> {
            photoCount.incrementAndGet();
            return invocation.getArgument(0);
        });
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        TenantContext.clear();
    }

    @Test
    void vehicleAcceptsTenPhotosAndRejectsTheEleventh() throws Exception {
        MockMultipartFile upload = new MockMultipartFile("file", "car.png", "image/png", png());
        for (int index = 0; index < 10; index++) {
            service.upload(VEHICLE_ID, upload);
        }

        VehicleImageUploadException failure = assertThrows(VehicleImageUploadException.class,
                () -> service.upload(VEHICLE_ID, upload));
        assertEquals(HttpStatus.CONFLICT, failure.getStatus());
        assertEquals(10, photoCount.get());
    }

    @Test
    void deletingPhotoRemovesMetadataAndDeletesFileAfterCommit() throws Exception {
        VehicleImage image = new VehicleImage(VEHICLE_ID, TENANT_ID, "image/png", 5L);
        Path storedFile = imageStorage.resolve(image.getStorageFilename());
        Files.write(storedFile, png());
        when(imageRepository.findByVehicleImageIdAndVehicleIdAndTenantId(4L, VEHICLE_ID, TENANT_ID))
                .thenReturn(Optional.of(image));

        service.deleteImage(VEHICLE_ID, 4L);

        verify(imageRepository).delete(image);
        assertTrue(Files.exists(storedFile), "the file remains until the metadata transaction commits");
        for (TransactionSynchronization synchronization : TransactionSynchronizationManager.getSynchronizations()) {
            synchronization.afterCommit();
        }
        assertFalse(Files.exists(storedFile));
    }

    private byte[] png() throws Exception {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }
}

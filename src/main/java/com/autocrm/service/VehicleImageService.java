package com.autocrm.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Iterator;
import java.util.Locale;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.autocrm.dto.PublicVehicleImageResponse;
import com.autocrm.exception.VehicleImageUploadException;
import com.autocrm.model.Vehicle;
import com.autocrm.model.VehicleImage;
import com.autocrm.repository.VehicleImageRepository;
import com.autocrm.security.TenantContext;

@Service
public class VehicleImageService {

    private static final Logger LOGGER = Logger.getLogger(VehicleImageService.class.getName());
    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final long MAX_IMAGES_PER_VEHICLE = 10;
    private static final int MAX_IMAGE_WIDTH = 6000;
    private static final int MAX_IMAGE_HEIGHT = 6000;
    private static final long MAX_IMAGE_PIXELS = 24_000_000L;

    private final VehicleService vehicleService;
    private final VehicleImageRepository vehicleImageRepository;
    private final String storageDirectory;

    public VehicleImageService(VehicleService vehicleService, VehicleImageRepository vehicleImageRepository,
            @Value("${autocrm.vehicle-images.storage-directory}") String storageDirectory) {
        this.vehicleService = vehicleService;
        this.vehicleImageRepository = vehicleImageRepository;
        this.storageDirectory = storageDirectory;
    }

    public record VehicleImageContent(byte[] bytes, String contentType) {}

    @Transactional(readOnly = true)
    public List<VehicleImage> getImages(Long vehicleId) {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new VehicleImageUploadException(HttpStatus.UNAUTHORIZED, "An authenticated dealership is required.");
        }

        Vehicle vehicle = vehicleService.getVehicleById(vehicleId);
        return vehicleImageRepository.findByVehicleIdAndTenantIdOrderByCreatedAtAsc(vehicle.getVehicleId(), tenantId);
    }

    @Transactional(readOnly = true)
    public List<PublicVehicleImageResponse> getPublicImages(Long vehicleId) {
        Vehicle vehicle = vehicleService.getPublishedVehicleById(vehicleId);
        return vehicleImageRepository
                .findByVehicleIdAndTenantIdOrderByCreatedAtAsc(vehicle.getVehicleId(), vehicle.getTenantId())
                .stream()
                .map(image -> new PublicVehicleImageResponse(image.getVehicleImageId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public VehicleImageContent getPublicImageContent(Long vehicleId, Long imageId) {
        Vehicle vehicle = vehicleService.getPublishedVehicleById(vehicleId);
        VehicleImage image = vehicleImageRepository
                .findByVehicleImageIdAndVehicleIdAndTenantId(imageId, vehicle.getVehicleId(), vehicle.getTenantId())
                .orElseThrow(() -> new VehicleImageUploadException(HttpStatus.NOT_FOUND, "Vehicle photo not found."));

        if (!List.of("image/jpeg", "image/png", "image/webp").contains(image.getContentType())) {
            throw new VehicleImageUploadException(HttpStatus.NOT_FOUND, "Vehicle photo is unavailable.");
        }

        return readPublicImageContent(image);
    }

    private VehicleImageContent readPublicImageContent(VehicleImage image) {
        Path root = storageRoot();
        Path storedFile = root.resolve(image.getStorageFilename()).normalize();
        if (!root.equals(storedFile.getParent()) || !Files.isRegularFile(storedFile)) {
            throw new VehicleImageUploadException(HttpStatus.NOT_FOUND, "Vehicle photo is unavailable.");
        }
        try {
            return new VehicleImageContent(Files.readAllBytes(storedFile), image.getContentType());
        } catch (IOException exception) {
            throw new VehicleImageUploadException(HttpStatus.NOT_FOUND, "Vehicle photo is unavailable.", exception);
        }
    }

    @Transactional(readOnly = true)
    public VehicleImageContent getImageContent(Long vehicleId, Long imageId) {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new VehicleImageUploadException(HttpStatus.UNAUTHORIZED, "An authenticated dealership is required.");
        }

        Vehicle vehicle = vehicleService.getVehicleById(vehicleId);
        VehicleImage image = vehicleImageRepository
                .findByVehicleImageIdAndVehicleIdAndTenantId(imageId, vehicle.getVehicleId(), tenantId)
                .orElseThrow(() -> new VehicleImageUploadException(HttpStatus.NOT_FOUND, "Vehicle photo not found."));

        Path root = storageRoot();
        Path storedFile = root.resolve(image.getStorageFilename()).normalize();
        if (!root.equals(storedFile.getParent()) || !Files.isRegularFile(storedFile)) {
            throw new VehicleImageUploadException(HttpStatus.NOT_FOUND, "Vehicle photo is unavailable.");
        }

        try {
            return new VehicleImageContent(Files.readAllBytes(storedFile), image.getContentType());
        } catch (IOException exception) {
            throw new VehicleImageUploadException(HttpStatus.NOT_FOUND, "Vehicle photo is unavailable.", exception);
        }
    }

    @Transactional
    public VehicleImage upload(Long vehicleId, MultipartFile upload) {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new VehicleImageUploadException(HttpStatus.UNAUTHORIZED, "An authenticated dealership is required.");
        }

        Vehicle vehicle = vehicleService.getVehicleByIdForUpdate(vehicleId);
        long currentCount = vehicleImageRepository.countByVehicleIdAndTenantId(vehicle.getVehicleId(), tenantId);
        if (currentCount >= MAX_IMAGES_PER_VEHICLE) {
            throw new VehicleImageUploadException(HttpStatus.CONFLICT, "A vehicle can have no more than ten photos.");
        }
        if (upload == null || upload.isEmpty()) {
            throw new VehicleImageUploadException(HttpStatus.BAD_REQUEST, "Choose an image to upload.");
        }
        if (upload.getSize() > MAX_IMAGE_SIZE) {
            throw new VehicleImageUploadException(HttpStatus.CONTENT_TOO_LARGE, "Each photo must be 5 MB or smaller.");
        }

        byte[] contents;
        try {
            contents = upload.getBytes();
        } catch (IOException exception) {
            throw new VehicleImageUploadException(HttpStatus.BAD_REQUEST, "The uploaded image could not be read.");
        }
        if (contents.length == 0) {
            throw new VehicleImageUploadException(HttpStatus.BAD_REQUEST, "Choose an image to upload.");
        }
        if (contents.length > MAX_IMAGE_SIZE) {
            throw new VehicleImageUploadException(HttpStatus.CONTENT_TOO_LARGE, "Each photo must be 5 MB or smaller.");
        }

        String contentType = detectAndDecodeImage(contents);
        VehicleImage image = new VehicleImage(vehicle.getVehicleId(), tenantId, contentType, (long) contents.length);

        Path storedFile = null;
        boolean storedFileCreated = false;
        boolean rollbackCleanupRegistered = false;
        try {
            if (!TransactionSynchronizationManager.isSynchronizationActive()) {
                throw new IllegalStateException("Vehicle image upload requires an active transaction.");
            }

            Path root = storageRoot();
            storedFile = root.resolve(image.getStorageFilename()).normalize();
            if (!root.equals(storedFile.getParent())) {
                throw new IllegalStateException("Generated image path is outside the storage directory.");
            }
            try (OutputStream output = Files.newOutputStream(storedFile,
                    StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
                storedFileCreated = true;
                output.write(contents);
            }

            Path committedFile = storedFile;
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != TransactionSynchronization.STATUS_COMMITTED) {
                        deleteQuietly(committedFile);
                    }
                }
            });
            rollbackCleanupRegistered = true;
            return vehicleImageRepository.saveAndFlush(image);
        } catch (VehicleImageUploadException exception) {
            if (!rollbackCleanupRegistered && storedFileCreated) deleteQuietly(storedFile);
            throw exception;
        } catch (IOException exception) {
            if (!rollbackCleanupRegistered && storedFileCreated) deleteQuietly(storedFile);
            throw new VehicleImageUploadException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "The vehicle photo could not be stored.", exception);
        } catch (DataAccessException exception) {
            LOGGER.log(Level.WARNING,
                    "Vehicle image metadata could not be saved; transaction rollback will remove the file.", exception);
            throw new VehicleImageUploadException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "The vehicle photo could not be saved.", exception);
        } catch (RuntimeException exception) {
            if (!rollbackCleanupRegistered && storedFileCreated) deleteQuietly(storedFile);
            LOGGER.log(Level.WARNING, "Vehicle image upload failed.", exception);
            throw new VehicleImageUploadException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "The vehicle photo could not be stored.", exception);
        }
    }

    @Transactional
    public void deleteImage(Long vehicleId, Long imageId) {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new VehicleImageUploadException(HttpStatus.UNAUTHORIZED, "An authenticated dealership is required.");
        }
        Vehicle vehicle = vehicleService.getVehicleByIdForUpdate(vehicleId);
        VehicleImage image = vehicleImageRepository
                .findByVehicleImageIdAndVehicleIdAndTenantId(imageId, vehicle.getVehicleId(), tenantId)
                .orElseThrow(() -> new VehicleImageUploadException(HttpStatus.NOT_FOUND, "Vehicle photo not found."));
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Vehicle photo cleanup requires an active transaction.");
        }

        Path root = storageRoot();
        Path storedFile = root.resolve(image.getStorageFilename()).normalize();
        if (!root.equals(storedFile.getParent())) {
            throw new VehicleImageUploadException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Vehicle photo metadata contains an invalid storage path.");
        }
        vehicleImageRepository.delete(image);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    Files.deleteIfExists(storedFile);
                } catch (IOException | SecurityException exception) {
                    LOGGER.log(Level.SEVERE, "Vehicle photo record was deleted but its file could not be removed.",
                            exception);
                    throw new VehicleImageUploadException(HttpStatus.INTERNAL_SERVER_ERROR,
                            "The photo record was deleted, but its file could not be removed. Check the photo storage folder.",
                            exception);
                }
            }
        });
    }

    @Transactional
    public void deleteImagesForVehicle(Long vehicleId, Long tenantId) {
        if (tenantId == null) {
            throw new VehicleImageUploadException(HttpStatus.UNAUTHORIZED, "An authenticated dealership is required.");
        }

        List<VehicleImage> images = vehicleImageRepository
                .findByVehicleIdAndTenantIdOrderByCreatedAtAsc(vehicleId, tenantId);
        if (images.isEmpty()) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Vehicle photo cleanup requires an active transaction.");
        }

        Path root = storageRoot();
        List<Path> storedFiles = images.stream().map(image -> {
            Path storedFile = root.resolve(image.getStorageFilename()).normalize();
            if (!root.equals(storedFile.getParent())) {
                throw new VehicleImageUploadException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Vehicle photo metadata contains an invalid storage path.");
            }
            return storedFile;
        }).toList();

        vehicleImageRepository.deleteAll(images);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                Exception deletionFailure = null;
                for (Path storedFile : storedFiles) {
                    try {
                        Files.deleteIfExists(storedFile);
                    } catch (IOException | SecurityException exception) {
                        if (deletionFailure == null) {
                            deletionFailure = exception;
                        } else {
                            deletionFailure.addSuppressed(exception);
                        }
                    }
                }
                if (deletionFailure != null) {
                    LOGGER.log(Level.SEVERE, "Vehicle was deleted but one or more photo files remain.",
                            deletionFailure);
                    throw new VehicleImageUploadException(HttpStatus.INTERNAL_SERVER_ERROR,
                            "The vehicle and photo records were deleted, but one or more photo files could not be removed.",
                            deletionFailure);
                }
            }
        });
    }

    private String detectAndDecodeImage(byte[] contents) {
        try (ImageInputStream imageInput = ImageIO.createImageInputStream(new ByteArrayInputStream(contents))) {
            if (imageInput == null) throw unsupportedImage();
            Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInput);
            if (!readers.hasNext()) throw unsupportedImage();

            ImageReader reader = readers.next();
            try {
                reader.setInput(imageInput, true, true);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                String contentType = switch (format) {
                    case "jpeg", "jpg" -> "image/jpeg";
                    case "png" -> "image/png";
                    case "webp" -> "image/webp";
                    default -> throw unsupportedImage();
                };
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width <= 0 || height <= 0) throw malformedImage();
                long pixelCount = (long) width * height;
                if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT || pixelCount > MAX_IMAGE_PIXELS) {
                    throw imageDimensionsExceeded();
                }
                BufferedImage decoded = reader.read(0);
                if (decoded == null) throw malformedImage();
                decoded.flush();
                return contentType;
            } finally {
                reader.dispose();
            }
        } catch (VehicleImageUploadException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            throw malformedImage();
        }
    }

    private Path storageRoot() {
        try {
            Path configured = Path.of(storageDirectory);
            if (!configured.isAbsolute()) {
                throw new VehicleImageUploadException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Vehicle photo storage must use an absolute directory outside the application.");
            }
            Path executableRoot = applicationExecutableRoot();
            Path configuredPath = configured.normalize();
            if (configuredPath.startsWith(executableRoot)) {
                throw new VehicleImageUploadException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Vehicle photo storage must be outside the application executable directory.");
            }
            Files.createDirectories(configuredPath);
            Path root = configuredPath.toRealPath();
            if (root.startsWith(executableRoot.toRealPath())) {
                throw new VehicleImageUploadException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Vehicle photo storage must be outside the application executable directory.");
            }
            return root;
        } catch (VehicleImageUploadException exception) {
            throw exception;
        } catch (IOException | InvalidPathException exception) {
            throw new VehicleImageUploadException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Vehicle photo storage is unavailable.", exception);
        }
    }

    private Path applicationExecutableRoot() {
        try {
            URL location = VehicleImageService.class.getProtectionDomain().getCodeSource().getLocation();
            Path codePath = Path.of(location.toURI()).toAbsolutePath().normalize();
            return Files.isRegularFile(codePath) ? codePath.getParent() : codePath;
        } catch (Exception exception) {
            throw new VehicleImageUploadException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "The application executable location could not be verified.", exception);
        }
    }
    private static VehicleImageUploadException unsupportedImage() {
        return new VehicleImageUploadException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Upload a valid JPEG, PNG, or WebP image.");
    }

    private static VehicleImageUploadException malformedImage() {
        return new VehicleImageUploadException(HttpStatus.BAD_REQUEST,
                "The uploaded image is malformed or unreadable.");
    }

    private static VehicleImageUploadException imageDimensionsExceeded() {
        return new VehicleImageUploadException(HttpStatus.CONTENT_TOO_LARGE,
                "Vehicle photos must be no larger than 6000 by 6000 pixels or 24 megapixels.");
    }

    private static void deleteQuietly(Path path) {
        if (path == null) return;
        try {
            Files.deleteIfExists(path);
        } catch (IOException exception) {
            LOGGER.log(Level.WARNING, "Could not remove an incomplete vehicle image file.", exception);
        }
    }
}

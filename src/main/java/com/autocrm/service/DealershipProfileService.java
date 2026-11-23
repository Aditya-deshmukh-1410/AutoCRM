package com.autocrm.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.autocrm.dto.DealershipProfileRequest;
import com.autocrm.dto.DealershipProfileResponse;
import com.autocrm.model.Tenant;
import com.autocrm.repository.TenantRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.TenantContext;

@Service
public class DealershipProfileService {
    private static final int MAX_LOGO_BYTES = 1_048_576;
    private final TenantRepository tenants;
    private final VehicleRepository vehicles;
    private final AuditLogService auditLogService;

    public DealershipProfileService(TenantRepository tenants, VehicleRepository vehicles, AuditLogService auditLogService) {
        this.tenants = tenants;
        this.vehicles = vehicles;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public DealershipProfileResponse getProfile() {
        return response(currentTenant());
    }

    @Transactional
    public DealershipProfileResponse updateProfile(DealershipProfileRequest request) {
        Tenant tenant = currentTenant();
        tenant.setName(request.name().trim());
        tenant.setEmail(request.email().trim());
        tenant.setPhone(request.phone().trim());
        tenant.setAddress(request.address() == null || request.address().isBlank() ? null : request.address().trim());
        tenants.save(tenant);
        auditLogService.record("DEALERSHIP_PROFILE_UPDATED", "TENANT", tenant.getTenantId(), "Dealership profile updated");
        return response(tenant);
    }

    @Transactional
    public DealershipProfileResponse updateLogo(MultipartFile upload) {
        Tenant tenant = currentTenant();
        if (upload == null || upload.isEmpty() || upload.getSize() > MAX_LOGO_BYTES) {
            throw new IllegalArgumentException("Choose a logo image up to 1 MB.");
        }
        try {
            byte[] bytes = upload.getBytes();
            if (bytes.length == 0 || bytes.length > MAX_LOGO_BYTES) {
                throw new IllegalArgumentException("Choose a logo image up to 1 MB.");
            }
            String contentType = detectImage(bytes);
            tenant.setLogo(bytes);
            tenant.setLogoContentType(contentType);
            tenants.save(tenant);
            auditLogService.record("DEALERSHIP_LOGO_UPDATED", "TENANT", tenant.getTenantId(), "Dealership logo updated");
            return response(tenant);
        } catch (IOException exception) {
            throw new IllegalArgumentException("The logo image could not be read.");
        }
    }

    @Transactional
    public DealershipProfileResponse removeLogo() {
        Tenant tenant = currentTenant();
        tenant.setLogo(null);
        tenant.setLogoContentType(null);
        tenants.save(tenant);
        auditLogService.record("DEALERSHIP_LOGO_REMOVED", "TENANT", tenant.getTenantId(), "Dealership logo removed");
        return response(tenant);
    }

    @Transactional(readOnly = true)
    public LogoContent publicLogoForVehicle(Long vehicleId) {
        Long tenantId = vehicles.findByVehicleIdAndPubliclyVisibleTrue(vehicleId)
                .map(vehicle -> vehicle.getTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Vehicle not found."));
        Tenant tenant = tenants.findById(tenantId).orElseThrow(() -> new IllegalArgumentException("Dealership not found."));
        if (tenant.getLogo() == null || !List.of("image/jpeg", "image/png", "image/webp").contains(tenant.getLogoContentType())) {
            throw new IllegalArgumentException("Dealership logo not found.");
        }
        return new LogoContent(tenant.getLogo(), tenant.getLogoContentType());
    }

    @Transactional(readOnly = true)
    public LogoContent currentLogo() {
        Tenant tenant = currentTenant();
        if (tenant.getLogo() == null || !List.of("image/jpeg", "image/png", "image/webp").contains(tenant.getLogoContentType())) {
            throw new IllegalArgumentException("Dealership logo not found.");
        }
        return new LogoContent(tenant.getLogo(), tenant.getLogoContentType());
    }

    private Tenant currentTenant() {
        Long tenantId = TenantContext.requireTenantId();
        return tenants.findById(tenantId).orElseThrow(() -> new IllegalArgumentException("Dealership not found."));
    }

    private DealershipProfileResponse response(Tenant tenant) {
        return new DealershipProfileResponse(tenant.getName(), tenant.getEmail(), tenant.getPhone(), tenant.getAddress(),
                tenant.getLogo() == null ? null : "/api/dealership-profile/logo");
    }

    private String detectImage(byte[] contents) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(contents))) {
            if (input == null) throw new IllegalArgumentException("Upload a valid JPEG, PNG, or WebP logo.");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new IllegalArgumentException("Upload a valid JPEG, PNG, or WebP logo.");
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                String type = switch (format) {
                    case "jpeg", "jpg" -> "image/jpeg";
                    case "png" -> "image/png";
                    case "webp" -> "image/webp";
                    default -> throw new IllegalArgumentException("Upload a valid JPEG, PNG, or WebP logo.");
                };
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width < 1 || height < 1 || width > 3000 || height > 3000 || (long) width * height > 4_000_000L) {
                    throw new IllegalArgumentException("Logo dimensions must be at most 3000 by 3000 pixels.");
                }
                BufferedImage decoded = reader.read(0);
                if (decoded == null) throw new IllegalArgumentException("The logo image is malformed.");
                decoded.flush();
                return type;
            } finally { reader.dispose(); }
        } catch (IOException exception) {
            throw new IllegalArgumentException("The logo image is malformed.");
        }
    }

    public record LogoContent(byte[] bytes, String contentType) {}
}

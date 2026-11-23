package com.autocrm.controller;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import com.autocrm.model.DealershipSiteImage;
import com.autocrm.repository.DealershipSiteImageRepository;
import com.autocrm.repository.DealershipSiteRepository;
import com.autocrm.service.AuditLogService;
import com.autocrm.security.TenantContext;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class DealershipSiteImageController {
    private final DealershipSiteImageRepository images;
    private final DealershipSiteRepository sites;
    private final AuditLogService auditLogService;
    public DealershipSiteImageController(DealershipSiteImageRepository images, DealershipSiteRepository sites,
            AuditLogService auditLogService) {
        this.images = images; this.sites = sites;
        this.auditLogService = auditLogService;
    }
    @PostMapping(value="/api/website/images", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String,String> upload(@RequestPart("file") MultipartFile file) throws IOException {
        if (file == null || file.isEmpty() || file.getSize() > 2_000_000 || file.getContentType() == null ||
                !java.util.Set.of("image/jpeg","image/png","image/webp").contains(file.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a JPG, PNG or WebP image under 2 MB");
        }
        byte[] data = file.getBytes();
        String contentType;
        try {
            contentType = com.autocrm.service.UploadedImageValidator.validate(data, file.getContentType(), 4000,
                    4_000_000L);
        } catch (IllegalArgumentException invalidImage) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, invalidImage.getMessage());
        }
        DealershipSiteImage image = new DealershipSiteImage();
        image.setId(UUID.randomUUID());
        image.setTenantId(TenantContext.requireTenantId());
        image.setContentType(contentType);
        image.setData(data);
        images.save(image);
        auditLogService.record("DEALERSHIP_SITE_IMAGE_UPLOADED", "TENANT", image.getTenantId(),
                "A dealership website image was uploaded.");
        return Map.of("url", "/public/site-images/" + image.getId());
    }
    @GetMapping("/api/website/images/{id}/preview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> preview(@PathVariable UUID id) {
        DealershipSiteImage image = images.findByIdAndTenantId(id, TenantContext.requireTenantId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return imageResponse(image);
    }

    @GetMapping("/public/site-images/{id}")
    public ResponseEntity<byte[]> image(@PathVariable UUID id) {
        DealershipSiteImage image = images.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String path = "/public/site-images/" + id;
        if (!sites.existsByTenantIdAndPublishedTrueAndConfigContaining(image.getTenantId(), path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return imageResponse(image);
    }

    private ResponseEntity<byte[]> imageResponse(DealershipSiteImage image) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.getContentType()))
                .cacheControl(CacheControl.noStore()).header("X-Content-Type-Options", "nosniff")
                .body(image.getData());
    }
}

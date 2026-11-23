package com.autocrm.controller;

import com.autocrm.dto.PublicSellCarRequest;
import com.autocrm.service.PublicWebsiteSellService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class PublicWebsiteSellController {
    private final PublicWebsiteSellService service;

    public PublicWebsiteSellController(PublicWebsiteSellService service) { this.service = service; }

    @GetMapping("/api/crm/sell-requests")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES')")
    public List<PublicWebsiteSellService.SellRequestItem> list() { return service.list(); }

    @PutMapping("/api/crm/sell-requests/{leadId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES')")
    public Map<String, String> updateStatus(@PathVariable Long leadId, @RequestBody Map<String, String> body) {
        service.updateStatus(leadId, body.get("status"));
        return Map.of("message", "Sell request status updated");
    }

    @PostMapping(value = "/public/{slug}/sell-car", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> submit(@PathVariable String slug,
            @Valid @RequestPart("data") PublicSellCarRequest data,
            @RequestPart(value = "photos", required = false) List<MultipartFile> photos) {
        service.submit(slug, data, photos);
        return ResponseEntity.status(201).body(Map.of("message", "Car details submitted"));
    }

    @GetMapping("/api/website/sell-requests/{leadId}/photos")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES')")
    public List<PublicWebsiteSellService.PhotoInfo> photos(@PathVariable Long leadId) {
        return service.photosForLead(leadId);
    }

    @GetMapping("/api/website/sell-requests/{leadId}/photos/{photoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES')")
    public ResponseEntity<byte[]> photo(@PathVariable Long leadId, @PathVariable UUID photoId) {
        PublicWebsiteSellService.PhotoContent photo = service.photo(leadId, photoId);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(photo.contentType())).body(photo.data());
    }
}

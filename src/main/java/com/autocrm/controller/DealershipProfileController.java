package com.autocrm.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.autocrm.dto.DealershipProfileRequest;
import com.autocrm.dto.DealershipProfileResponse;
import com.autocrm.service.DealershipProfileService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/dealership-profile")
public class DealershipProfileController {
    private final DealershipProfileService service;
    public DealershipProfileController(DealershipProfileService service) { this.service = service; }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES')")
    public DealershipProfileResponse getProfile() { return service.getProfile(); }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public DealershipProfileResponse updateProfile(@Valid @RequestBody DealershipProfileRequest request) {
        return service.updateProfile(request);
    }

    @PostMapping("/logo")
    @PreAuthorize("hasRole('ADMIN')")
    public DealershipProfileResponse uploadLogo(@RequestPart("file") MultipartFile file) {
        return service.updateLogo(file);
    }

    @DeleteMapping("/logo")
    @PreAuthorize("hasRole('ADMIN')")
    public DealershipProfileResponse removeLogo() { return service.removeLogo(); }

    @GetMapping("/logo")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES')")
    public ResponseEntity<byte[]> getLogo() {
        DealershipProfileService.LogoContent logo = service.currentLogo();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(logo.contentType())).body(logo.bytes());
    }
}

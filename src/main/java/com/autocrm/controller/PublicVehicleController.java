package com.autocrm.controller;

import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import jakarta.validation.Valid;
import com.autocrm.dto.PublicVehicleEnquiryRequest;
import com.autocrm.dto.PublicVehicleEnquiryResponse;
import com.autocrm.dto.PublicTestDriveBookingRequest;
import com.autocrm.dto.PublicTestDriveBookingResponse;
import com.autocrm.service.PublicVehicleEnquiryService;
import com.autocrm.service.PublicTestDriveBookingService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.autocrm.dto.PublicVehicleImageResponse;
import com.autocrm.dto.PublicVehicleResponse;
import com.autocrm.service.VehicleImageService;
import com.autocrm.service.VehicleService;
import com.autocrm.service.DealershipProfileService;

@RestController
@RequestMapping("/api/public/vehicles")
public class PublicVehicleController {

    private final VehicleService vehicleService;
    private final VehicleImageService vehicleImageService;
    private final PublicVehicleEnquiryService publicVehicleEnquiryService;
    private final DealershipProfileService dealershipProfileService;
    private final PublicTestDriveBookingService publicTestDriveBookingService;

    public PublicVehicleController(VehicleService vehicleService, VehicleImageService vehicleImageService,
            PublicVehicleEnquiryService publicVehicleEnquiryService, DealershipProfileService dealershipProfileService,
            PublicTestDriveBookingService publicTestDriveBookingService) {
        this.vehicleService = vehicleService;
        this.vehicleImageService = vehicleImageService;
        this.publicVehicleEnquiryService = publicVehicleEnquiryService;
        this.dealershipProfileService = dealershipProfileService;
        this.publicTestDriveBookingService = publicTestDriveBookingService;
    }

    @PostMapping("/{vehicleId}/enquiries")
    @ResponseStatus(HttpStatus.CREATED)
    public PublicVehicleEnquiryResponse submitEnquiry(@PathVariable Long vehicleId,
            @Valid @RequestBody PublicVehicleEnquiryRequest request) {
        return publicVehicleEnquiryService.submit(vehicleId, request);
    }

    @PostMapping("/{vehicleId}/test-drives")
    @ResponseStatus(HttpStatus.CREATED)
    public PublicTestDriveBookingResponse bookTestDrive(@PathVariable Long vehicleId,
            @Valid @RequestBody PublicTestDriveBookingRequest request) {
        return publicTestDriveBookingService.submit(vehicleId, request);
    }

    @GetMapping
    public List<PublicVehicleResponse> getPublishedVehicles() {
        return vehicleService.getPublishedVehicles();
    }

    @GetMapping("/{vehicleId}/dealership-logo")
    public ResponseEntity<byte[]> getPublishedDealershipLogo(@PathVariable Long vehicleId) {
        DealershipProfileService.LogoContent logo = dealershipProfileService.publicLogoForVehicle(vehicleId);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(logo.contentType())).body(logo.bytes());
    }

    @GetMapping("/{vehicleId}/images")
    public ResponseEntity<List<PublicVehicleImageResponse>> getPublishedVehicleImages(@PathVariable Long vehicleId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(vehicleImageService.getPublicImages(vehicleId));
    }

    @GetMapping("/{vehicleId}/images/{imageId}")
    public ResponseEntity<byte[]> getPublishedVehicleImage(
            @PathVariable Long vehicleId, @PathVariable Long imageId) {
        VehicleImageService.VehicleImageContent image = vehicleImageService.getPublicImageContent(vehicleId, imageId);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(image.contentType()))
                .body(image.bytes());
    }
}

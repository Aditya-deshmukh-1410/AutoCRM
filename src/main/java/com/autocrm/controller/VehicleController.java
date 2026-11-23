package com.autocrm.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.multipart.MultipartFile;
import com.autocrm.dto.VehicleImageResponse;
import com.autocrm.dto.VehiclePublicationRequest;
import com.autocrm.service.VehicleImageService;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.autocrm.model.Vehicle;
import com.autocrm.service.VehicleService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;
    private final VehicleImageService vehicleImageService;

    public VehicleController(VehicleService vehicleService, VehicleImageService vehicleImageService) {
        this.vehicleService = vehicleService;
        this.vehicleImageService = vehicleImageService;
    }

    @PostMapping(value = "/{vehicleId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleImageResponse uploadVehicleImage(@PathVariable Long vehicleId,
            @RequestPart("file") MultipartFile file) {
        return new VehicleImageResponse(vehicleImageService.upload(vehicleId, file));
    }

    @GetMapping("/{vehicleId}/images")
    public List<VehicleImageResponse> getVehicleImages(@PathVariable Long vehicleId) {
        return vehicleImageService.getImages(vehicleId).stream().map(VehicleImageResponse::new).toList();
    }

    @GetMapping("/{vehicleId}/images/{imageId}")
    public ResponseEntity<byte[]> getVehicleImage(@PathVariable Long vehicleId, @PathVariable Long imageId) {
        VehicleImageService.VehicleImageContent image = vehicleImageService.getImageContent(vehicleId, imageId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(image.contentType()))
                .body(image.bytes());
    }

    @DeleteMapping("/{vehicleId}/images/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteVehicleImage(@PathVariable Long vehicleId, @PathVariable Long imageId) {
        vehicleImageService.deleteImage(vehicleId, imageId);
    }

    @PostMapping
    public Vehicle createVehicle(@Valid @RequestBody Vehicle vehicle) {
        return vehicleService.createVehicle(vehicle);
    }

    @GetMapping
    public List<Vehicle> getAllVehicles() {
        return vehicleService.getAllVehicles();
    }

    @GetMapping("/{vehicleId}")
    public Vehicle getVehicleById(@PathVariable Long vehicleId) {
        return vehicleService.getVehicleById(vehicleId);
    }

    @PutMapping("/{vehicleId}/publication")
    public Vehicle updateVehiclePublication(@PathVariable Long vehicleId,
            @Valid @RequestBody VehiclePublicationRequest request) {
        return vehicleService.setVehiclePubliclyVisible(vehicleId, request.publiclyVisible());
    }

    @PutMapping("/{vehicleId}")
    public Vehicle updateVehicle(@PathVariable Long vehicleId, @Valid @RequestBody Vehicle vehicle) {

        return vehicleService.updateVehicle(vehicleId, vehicle);
    }

    @DeleteMapping("/{vehicleId}")
    public String deleteVehicle(@PathVariable Long vehicleId) {

        vehicleService.deleteVehicle(vehicleId);

        return "Vehicle deleted successfully";
    }
}

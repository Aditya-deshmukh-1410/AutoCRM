package com.autocrm.dto;

import java.time.Instant;

import com.autocrm.model.VehicleImage;

public class VehicleImageResponse {

    private final Long vehicleImageId;
    private final String contentType;
    private final Long fileSize;
    private final Instant createdAt;

    public VehicleImageResponse(VehicleImage image) {
        this.vehicleImageId = image.getVehicleImageId();
        this.contentType = image.getContentType();
        this.fileSize = image.getFileSize();
        this.createdAt = image.getCreatedAt();
    }

    public Long getVehicleImageId() { return vehicleImageId; }
    public String getContentType() { return contentType; }
    public Long getFileSize() { return fileSize; }
    public Instant getCreatedAt() { return createdAt; }
}

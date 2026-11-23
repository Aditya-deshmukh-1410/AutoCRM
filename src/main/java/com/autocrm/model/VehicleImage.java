package com.autocrm.model;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Entity
@Table(name = "vehicle_image")
public class VehicleImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long vehicleImageId;

    @NotNull
    @Column(nullable = false, updatable = false)
    private Long vehicleId;

    @NotNull
    @Column(nullable = false, updatable = false)
    private Long tenantId;

    @NotBlank
    @Column(nullable = false, unique = true, updatable = false, length = 255)
    private String storageFilename;

    @NotBlank
    @Column(nullable = false, updatable = false, length = 100)
    private String contentType;

    @NotNull
    @Positive
    @Column(nullable = false, updatable = false)
    private Long fileSize;

    @NotNull
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected VehicleImage() {
    }

    public VehicleImage(Long vehicleId, Long tenantId, String contentType, Long fileSize) {
        this.vehicleId = vehicleId;
        this.tenantId = tenantId;
        this.storageFilename = UUID.randomUUID().toString();
        this.contentType = contentType;
        this.fileSize = fileSize;
    }

    public Long getVehicleImageId() {
        return vehicleImageId;
    }

    public Long getVehicleId() {
        return vehicleId;
    }

    public Long getTenantId() {
        return tenantId;
    }

    public String getStorageFilename() {
        return storageFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @PrePersist
    private void setCreatedAtIfMissing() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}

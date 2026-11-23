package com.autocrm.model;

import java.time.LocalDateTime;

import com.autocrm.validation.ValidTestDriveStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Entity
public class TestDrive {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long testDriveId;

    @NotNull(message = "Customer ID is required")
    @Positive(message = "Customer ID must be positive")
    @Column(nullable = false)
    private Long customerId;

    @NotNull(message = "Vehicle ID is required")
    @Positive(message = "Vehicle ID must be positive")
    @Column(nullable = false)
    private Long vehicleId;

    @NotNull(message = "Scheduled date and time is required")
    @Column(nullable = false)
    private LocalDateTime scheduledDateTime;

    @NotNull(message = "Status is required")
    @ValidTestDriveStatus
    @Column(nullable = false)
    private String status;

    private String notes;

    @Column(nullable = false)
    private Long tenantId;

    private Long assignedUserId;

    public Long getTestDriveId() {
        return testDriveId;
    }

    public void setTestDriveId(Long testDriveId) {
        this.testDriveId = testDriveId;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public Long getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(Long vehicleId) {
        this.vehicleId = vehicleId;
    }

    public LocalDateTime getScheduledDateTime() {
        return scheduledDateTime;
    }

    public void setScheduledDateTime(LocalDateTime scheduledDateTime) {
        this.scheduledDateTime = scheduledDateTime;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Long getTenantId() {
        return tenantId;
    }

    public Long getAssignedUserId() { return assignedUserId; }

    public void setAssignedUserId(Long assignedUserId) { this.assignedUserId = assignedUserId; }

    public void setTenantId(Long tenantId) {
        this.tenantId = tenantId;
    }
}

package com.autocrm.model;

import com.autocrm.validation.ValidLeadStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Entity
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long leadId;

    @NotBlank(message = "Source is required")
    @Column(nullable = false)
    private String source;

    @NotBlank(message = "Status is required")
    @ValidLeadStatus
    @Column(nullable = false)
    private String status;

    @NotBlank(message = "Interested vehicle is required")
    @Column(nullable = false)
    private String interestedVehicle;

    @Column(columnDefinition = "text")
    private String notes;

    @NotNull(message = "Customer ID is required")
    @Positive(message = "Customer ID must be positive")
    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false)
    private Long tenantId;

    private Long assignedUserId;

    public Long getLeadId() {
        return leadId;
    }

    public void setLeadId(Long leadId) {
        this.leadId = leadId;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getInterestedVehicle() {
        return interestedVehicle;
    }

    public void setInterestedVehicle(String interestedVehicle) {
        this.interestedVehicle = interestedVehicle;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
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

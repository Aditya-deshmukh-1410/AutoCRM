package com.autocrm.model;

import java.math.BigDecimal;

import com.autocrm.validation.ValidFuelType;
import com.autocrm.validation.ValidTransmission;
import com.autocrm.validation.ValidVehicleStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long vehicleId;

    @NotBlank(message = "Make is required")
    @Column(nullable = false)
    private String make;

    @NotBlank(message = "Model is required")
    @Column(nullable = false)
    private String model;

    private String variant;

    @Column(length = 60)
    @Size(max = 60, message = "Category must be 60 characters or fewer")
    private String category;

    @Size(max = 30, message = "Body type must be 30 characters or fewer")
    @Column(length = 30)
    private String bodyType;

    @Size(max = 30, message = "Owner type must be 30 characters or fewer")
    @Column(length = 30)
    private String ownerType;

    @NotNull(message = "Year is required")
    @Min(value = 1900, message = "Invalid vehicle year")
    @Column(nullable = false)
    private Integer year;

    @NotBlank(message = "Fuel type is required")
    @ValidFuelType
    @Column(nullable = false)
    private String fuelType;

    @NotBlank(message = "Transmission is required")
    @ValidTransmission
    @Column(nullable = false)
    private String transmission;

    @NotNull(message = "Kilometers is required")
    @Min(value = 0, message = "Kilometers cannot be negative")
    @Column(nullable = false)
    private Integer kilometers;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than zero")
    @Column(nullable = false)
    private BigDecimal price;

    private String color;

    @Size(max = 2000, message = "Description must be 2000 characters or fewer")
    @Column(length = 2000)
    private String description;

    @NotBlank(message = "Registration number is required")
    @Column(nullable = false)
    private String registrationNumber;

    @Size(max = 50, message = "Registration location must be 50 characters or fewer")
    @Column(length = 50)
    private String registrationAt;

    @Size(max = 30, message = "Registration type must be 30 characters or fewer")
    @Column(length = 30)
    private String registrationType;

    @Size(max = 30, message = "Insurance type must be 30 characters or fewer")
    @Column(length = 30)
    private String insuranceType;

    @Size(max = 3000, message = "Seller note must be 3000 characters or fewer")
    @Column(length = 3000)
    private String sellerNote;

    @NotBlank(message = "Status is required")
    @ValidVehicleStatus
    @Column(nullable = false)
    private String status;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean publiclyVisible = false;

    @Column(nullable = false)
    private Long tenantId;

    public Long getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(Long vehicleId) {
        this.vehicleId = vehicleId;
    }

    public String getMake() {
        return make;
    }

    public void setMake(String make) {
        this.make = make;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getVariant() {
        return variant;
    }

    public void setVariant(String variant) {
        this.variant = variant;
    }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getBodyType() { return bodyType; }
    public void setBodyType(String bodyType) { this.bodyType = bodyType; }

    public String getOwnerType() { return ownerType; }
    public void setOwnerType(String ownerType) { this.ownerType = ownerType; }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public String getFuelType() {
        return fuelType;
    }

    public void setFuelType(String fuelType) {
        this.fuelType = fuelType;
    }

    public String getTransmission() {
        return transmission;
    }

    public void setTransmission(String transmission) {
        this.transmission = transmission;
    }

    public Integer getKilometers() {
        return kilometers;
    }

    public void setKilometers(Integer kilometers) {
        this.kilometers = kilometers;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    public String getRegistrationAt() { return registrationAt; }
    public void setRegistrationAt(String registrationAt) { this.registrationAt = registrationAt; }

    public String getRegistrationType() { return registrationType; }
    public void setRegistrationType(String registrationType) { this.registrationType = registrationType; }

    public String getInsuranceType() { return insuranceType; }
    public void setInsuranceType(String insuranceType) { this.insuranceType = insuranceType; }

    public String getSellerNote() { return sellerNote; }
    public void setSellerNote(String sellerNote) { this.sellerNote = sellerNote; }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isPubliclyVisible() {
        return publiclyVisible;
    }

    public void setPubliclyVisible(boolean publiclyVisible) {
        this.publiclyVisible = publiclyVisible;
    }

    public Long getTenantId() {
        return tenantId;
    }

    public void setTenantId(Long tenantId) {
        this.tenantId = tenantId;
    }
}

package com.autocrm.dto;

import java.math.BigDecimal;

public record PublicVehicleResponse(
        Long vehicleId,
        String make,
        String model,
        String variant,
        Integer year,
        BigDecimal price,
        Integer kilometers,
        String fuelType,
        String transmission,
        String color,
        String status,
        String dealershipName,
        String dealershipLogoUrl,
        String category,
        String bodyType,
        String ownerType,
        String description,
        String registrationAt,
        String registrationType,
        String insuranceType,
        String sellerNote) {
}

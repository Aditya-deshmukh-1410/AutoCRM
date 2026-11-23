package com.autocrm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record PublicSellCarRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 30) String phone,
        @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 50) String carMake,
        @NotBlank @Size(max = 50) String carModel,
        @Size(max = 100) String carVariant,
        @Min(1990) @Max(2035) int carYear,
        @Min(1) @Max(12) Integer regMonth,
        @Size(max = 30) String ownerType,
        @Size(max = 30) String color,
        @NotBlank @Size(max = 60) String city,
        @Size(max = 20) String registrationNo,
        @Size(max = 50) String registrationAt,
        @PositiveOrZero Integer kmDriven,
        @Size(max = 30) String insuranceType,
        @Size(max = 30) String lifetimeTax,
        LocalDate insuranceValidTill,
        Boolean accidental,
        Boolean floodAffected,
        @PositiveOrZero BigDecimal expectedPrice,
        @Size(max = 50) List<@Size(max = 60) String> features,
        @Size(max = 30) Map<@Size(max = 60) String, @Size(max = 30) String> condition,
        @Size(max = 1000) String warranties,
        @Size(max = 1000) String modifications,
        @Size(max = 2000) String sellerNote) {}

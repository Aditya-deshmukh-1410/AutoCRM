package com.autocrm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PublicVehicleEnquiryRequest(
        @NotBlank(message = "Name is required") @Size(max = 120, message = "Name must be 120 characters or fewer") String name,
        @NotBlank(message = "Phone is required") @Size(max = 30, message = "Phone must be 30 characters or fewer") String phone,
        @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") @Size(max = 254, message = "Email must be 254 characters or fewer") String email) {
}
package com.autocrm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TenantOnboardingRequest(
        @NotBlank(message = "Dealership name is required") @Size(max = 255) String dealershipName,
        @Email(message = "Enter a valid contact email") @Size(max = 255) String contactEmail,
        @Size(max = 255) String phone,
        @Size(max = 500) String address,
        @NotBlank(message = "Initial administrator name is required") @Size(max = 255) String adminName,
        @NotBlank(message = "Initial administrator email is required") @Email(message = "Enter a valid administrator email") @Size(max = 255) String adminEmail,
        @NotBlank(message = "Initial administrator password is required") String initialPassword) {
}

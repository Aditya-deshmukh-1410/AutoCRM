package com.autocrm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TenantMetadataRequest(
        @NotBlank(message = "Dealership name is required") @Size(max = 255) String name,
        @Email(message = "Enter a valid contact email") @Size(max = 255) String email,
        @Size(max = 255) String phone,
        @Size(max = 500) String address) {
}

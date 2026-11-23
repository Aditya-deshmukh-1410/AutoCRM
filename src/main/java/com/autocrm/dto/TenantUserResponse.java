package com.autocrm.dto;

public record TenantUserResponse(Long userId, String name, String email, String role) {
}

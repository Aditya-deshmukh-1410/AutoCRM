package com.autocrm.dto;

public class LoginResponse {

    private Long userId;
    private String name;
    private String email;
    private String role;
    private Long tenantId;

    public LoginResponse(Long userId, String name, String email, String role, Long tenantId) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.tenantId = tenantId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public Long getTenantId() {
        return tenantId;
    }
}
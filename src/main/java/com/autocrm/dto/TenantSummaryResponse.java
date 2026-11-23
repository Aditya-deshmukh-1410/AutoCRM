package com.autocrm.dto;

public record TenantSummaryResponse(Long tenantId, String name, String email, String phone, String address,
        long userCount, long adminCount) {
}

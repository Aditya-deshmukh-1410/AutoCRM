package com.autocrm.dto;

import java.util.List;

public record TenantDetailResponse(Long tenantId, String name, String email, String phone, String address,
        List<TenantUserResponse> users) {
}

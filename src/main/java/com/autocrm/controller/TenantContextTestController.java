package com.autocrm.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.autocrm.security.TenantContext;

@RestController
public class TenantContextTestController {

    @GetMapping("/api/tenant-context")
    public String getTenantContext() {

        Long tenantId = TenantContext.getTenantId();

        return "Current Tenant ID: " + tenantId;
    }
}
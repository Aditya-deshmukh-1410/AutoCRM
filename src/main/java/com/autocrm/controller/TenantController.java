package com.autocrm.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.autocrm.dto.PlatformMetricsResponse;
import com.autocrm.dto.TenantDetailResponse;
import com.autocrm.dto.TenantMetadataRequest;
import com.autocrm.dto.TenantOnboardingRequest;
import com.autocrm.dto.TenantSummaryResponse;
import com.autocrm.service.TenantService;

@RestController
@RequestMapping("/api/tenants")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class TenantController {

    private final TenantService tenantService;

    public TenantController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TenantDetailResponse onboardDealership(@Valid @RequestBody TenantOnboardingRequest request) {
        return tenantService.onboardDealership(request);
    }

    @GetMapping("/metrics")
    public PlatformMetricsResponse getMetrics() {
        return tenantService.getMetrics();
    }

    @GetMapping
    public List<TenantSummaryResponse> getAllTenants(@RequestParam(required = false) String search) {
        return tenantService.getAllTenants(search);
    }

    @GetMapping("/{tenantId}")
    public TenantDetailResponse getTenantById(@PathVariable Long tenantId) {
        return tenantService.getTenantById(tenantId);
    }

    @PutMapping("/{tenantId}")
    public TenantDetailResponse updateTenant(@PathVariable Long tenantId,
            @Valid @RequestBody TenantMetadataRequest request) {
        return tenantService.updateTenant(tenantId, request);
    }
}

package com.autocrm.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.autocrm.dto.DealershipOptionRequest;
import com.autocrm.dto.DealershipOptionResponse;
import com.autocrm.service.DealershipSettingsService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/dealership-settings")
public class DealershipSettingsController {
    private final DealershipSettingsService service;
    public DealershipSettingsController(DealershipSettingsService service) { this.service = service; }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES')")
    public List<DealershipOptionResponse> getOptions() { return service.getOptions(); }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public DealershipOptionResponse addOption(@Valid @RequestBody DealershipOptionRequest request) {
        return service.addOption(request);
    }

    @PutMapping("/{optionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public DealershipOptionResponse updateOption(@PathVariable Long optionId,
            @Valid @RequestBody DealershipOptionRequest request) {
        return service.updateOption(optionId, request);
    }

    @DeleteMapping("/{optionId}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeOption(@PathVariable Long optionId) { service.removeOption(optionId); }
}

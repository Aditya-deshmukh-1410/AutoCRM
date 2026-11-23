package com.autocrm.service;

import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.dto.DealershipOptionRequest;
import com.autocrm.dto.DealershipOptionResponse;
import com.autocrm.model.DealershipOption;
import com.autocrm.model.DealershipOptionType;
import com.autocrm.repository.DealershipOptionRepository;
import com.autocrm.security.TenantContext;

@Service
public class DealershipSettingsService {
    private static final long MAX_ACTIVE_OPTIONS_PER_TYPE = 25;
    private static final Map<DealershipOptionType, List<String>> DEFAULTS = Map.of(
            DealershipOptionType.LEAD_SOURCE, List.of("Phone", "Website", "Walk-in", "Referral"),
            DealershipOptionType.VEHICLE_CATEGORY, List.of("Car", "SUV", "Hatchback", "Van", "Truck", "Other"));

    private final DealershipOptionRepository repository;
    private final AuditLogService auditLogService;

    public DealershipSettingsService(DealershipOptionRepository repository, AuditLogService auditLogService) {
        this.repository = repository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public List<DealershipOptionResponse> getOptions() {
        Long tenantId = TenantContext.requireTenantId();
        for (var entry : DEFAULTS.entrySet()) {
            if (repository.findByTenantIdAndOptionType(tenantId, entry.getKey()).isEmpty()) {
                repository.saveAll(entry.getValue().stream()
                        .map(value -> new DealershipOption(tenantId, entry.getKey(), value)).toList());
            }
        }
        return repository.findByTenantIdOrderByOptionTypeAscValueAsc(tenantId).stream()
                .map(DealershipOptionResponse::new).toList();
    }

    @Transactional
    public DealershipOptionResponse addOption(DealershipOptionRequest request) {
        Long tenantId = TenantContext.requireTenantId();
        String value = normalized(request.value());
        requireCapacity(tenantId, request.optionType());
        rejectDuplicate(tenantId, request.optionType(), value, null);
        DealershipOption option = repository.saveAndFlush(new DealershipOption(tenantId, request.optionType(), value));
        auditLogService.record("DEALERSHIP_OPTION_ADDED", "TENANT", tenantId,
                request.optionType() + " option added: " + value);
        return new DealershipOptionResponse(option);
    }

    @Transactional
    public DealershipOptionResponse updateOption(Long optionId, DealershipOptionRequest request) {
        Long tenantId = TenantContext.requireTenantId();
        DealershipOption option = repository.findByOptionIdAndTenantId(optionId, tenantId)
                .orElseThrow(() -> new RuntimeException("Setting option not found."));
        if (request.optionType() != option.getOptionType()) {
            throw new IllegalArgumentException("An option cannot be changed to a different setting type.");
        }
        String value = normalized(request.value());
        rejectDuplicate(tenantId, option.getOptionType(), value, optionId);
        if (!option.isActive() && (request.active() == null || request.active())) {
            requireCapacity(tenantId, option.getOptionType());
        }
        if (option.isActive() && Boolean.FALSE.equals(request.active())) {
            requireAnotherActiveOption(tenantId, option.getOptionType());
        }
        option.setValue(value);
        option.setActive(request.active() == null || request.active());
        DealershipOption saved = repository.saveAndFlush(option);
        auditLogService.record("DEALERSHIP_OPTION_UPDATED", "TENANT", tenantId,
                saved.getOptionType() + " option updated: " + value);
        return new DealershipOptionResponse(saved);
    }

    @Transactional
    public void removeOption(Long optionId) {
        Long tenantId = TenantContext.requireTenantId();
        DealershipOption option = repository.findByOptionIdAndTenantId(optionId, tenantId)
                .orElseThrow(() -> new RuntimeException("Setting option not found."));
        if (option.isActive()) {
            requireAnotherActiveOption(tenantId, option.getOptionType());
            option.setActive(false);
            repository.save(option);
            auditLogService.record("DEALERSHIP_OPTION_REMOVED", "TENANT", tenantId,
                    option.getOptionType() + " option retired: " + option.getValue());
        }
    }

    private void rejectDuplicate(Long tenantId, DealershipOptionType type, String normalizedValue, Long optionId) {
        boolean duplicate = optionId == null
                ? repository.existsByTenantIdAndOptionTypeAndNormalizedValue(tenantId, type, normalizedValue)
                : repository.existsByTenantIdAndOptionTypeAndNormalizedValueAndOptionIdNot(tenantId, type,
                        normalizedValue, optionId);
        if (duplicate) throw new IllegalArgumentException("An option with this name already exists.");
    }

    private void requireCapacity(Long tenantId, DealershipOptionType type) {
        if (repository.countByTenantIdAndOptionTypeAndActiveTrue(tenantId, type) >= MAX_ACTIVE_OPTIONS_PER_TYPE) {
            throw new IllegalArgumentException("A dealership can have no more than 25 active options of this type.");
        }
    }

    private void requireAnotherActiveOption(Long tenantId, DealershipOptionType type) {
        if (repository.countByTenantIdAndOptionTypeAndActiveTrue(tenantId, type) <= 1) {
            throw new IllegalArgumentException("Keep at least one active option of this type for new records.");
        }
    }

    private String normalized(String value) {
        if (value == null || value.isBlank() || value.trim().length() > 60) {
            throw new IllegalArgumentException("Option name must contain 1 to 60 characters.");
        }
        return value.trim();
    }
}

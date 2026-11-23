package com.autocrm.service;

import java.util.List;
import java.util.Locale;
import java.util.Objects;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.autocrm.dto.PlatformMetricsResponse;
import com.autocrm.dto.TenantDetailResponse;
import com.autocrm.dto.TenantMetadataRequest;
import com.autocrm.dto.TenantOnboardingRequest;
import com.autocrm.dto.TenantSummaryResponse;
import com.autocrm.dto.TenantUserResponse;
import com.autocrm.exception.BusinessException;
import com.autocrm.model.AppUser;
import com.autocrm.model.Tenant;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.TenantRepository;

@Service
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class TenantService {

    private final TenantRepository tenantRepository;
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public TenantService(TenantRepository tenantRepository, AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder) {
        this.tenantRepository = tenantRepository;
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public TenantDetailResponse onboardDealership(TenantOnboardingRequest request) {
        String adminEmail = normalizeEmail(request.adminEmail());
        if (appUserRepository.findByEmailIgnoreCase(adminEmail).isPresent()) {
            throw new BusinessException("An account with the initial administrator email already exists");
        }

        Tenant tenant = new Tenant();
        tenant.setName(request.dealershipName().trim());
        tenant.setEmail(normalizeOptionalEmail(request.contactEmail()));
        tenant.setPhone(normalizeOptional(request.phone()));
        tenant.setAddress(normalizeOptional(request.address()));

        try {
            Tenant savedTenant = tenantRepository.saveAndFlush(tenant);
            AppUser initialAdmin = new AppUser();
            initialAdmin.setName(request.adminName().trim());
            initialAdmin.setEmail(adminEmail);
            initialAdmin.setPassword(passwordEncoder.encode(request.initialPassword()));
            initialAdmin.setRole("ADMIN");
            initialAdmin.setTenantId(savedTenant.getTenantId());
            appUserRepository.saveAndFlush(initialAdmin);
            return toDetail(savedTenant, List.of(initialAdmin));
        } catch (DataIntegrityViolationException exception) {
            throw new BusinessException("Dealership or initial administrator could not be provisioned; verify the email is unique");
        }
    }

    @Transactional(readOnly = true)
    public PlatformMetricsResponse getMetrics() {
        return new PlatformMetricsResponse(tenantRepository.count(),
                appUserRepository.countDealershipUsersByRole("ADMIN"),
                appUserRepository.countDealershipUsersByRole("SALES"));
    }

    @Transactional(readOnly = true)
    public List<TenantSummaryResponse> getAllTenants(String search) {
        String query = StringUtils.hasText(search) ? search.trim().toLowerCase(Locale.ROOT) : null;
        return tenantRepository.findAll(Sort.by(Sort.Direction.DESC, "tenantId")).stream()
                .filter(tenant -> query == null || matches(tenant, query))
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public TenantDetailResponse getTenantById(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Dealership not found"));
        return toDetail(tenant, appUserRepository.findByTenantId(tenantId));
    }

    @Transactional
    public TenantDetailResponse updateTenant(Long tenantId, TenantMetadataRequest request) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Dealership not found"));
        tenant.setName(request.name().trim());
        tenant.setEmail(normalizeOptionalEmail(request.email()));
        tenant.setPhone(normalizeOptional(request.phone()));
        tenant.setAddress(normalizeOptional(request.address()));
        Tenant saved = tenantRepository.save(tenant);
        return toDetail(saved, appUserRepository.findByTenantId(tenantId));
    }

    private TenantSummaryResponse toSummary(Tenant tenant) {
        List<AppUser> users = appUserRepository.findByTenantId(tenant.getTenantId());
        long admins = users.stream().filter(user -> "ADMIN".equalsIgnoreCase(user.getRole())).count();
        return new TenantSummaryResponse(tenant.getTenantId(), tenant.getName(), tenant.getEmail(), tenant.getPhone(),
                tenant.getAddress(), users.size(), admins);
    }

    private TenantDetailResponse toDetail(Tenant tenant, List<AppUser> users) {
        List<TenantUserResponse> userResponses = users.stream()
                .map(user -> new TenantUserResponse(user.getUserId(), user.getName(), user.getEmail(), user.getRole()))
                .toList();
        return new TenantDetailResponse(tenant.getTenantId(), tenant.getName(), tenant.getEmail(), tenant.getPhone(),
                tenant.getAddress(), userResponses);
    }

    private boolean matches(Tenant tenant, String query) {
        return contains(tenant.getName(), query) || contains(tenant.getEmail(), query)
                || contains(tenant.getPhone(), query) || contains(tenant.getAddress(), query)
                || Objects.toString(tenant.getTenantId(), "").contains(query);
    }

    private boolean contains(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeOptional(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String normalizeOptionalEmail(String value) {
        return StringUtils.hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : null;
    }
}

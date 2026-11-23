package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.autocrm.dto.TenantOnboardingRequest;
import com.autocrm.exception.BusinessException;
import com.autocrm.model.AppUser;
import com.autocrm.model.Tenant;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.TenantRepository;

class TenantServiceTest {

    @Mock TenantRepository tenants;
    @Mock AppUserRepository users;
    @Mock PasswordEncoder passwordEncoder;
    TenantService service;

    @BeforeEach
    void setUp() { MockitoAnnotations.openMocks(this); service = new TenantService(tenants, users, passwordEncoder); }

    @Test
    void onboardingCreatesTenantAndHashedTenantScopedAdmin() {
        when(users.findByEmailIgnoreCase("admin@example.test")).thenReturn(Optional.empty());
        when(tenants.saveAndFlush(any(Tenant.class))).thenAnswer(invocation -> {
            Tenant tenant = invocation.getArgument(0); tenant.setTenantId(71L); return tenant;
        });
        when(passwordEncoder.encode("initial-password")).thenReturn("$2a$encoded-hash");
        when(users.saveAndFlush(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.onboardDealership(new TenantOnboardingRequest(" North Dealer ", "CONTACT@EXAMPLE.TEST",
                " 12345 ", " Main Street ", " First Admin ", " ADMIN@EXAMPLE.TEST ", "initial-password"));

        ArgumentCaptor<Tenant> tenantCaptor = ArgumentCaptor.forClass(Tenant.class);
        ArgumentCaptor<AppUser> userCaptor = ArgumentCaptor.forClass(AppUser.class);
        verify(tenants).saveAndFlush(tenantCaptor.capture());
        verify(users).saveAndFlush(userCaptor.capture());
        Tenant tenant = tenantCaptor.getValue();
        AppUser admin = userCaptor.getValue();
        assertEquals("North Dealer", tenant.getName());
        assertEquals("contact@example.test", tenant.getEmail());
        assertEquals(71L, admin.getTenantId());
        assertEquals("ADMIN", admin.getRole());
        assertEquals("admin@example.test", admin.getEmail());
        assertEquals("$2a$encoded-hash", admin.getPassword());
        assertEquals("ADMIN", result.users().get(0).role());
        assertTrue(!result.toString().contains("initial-password"));
    }

    @Test
    void duplicateAdministratorEmailDoesNotCreateTenantOrUser() {
        when(users.findByEmailIgnoreCase("used@example.test")).thenReturn(Optional.of(new AppUser()));
        assertThrows(BusinessException.class, () -> service.onboardDealership(new TenantOnboardingRequest(
                "Dealer", null, null, null, "Admin", "used@example.test", "secret")));
        verify(tenants, never()).saveAndFlush(any(Tenant.class));
        verify(users, never()).saveAndFlush(any(AppUser.class));
    }

    @Test
    void concurrentDuplicateConstraintFailureIsReturnedAsConflict() {
        when(users.findByEmailIgnoreCase("used@example.test")).thenReturn(Optional.empty());
        when(tenants.saveAndFlush(any(Tenant.class))).thenAnswer(invocation -> {
            Tenant tenant = invocation.getArgument(0); tenant.setTenantId(72L); return tenant;
        });
        when(passwordEncoder.encode("secret")).thenReturn("encoded");
        when(users.saveAndFlush(any(AppUser.class))).thenThrow(new DataIntegrityViolationException("unique email"));
        assertThrows(BusinessException.class, () -> service.onboardDealership(new TenantOnboardingRequest(
                "Dealer", null, null, null, "Admin", "used@example.test", "secret")));
        verify(tenants).saveAndFlush(any(Tenant.class));
        verify(users).saveAndFlush(any(AppUser.class));
    }

    @Test
    void searchAndMetricResponsesAreBasedOnTenantAndUserRepositories() {
        when(tenants.count()).thenReturn(4L);
        when(users.countDealershipUsersByRole("ADMIN")).thenReturn(4L);
        when(users.countDealershipUsersByRole("SALES")).thenReturn(9L);
        assertEquals(4L, service.getMetrics().dealershipCount());
        assertEquals(4L, service.getMetrics().dealershipAdminCount());
        assertEquals(9L, service.getMetrics().salesUserCount());
        when(tenants.findAll(any(Sort.class))).thenReturn(List.of());
        assertEquals(List.of(), service.getAllTenants("north"));
    }
}

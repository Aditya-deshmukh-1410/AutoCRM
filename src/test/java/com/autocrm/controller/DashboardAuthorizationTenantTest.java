package com.autocrm.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.autocrm.config.SecurityConfig;
import com.autocrm.model.AppUser;
import com.autocrm.repository.ActivityRepository;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.FinanceRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.repository.SaleRepository;
import com.autocrm.repository.TestDriveRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.JwtService;
import com.autocrm.service.DashboardService;

@WebMvcTest(controllers = DashboardController.class,
        properties = "jwt.secret=autocrm-dashboard-test-only-secret-key-0123456789abcdef")
@ImportAutoConfiguration({ SecurityAutoConfiguration.class, ServletWebSecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class })
@Import({ SecurityConfig.class, JwtService.class, DashboardService.class })
@AutoConfigureMockMvc
class DashboardAuthorizationTenantTest {

    private static final Long TENANT_ID = 173L;

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @MockitoBean private AppUserRepository appUsers;
    @MockitoBean private CustomerRepository customers;
    @MockitoBean private LeadRepository leads;
    @MockitoBean private VehicleRepository vehicles;
    @MockitoBean private TestDriveRepository testDrives;
    @MockitoBean private SaleRepository sales;
    @MockitoBean private ActivityRepository activities;
    @MockitoBean private FinanceRepository finances;

    @Test
    void unauthenticatedRequestCannotAccessDashboard() throws Exception {
        mockMvc.perform(get("/api/dashboard")).andExpect(status().isUnauthorized());

        verifyNoInteractions(customers, leads, vehicles, testDrives, sales, activities, finances);
    }

    @Test
    void adminDashboardCountsUseTenantFromAuthenticatedJwt() throws Exception {
        mockEmptyTenantResults(TENANT_ID);

        mockMvc.perform(get("/api/dashboard").header("Authorization", token("ADMIN", TENANT_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCustomers").value(0))
                .andExpect(jsonPath("$.totalLeads").value(0))
                .andExpect(jsonPath("$.totalVehicles").value(0))
                .andExpect(jsonPath("$.totalTestDrives").value(0))
                .andExpect(jsonPath("$.totalSales").value(0))
                .andExpect(jsonPath("$.totalActivities").value(0))
                .andExpect(jsonPath("$.totalFinanceRecords").value(0));

        verifyTenantQueries(TENANT_ID);
    }

    @Test
    void salesDashboardCountsRemainDealershipWideButUseTenantFromAuthenticatedJwt() throws Exception {
        mockEmptyTenantResults(TENANT_ID);

        mockMvc.perform(get("/api/dashboard").header("Authorization", token("SALES", TENANT_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCustomers").value(0))
                .andExpect(jsonPath("$.totalLeads").value(0))
                .andExpect(jsonPath("$.totalVehicles").value(0))
                .andExpect(jsonPath("$.totalTestDrives").value(0))
                .andExpect(jsonPath("$.totalSales").value(0))
                .andExpect(jsonPath("$.totalActivities").value(0))
                .andExpect(jsonPath("$.totalFinanceRecords").value(0));

        verifyTenantQueries(TENANT_ID);
    }

    @Test
    void tenantlessPlatformAdminCannotObtainDealershipDashboardData() throws Exception {
        mockMvc.perform(get("/api/dashboard")
                .header("Authorization", token("PLATFORM_ADMIN", null)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Authenticated tenant context is missing"));

        verifyNoInteractions(customers, leads, vehicles, testDrives, sales, activities, finances);
    }

    private void mockEmptyTenantResults(Long tenantId) {
        when(customers.findByTenantId(tenantId)).thenReturn(List.of());
        when(leads.findByTenantId(tenantId)).thenReturn(List.of());
        when(vehicles.findByTenantId(tenantId)).thenReturn(List.of());
        when(testDrives.findByTenantId(tenantId)).thenReturn(List.of());
        when(sales.findByTenantId(tenantId)).thenReturn(List.of());
        when(activities.findByTenantId(tenantId)).thenReturn(List.of());
        when(finances.findByTenantId(tenantId)).thenReturn(List.of());
    }

    private void verifyTenantQueries(Long tenantId) {
        verify(customers).findByTenantId(tenantId);
        verify(leads).findByTenantId(tenantId);
        verify(vehicles).findByTenantId(tenantId);
        verify(testDrives).findByTenantId(tenantId);
        verify(sales).findByTenantId(tenantId);
        verify(activities).findByTenantId(tenantId);
        verify(finances).findByTenantId(tenantId);
        verifyNoMoreInteractions(customers, leads, vehicles, testDrives, sales, activities, finances);
    }

    private String token(String role, Long tenantId) {
        AppUser user = new AppUser();
        user.setUserId(91L);
        user.setEmail(role.toLowerCase() + "@dashboard.example.test");
        user.setRole(role);
        user.setTenantId(tenantId);
        when(appUsers.findById(91L)).thenReturn(java.util.Optional.of(user));
        return "Bearer " + jwtService.generateToken(user);
    }
}

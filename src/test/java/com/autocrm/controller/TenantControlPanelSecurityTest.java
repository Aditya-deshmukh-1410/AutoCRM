package com.autocrm.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.autocrm.config.SecurityConfig;
import com.autocrm.dto.PlatformMetricsResponse;
import com.autocrm.dto.TenantDetailResponse;
import com.autocrm.dto.TenantSummaryResponse;
import com.autocrm.model.AppUser;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.security.JwtService;
import com.autocrm.service.TenantService;

@WebMvcTest(controllers = TenantController.class,
        properties = "jwt.secret=autocrm-control-panel-test-only-secret-key-0123456789abcdef")
@ImportAutoConfiguration({ SecurityAutoConfiguration.class, ServletWebSecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class })
@Import({ SecurityConfig.class, JwtService.class })
@AutoConfigureMockMvc
class TenantControlPanelSecurityTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @MockitoBean TenantService tenantService;
    @MockitoBean AppUserRepository appUsers;
    private final AtomicLong tokenUserIds = new AtomicLong(700L);

    @Test
    void platformAdminCanReadMetricsSearchAndDetailsAndManageMetadata() throws Exception {
        String platformToken = bearer(token("PLATFORM_ADMIN", null));
        when(tenantService.getMetrics()).thenReturn(new PlatformMetricsResponse(2, 2, 3));
        when(tenantService.getAllTenants("motor")).thenReturn(List.of(
                new TenantSummaryResponse(15L, "Motor House", "contact@example.test", null, null, 2, 1)));
        when(tenantService.getTenantById(15L)).thenReturn(new TenantDetailResponse(15L, "Motor House",
                "contact@example.test", null, null, List.of(new com.autocrm.dto.TenantUserResponse(5L,
                        "Initial Admin", "admin@example.test", "ADMIN"))));
        when(tenantService.onboardDealership(org.mockito.ArgumentMatchers.any())).thenReturn(
                new TenantDetailResponse(16L, "New Dealer", "contact@example.test", null, null, List.of()));
        when(tenantService.updateTenant(org.mockito.ArgumentMatchers.eq(15L),
                org.mockito.ArgumentMatchers.any())).thenReturn(new TenantDetailResponse(15L, "Updated Dealer",
                        "contact@example.test", null, null, List.of()));

        mockMvc.perform(get("/api/tenants/metrics").header("Authorization", platformToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.dealershipCount").value(2));
        mockMvc.perform(get("/api/tenants?search=motor").header("Authorization", platformToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Motor House"));
        mockMvc.perform(get("/api/tenants/15").header("Authorization", platformToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.users[0].role").value("ADMIN"));
        mockMvc.perform(post("/api/tenants").header("Authorization", platformToken)
                .contentType(MediaType.APPLICATION_JSON).content(onboardingBody()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.tenantId").value(16));
        mockMvc.perform(put("/api/tenants/15").header("Authorization", platformToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Updated Dealer\",\"email\":\"contact@example.test\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Updated Dealer"));
        verify(tenantService).getMetrics();
        verify(tenantService).getAllTenants("motor");
        verify(tenantService).getTenantById(15L);
    }

    @Test
    void invalidOnboardingPayloadIsRejectedBeforeServiceCall() throws Exception {
        mockMvc.perform(post("/api/tenants").header("Authorization", bearer(token("PLATFORM_ADMIN", null)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"dealershipName\":\" \",\"adminEmail\":\"bad-email\",\"initialPassword\":\"\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(tenantService);
    }

    @Test
    void dealershipAdminAndSalesCannotAccessPlatformEndpoints() throws Exception {
        for (String role : List.of("ADMIN", "SALES")) {
            String auth = bearer(token(role, 23L));
            mockMvc.perform(get("/api/tenants/metrics").header("Authorization", auth))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/tenants").header("Authorization", auth)).andExpect(status().isForbidden());
            mockMvc.perform(get("/api/tenants/15").header("Authorization", auth)).andExpect(status().isForbidden());
            mockMvc.perform(post("/api/tenants").header("Authorization", auth)
                    .contentType(MediaType.APPLICATION_JSON).content(onboardingBody()))
                    .andExpect(status().isForbidden());
            mockMvc.perform(put("/api/tenants/15").header("Authorization", auth)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Stolen\",\"email\":\"contact@example.test\"}"))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(tenantService);
    }

    @Test
    void unauthenticatedRequestsCannotAccessPlatformEndpoints() throws Exception {
        mockMvc.perform(get("/api/tenants/metrics")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/tenants")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/tenants").contentType(MediaType.APPLICATION_JSON).content(onboardingBody()))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(tenantService);
    }

    private String token(String role, Long tenantId) {
        long id = tokenUserIds.incrementAndGet();
        AppUser user = new AppUser(); user.setUserId(id); user.setEmail("control-panel-" + id + "@example.test");
        user.setRole(role); user.setTenantId(tenantId);
        org.mockito.Mockito.when(appUsers.findById(id)).thenReturn(java.util.Optional.of(user));
        return jwtService.generateToken(user);
    }

    private String bearer(String token) { return "Bearer " + token; }

    private String onboardingBody() {
        return "{\"dealershipName\":\"New Dealer\",\"contactEmail\":\"contact@example.test\","
                + "\"adminName\":\"First Admin\",\"adminEmail\":\"first@example.test\","
                + "\"initialPassword\":\"private-test-password\"}";
    }
}

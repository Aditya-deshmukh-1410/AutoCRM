package com.autocrm.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autocrm.config.SecurityConfig;
import com.autocrm.model.AppUser;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.security.JwtService;
import com.autocrm.service.CrmNotificationService;
import com.autocrm.service.PublicWebsiteSellService;
import io.jsonwebtoken.Claims;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({ CrmNotificationController.class, PublicWebsiteSellController.class })
@ImportAutoConfiguration({ SecurityAutoConfiguration.class, ServletWebSecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class })
@Import(SecurityConfig.class)
class SalesWebsiteWorkSecurityTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private AppUserRepository users;
    @MockitoBean private CrmNotificationService notificationService;
    @MockitoBean private PublicWebsiteSellService sellService;

    @Test
    void salesCanViewNotificationsAndWorkSellerRequests() throws Exception {
        authenticate("sales-token", "SALES", 41L);
        when(notificationService.currentTenant()).thenReturn(new CrmNotificationService.Summary(List.of(), 0));
        when(sellService.list()).thenReturn(List.of());
        when(sellService.photosForLead(12L)).thenReturn(List.of());

        mockMvc.perform(get("/api/crm/notifications").header("Authorization", "Bearer sales-token"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/crm/sell-requests").header("Authorization", "Bearer sales-token"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/website/sell-requests/12/photos")
                .header("Authorization", "Bearer sales-token")).andExpect(status().isOk());
        mockMvc.perform(get("/api/website").header("Authorization", "Bearer sales-token"))
                .andExpect(status().isForbidden());
    }

    private void authenticate(String token, String role, Long tenantId) {
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn("sales@example.test");
        when(claims.get("role", String.class)).thenReturn(role);
        when(claims.get("userId", Number.class)).thenReturn(73L);
        when(claims.get("tenantId", Number.class)).thenReturn(tenantId);
        when(jwtService.extractClaims(token)).thenReturn(claims);
        AppUser user = new AppUser(); user.setUserId(73L); user.setEmail("sales@example.test");
        user.setRole(role); user.setTenantId(tenantId);
        when(users.findById(73L)).thenReturn(Optional.of(user));
    }
}

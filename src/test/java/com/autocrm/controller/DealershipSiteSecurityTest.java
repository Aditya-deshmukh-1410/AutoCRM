package com.autocrm.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autocrm.config.SecurityConfig;
import com.autocrm.model.AppUser;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.DealershipSiteImageRepository;
import com.autocrm.repository.DealershipSiteRepository;
import com.autocrm.security.JwtService;
import com.autocrm.security.TenantContext;
import java.util.Optional;
import com.autocrm.service.AuditLogService;
import com.autocrm.service.DealershipSiteService;
import com.autocrm.service.PublicTestDriveBookingService;
import tools.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
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

@WebMvcTest({ DealershipSiteController.class, DealershipSiteImageController.class })
@ImportAutoConfiguration({ SecurityAutoConfiguration.class, ServletWebSecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class })
@Import(SecurityConfig.class)
class DealershipSiteSecurityTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private AppUserRepository users;
    @MockitoBean private DealershipSiteService siteService;
    @MockitoBean private PublicTestDriveBookingService bookingService;
    @MockitoBean private DealershipSiteImageRepository imageRepository;
    @MockitoBean private DealershipSiteRepository siteRepository;
    @MockitoBean private AuditLogService auditLogService;

    @Test
    void builderRequiresAuthenticationAndAdminRole() throws Exception {
        mockMvc.perform(get("/api/website")).andExpect(status().isUnauthorized());

        authenticate("sales-token", "SALES", 41L);
        mockMvc.perform(get("/api/website").header("Authorization", "Bearer sales-token"))
                .andExpect(status().isForbidden());

        authenticate("platform-token", "PLATFORM_ADMIN", null);
        mockMvc.perform(get("/api/website").header("Authorization", "Bearer platform-token"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminBuilderRequestUsesTenantFromAuthenticatedJwt() throws Exception {
        authenticate("admin-token", "ADMIN", 41L);
        when(siteService.ownerSite()).thenAnswer(invocation -> {
            assertEquals(41L, TenantContext.requireTenantId());
            return new DealershipSiteService.SiteResponse("dealer-41", "classic",
                    new ObjectMapper().createObjectNode(), false);
        });

        mockMvc.perform(get("/api/website").header("Authorization", "Bearer admin-token"))
                .andExpect(status().isOk());
    }

    @Test
    void publishedWebsiteEndpointIsPublic() throws Exception {
        when(siteService.publicSite("dealer-41")).thenReturn(
                new DealershipSiteService.PublicSiteResponse("Dealer 41", "classic",
                        new ObjectMapper().createObjectNode()));

        mockMvc.perform(get("/public/dealer-41")).andExpect(status().isOk());
    }

    private void authenticate(String token, String role, Long tenantId) {
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn("user@example.test");
        when(claims.get("role", String.class)).thenReturn(role);
        when(claims.get("userId", Number.class)).thenReturn(73L);
        when(claims.get("tenantId", Number.class)).thenReturn(tenantId);
        when(jwtService.extractClaims(token)).thenReturn(claims);
        AppUser user = new AppUser(); user.setUserId(73L); user.setEmail("user@example.test");
        user.setRole(role); user.setTenantId(tenantId);
        when(users.findById(73L)).thenReturn(Optional.of(user));
    }
}

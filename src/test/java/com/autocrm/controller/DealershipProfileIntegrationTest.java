package com.autocrm.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.model.AppUser;
import com.autocrm.model.Tenant;
import com.autocrm.repository.TenantRepository;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.security.JwtService;

@SpringBootTest(properties = { "jwt.secret=autocrm-profile-integration-test-only-secret-key-0123456789abcdef",
        "spring.jpa.show-sql=false", "logging.level.root=ERROR" })
@AutoConfigureMockMvc
class DealershipProfileIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired TenantRepository tenants;
    @Autowired AppUserRepository users;
    @Autowired JwtService jwtService;

    @Test
    @Transactional
    void adminCanUpdateOnlyOwnProfileAndSalesCannotUpdate() throws Exception {
        String suffix = UUID.randomUUID().toString();
        Tenant tenantA = createTenant("Profile A " + suffix);
        Tenant tenantB = createTenant("Profile B " + suffix);
        String adminA = token("profile-admin-" + suffix + "@example.test", "ADMIN", tenantA.getTenantId());
        String salesA = token("profile-sales-" + suffix + "@example.test", "SALES", tenantA.getTenantId());
        String adminB = token("profile-other-admin-" + suffix + "@example.test", "ADMIN", tenantB.getTenantId());
        String body = "{\"name\":\"Updated Dealer\",\"email\":\"contact@example.test\",\"phone\":\"9000000000\",\"address\":\"Main Road\",\"tenantId\":" + tenantB.getTenantId() + "}";

        mockMvc.perform(put("/api/dealership-profile").header("Authorization", "Bearer " + adminA)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Updated Dealer"));
        mockMvc.perform(get("/api/dealership-profile").header("Authorization", "Bearer " + adminB))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value(tenantB.getName()));
        // A spoofed tenantId in the payload cannot redirect this update to Tenant B.
        mockMvc.perform(get("/api/dealership-profile").header("Authorization", "Bearer " + adminA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Updated Dealer"));
        mockMvc.perform(get("/api/dealership-profile?tenantId={tenantId}", tenantB.getTenantId())
                .header("Authorization", "Bearer " + adminA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Updated Dealer"));
        mockMvc.perform(put("/api/dealership-profile").header("Authorization", "Bearer " + salesA)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/dealership-profile").header("Authorization", "Bearer " + adminB))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value(tenantB.getName()));
    }

    @Test
    @Transactional
    void invalidProfileDataIsRejected() throws Exception {
        String suffix = UUID.randomUUID().toString();
        Tenant tenant = createTenant("Invalid Profile " + suffix);
        String admin = token("invalid-profile-" + suffix + "@example.test", "ADMIN", tenant.getTenantId());
        mockMvc.perform(put("/api/dealership-profile").header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\" \",\"email\":\"not-an-email\",\"phone\":\"9000000000\",\"address\":\"x\"}"))
                .andExpect(status().isBadRequest());
    }

    private Tenant createTenant(String name) {
        Tenant tenant = new Tenant(); tenant.setName(name); tenant.setEmail("contact+" + UUID.randomUUID() + "@example.test");
        tenant.setPhone("9000000000"); return tenants.saveAndFlush(tenant);
    }
    private String token(String email, String role, Long tenantId) {
        AppUser user = new AppUser(); user.setName("Profile User"); user.setEmail(email);
        user.setPassword("unused-profile-test-password"); user.setRole(role); user.setTenantId(tenantId);
        return jwtService.generateToken(users.saveAndFlush(user));
    }
}

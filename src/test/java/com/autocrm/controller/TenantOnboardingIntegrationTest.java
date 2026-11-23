package com.autocrm.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.model.AppUser;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.TenantRepository;
import com.autocrm.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest(properties = { "jwt.secret=autocrm-tenant-onboarding-test-only-secret-key-0123456789abcdef",
        "spring.jpa.show-sql=false", "logging.level.root=ERROR" })
@AutoConfigureMockMvc
class TenantOnboardingIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired TenantRepository tenants;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @Transactional
    void platformOnboardsTenantWithHashedAdminAndDuplicateDoesNotCreatePartialTenant() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String email = "initial-admin-" + suffix + "@example.test";
        long tenantCountBefore = tenants.count();
        String platformToken = token("PLATFORM_ADMIN", null);
        String body = "{\"dealershipName\":\"Onboarded " + suffix + "\","
                + "\"contactEmail\":\"contact-" + suffix + "@example.test\","
                + "\"adminName\":\"Initial Admin\",\"adminEmail\":\"" + email + "\","
                + "\"initialPassword\":\"onboarding-test-password\",\"tenantId\":987654}";

        MvcResult created = mockMvc.perform(post("/api/tenants").header("Authorization", "Bearer " + platformToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.users[0].role").value("ADMIN"))
                .andExpect(jsonPath("$.users[0].email").value(email))
                .andReturn();

        JsonNode response = mapper.readTree(created.getResponse().getContentAsString());
        long tenantId = response.get("tenantId").asLong();
        assertNotEquals(987654L, tenantId, "client-supplied tenant IDs must not select the created tenant");
        assertFalse(created.getResponse().getContentAsString().contains("onboarding-test-password"));
        AppUser admin = users.findByEmail(email).orElseThrow();
        assertEquals(tenantId, admin.getTenantId());
        assertEquals("ADMIN", admin.getRole());
        assertNotEquals("onboarding-test-password", admin.getPassword());
        assertTrue(passwordEncoder.matches("onboarding-test-password", admin.getPassword()));

        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"onboarding-test-password\"}"))
                .andExpect(status().isOk()).andReturn();
        String issuedJwt = login.getResponse().getContentAsString();
        assertEquals("ADMIN", jwtService.extractClaims(issuedJwt).get("role", String.class));
        assertEquals(tenantId, ((Number) jwtService.extractClaims(issuedJwt).get("tenantId")).longValue());

        mockMvc.perform(post("/api/tenants").header("Authorization", "Bearer " + platformToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
        assertEquals(tenantCountBefore + 1, tenants.count(), "duplicate admin email must not leave another tenant row");
    }

    @Test
    @Transactional
    void platformMetadataUpdatesIgnoreClientSuppliedTenantId() throws Exception {
        var tenant = new com.autocrm.model.Tenant();
        tenant.setName("Tenant " + UUID.randomUUID());
        tenant = tenants.saveAndFlush(tenant);
        long protectedTenantId = tenant.getTenantId();
        String platformToken = token("PLATFORM_ADMIN", null);
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/tenants/{id}", protectedTenantId)
                .header("Authorization", "Bearer " + platformToken).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Updated safely\",\"tenantId\":987654}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tenantId").value(protectedTenantId));
        assertEquals("Updated safely", tenants.findById(protectedTenantId).orElseThrow().getName());
        assertFalse(tenants.findById(987654L).isPresent());
    }

    private String token(String role, Long tenantId) {
        AppUser user = new AppUser(); user.setName("Integration Actor");
        user.setEmail("platform-test-" + UUID.randomUUID() + "@example.test");
        user.setPassword("unused-onboarding-test-password"); user.setRole(role); user.setTenantId(tenantId);
        return jwtService.generateToken(users.saveAndFlush(user));
    }
}

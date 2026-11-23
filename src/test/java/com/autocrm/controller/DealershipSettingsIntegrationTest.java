package com.autocrm.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.model.AppUser;
import com.autocrm.model.Lead;
import com.autocrm.model.Tenant;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.DealershipOptionRepository;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.repository.TenantRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest(properties = { "jwt.secret=autocrm-settings-integration-test-only-secret-key-0123456789abcdef",
        "spring.jpa.show-sql=false", "logging.level.root=ERROR" })
@AutoConfigureMockMvc
class DealershipSettingsIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired TenantRepository tenants;
    @Autowired DealershipOptionRepository options;
    @Autowired AppUserRepository users;
    @Autowired LeadRepository leads;
    @Autowired VehicleRepository vehicles;
    @Autowired JwtService jwtService;
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @Transactional
    void adminManagesTenantOptionsSalesIsReadOnlyAndTenantIdsCannotCrossScope() throws Exception {
        String suffix = UUID.randomUUID().toString();
        Long tenantA = createTenant(suffix + "-a");
        Long tenantB = createTenant(suffix + "-b");
        String adminA = token("settings-admin-a-" + suffix + "@example.test", "ADMIN", tenantA);
        String salesA = token("settings-sales-a-" + suffix + "@example.test", "SALES", tenantA);
        String adminB = token("settings-admin-b-" + suffix + "@example.test", "ADMIN", tenantB);

        mockMvc.perform(get("/api/dealership-settings").header("Authorization", "Bearer " + adminA))
                .andExpect(status().isOk());
        MvcResult created = mockMvc.perform(post("/api/dealership-settings").header("Authorization", "Bearer " + adminA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"optionType\":\"LEAD_SOURCE\",\"value\":\"Partner\",\"tenantId\":" + tenantB + "}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.value").value("Partner")).andReturn();
        long optionId = mapper.readTree(created.getResponse().getContentAsString()).get("optionId").asLong();

        mockMvc.perform(get("/api/dealership-settings").header("Authorization", "Bearer " + salesA))
                .andExpect(status().isOk()).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().string(org.hamcrest.Matchers.containsString("Partner")));
        mockMvc.perform(post("/api/dealership-settings").header("Authorization", "Bearer " + salesA)
                .contentType(MediaType.APPLICATION_JSON).content("{\"optionType\":\"LEAD_SOURCE\",\"value\":\"Sales only\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/dealership-settings/{id}", optionId).header("Authorization", "Bearer " + adminA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"optionType\":\"LEAD_SOURCE\",\"value\":\"Partner Network\",\"active\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.value").value("Partner Network"));
        mockMvc.perform(put("/api/dealership-settings/{id}", optionId).header("Authorization", "Bearer " + adminB)
                .contentType(MediaType.APPLICATION_JSON).content("{\"optionType\":\"LEAD_SOURCE\",\"value\":\"Stolen\",\"active\":true}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/dealership-settings/{id}", optionId).header("Authorization", "Bearer " + adminB))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/dealership-settings").header("Authorization", "Bearer " + adminB))
                .andExpect(status().isOk()).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Partner"))));

        mockMvc.perform(post("/api/dealership-settings").header("Authorization", "Bearer " + adminA)
                .contentType(MediaType.APPLICATION_JSON).content("{\"optionType\":\"LEAD_SOURCE\",\"value\":\" partner network \"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/dealership-settings").header("Authorization", "Bearer " + adminA)
                .contentType(MediaType.APPLICATION_JSON).content("{\"optionType\":\"VEHICLE_CATEGORY\",\"value\":\" \"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/dealership-settings/{id}", optionId).header("Authorization", "Bearer " + adminA))
                .andExpect(status().isNoContent());
        assertFalse(options.findById(optionId).orElseThrow().isActive(), "removal should retire the option, not delete it");
    }

    @Test
    @Transactional
    void retiringOptionsDoesNotRewriteOrHideExistingLeadAndVehicleValues() throws Exception {
        String suffix = UUID.randomUUID().toString();
        Long tenant = createTenant(suffix);
        String admin = token("settings-legacy-" + suffix + "@example.test", "ADMIN", tenant);
        mockMvc.perform(get("/api/dealership-settings").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk());
        MvcResult categoryResponse = mockMvc.perform(post("/api/dealership-settings").header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"optionType\":\"VEHICLE_CATEGORY\",\"value\":\"Classic\"}"))
                .andExpect(status().isCreated()).andReturn();
        JsonNode category = mapper.readTree(categoryResponse.getResponse().getContentAsString());
        long categoryId = category.get("optionId").asLong();

        Lead lead = new Lead(); lead.setSource("Imported campaign"); lead.setStatus("NEW");
        lead.setInterestedVehicle("Legacy model"); lead.setCustomerId(1L); lead.setTenantId(tenant);
        Lead savedLead = leads.saveAndFlush(lead);
        Vehicle vehicle = new Vehicle(); vehicle.setMake("Legacy"); vehicle.setModel("Inventory");
        vehicle.setYear(2020); vehicle.setFuelType("PETROL"); vehicle.setTransmission("MANUAL");
        vehicle.setKilometers(1000); vehicle.setPrice(new BigDecimal("10000"));
        vehicle.setRegistrationNumber("LEGACY-" + suffix); vehicle.setStatus("AVAILABLE");
        vehicle.setTenantId(tenant); vehicle.setCategory("Classic");
        Vehicle savedVehicle = vehicles.saveAndFlush(vehicle);

        mockMvc.perform(delete("/api/dealership-settings/{id}", categoryId).header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());
        assertEquals("Imported campaign", leads.findByLeadIdAndTenantId(savedLead.getLeadId(), tenant).orElseThrow().getSource());
        assertEquals("Classic", vehicles.findByVehicleIdAndTenantId(savedVehicle.getVehicleId(), tenant).orElseThrow().getCategory());
        mockMvc.perform(get("/api/leads/{id}", savedLead.getLeadId()).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.source").value("Imported campaign"));
        mockMvc.perform(get("/api/vehicles/{id}", savedVehicle.getVehicleId()).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.category").value("Classic"));
        assertTrue(options.findById(categoryId).isPresent());
    }

    private Long createTenant(String suffix) {
        Tenant tenant = new Tenant(); tenant.setName("Settings " + suffix);
        tenant.setEmail("settings-" + suffix + "@example.test"); tenant.setPhone("9000000000");
        return tenants.saveAndFlush(tenant).getTenantId();
    }

    private String token(String email, String role, Long tenantId) {
        AppUser user = new AppUser(); user.setName("Settings User"); user.setEmail(email);
        user.setPassword("unused-settings-test-password"); user.setRole(role); user.setTenantId(tenantId);
        return jwtService.generateToken(users.saveAndFlush(user));
    }
}

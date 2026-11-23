package com.autocrm.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
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
import com.autocrm.model.Customer;
import com.autocrm.model.Lead;
import com.autocrm.model.Tenant;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.repository.TenantRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.JwtService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest(properties = { "jwt.secret=autocrm-integration-test-only-secret-key-0123456789abcdef",
        "spring.jpa.show-sql=false", "logging.level.root=ERROR" })
@AutoConfigureMockMvc
class PublicVehicleEnquiryWorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private LeadRepository leadRepository;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private JwtService jwtService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @Transactional
    void publicEnquiryPersistsForOwningTenantAndIsVisibleOnlyToThatTenant() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String email = "showroom-" + suffix + "@example.test";
        String unpublishedEmail = "unpublished-" + suffix + "@example.test";

        Long tenantAId = createTenant("Showroom A");
        Long tenantBId = createTenant("Showroom B");

        Vehicle publishedVehicle = saveVehicle(tenantAId, true, suffix);
        Vehicle unpublishedVehicle = saveVehicle(tenantAId, false, suffix + "-unpublished");

        String tenantAToken = tokenFor("tenant-a-" + suffix + "@example.test", tenantAId);
        String tenantBToken = tokenFor("tenant-b-" + suffix + "@example.test", tenantBId);

        int customerCountBefore = customerRepository.findByTenantId(tenantAId).size();
        int leadCountBefore = leadRepository.findByTenantId(tenantAId).size();

        mockMvc.perform(get("/api/customers")).andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/leads")).andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/public/vehicles/{vehicleId}/enquiries", publishedVehicle.getVehicleId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(
                        Map.of("name", "Integration Visitor", "phone", "9876543210", "email", email, "tenantId",
                                tenantBId, "status", "LOST", "interestedVehicle", "Caller supplied vehicle"))))
                .andExpect(status().isCreated());

        List<Customer> persistedCustomers = customerRepository.findByTenantId(tenantAId).stream()
                .filter(customer -> email.equals(customer.getEmail())).toList();

        assertEquals(1, persistedCustomers.size(), "one matching customer should be persisted");

        Customer customer = persistedCustomers.get(0);
        assertEquals(tenantAId, customer.getTenantId());

        List<Lead> persistedLeads = leadRepository.findByTenantId(tenantAId).stream()
                .filter(lead -> customer.getCustomerId().equals(lead.getCustomerId())).toList();

        assertEquals(1, persistedLeads.size(), "one lead should reference the new customer");

        Lead lead = persistedLeads.get(0);
        assertEquals(tenantAId, lead.getTenantId());
        assertEquals(customer.getCustomerId(), lead.getCustomerId());
        assertEquals("NEW", lead.getStatus());
        assertEquals("PUBLIC_SHOWROOM", lead.getSource());

        assertEquals(publishedVehicle.getYear() + " " + publishedVehicle.getMake() + " " + publishedVehicle.getModel()
                + " (Vehicle ID " + publishedVehicle.getVehicleId() + ")", lead.getInterestedVehicle());

        assertEquals(customerCountBefore + 1, customerRepository.findByTenantId(tenantAId).size());
        assertEquals(leadCountBefore + 1, leadRepository.findByTenantId(tenantAId).size());

        List<Customer> tenantACustomers = readList(
                mockMvc.perform(get("/api/customers").header("Authorization", "Bearer " + tenantAToken))
                        .andExpect(status().isOk()).andReturn(),
                new TypeReference<List<Customer>>() {
                });

        List<Lead> tenantALeads = readList(
                mockMvc.perform(get("/api/leads").header("Authorization", "Bearer " + tenantAToken))
                        .andExpect(status().isOk()).andReturn(),
                new TypeReference<List<Lead>>() {
                });

        assertTrue(tenantACustomers.stream().anyMatch(item -> item.getCustomerId().equals(customer.getCustomerId())));
        assertTrue(tenantALeads.stream().anyMatch(item -> item.getLeadId().equals(lead.getLeadId())));

        List<Customer> tenantBCustomers = readList(
                mockMvc.perform(get("/api/customers").header("Authorization", "Bearer " + tenantBToken))
                        .andExpect(status().isOk()).andReturn(),
                new TypeReference<List<Customer>>() {
                });

        List<Lead> tenantBLeads = readList(
                mockMvc.perform(get("/api/leads").header("Authorization", "Bearer " + tenantBToken))
                        .andExpect(status().isOk()).andReturn(),
                new TypeReference<List<Lead>>() {
                });

        assertFalse(tenantBCustomers.stream().anyMatch(item -> item.getCustomerId().equals(customer.getCustomerId())));
        assertFalse(tenantBLeads.stream().anyMatch(item -> item.getLeadId().equals(lead.getLeadId())));

        mockMvc.perform(post("/api/public/vehicles/{vehicleId}/enquiries", unpublishedVehicle.getVehicleId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(
                        Map.of("name", "Unpublished Visitor", "phone", "9876543211", "email", unpublishedEmail))))
                .andExpect(status().isNotFound());

        assertTrue(customerRepository.findByTenantId(tenantAId).stream()
                .noneMatch(item -> unpublishedEmail.equals(item.getEmail())));

        assertEquals(customerCountBefore + 1, customerRepository.findByTenantId(tenantAId).size());
        assertEquals(leadCountBefore + 1, leadRepository.findByTenantId(tenantAId).size());

        assertNotNull(lead.getLeadId());
    }

    private Long createTenant(String name) {
        Tenant tenant = new Tenant();
        tenant.setName(name);
        tenant.setEmail(name.toLowerCase().replace(" ", "-") + "-" + UUID.randomUUID() + "@example.test");
        tenant.setPhone("9000000000");

        return tenantRepository.saveAndFlush(tenant).getTenantId();
    }

    private Vehicle saveVehicle(Long tenantId, boolean published, String suffix) {
        Vehicle vehicle = new Vehicle();
        vehicle.setMake("Integration Make");
        vehicle.setModel("Integration Model");
        vehicle.setYear(2026);
        vehicle.setFuelType("PETROL");
        vehicle.setTransmission("MANUAL");
        vehicle.setKilometers(12000);
        vehicle.setPrice(new BigDecimal("1250000"));
        vehicle.setRegistrationNumber("IT-" + suffix);
        vehicle.setStatus("AVAILABLE");
        vehicle.setPubliclyVisible(published);
        vehicle.setTenantId(tenantId);

        return vehicleRepository.saveAndFlush(vehicle);
    }

    private String tokenFor(String email, Long tenantId) {
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setRole("ADMIN");
        user.setTenantId(tenantId);
        user.setName("Public Workflow Admin");
        user.setPassword("unused-public-workflow-password");
        return jwtService.generateToken(appUserRepository.saveAndFlush(user));
    }

    private <T> List<T> readList(MvcResult result, TypeReference<List<T>> type) throws Exception {

        return objectMapper.readValue(result.getResponse().getContentAsString(StandardCharsets.UTF_8), type);
    }
}

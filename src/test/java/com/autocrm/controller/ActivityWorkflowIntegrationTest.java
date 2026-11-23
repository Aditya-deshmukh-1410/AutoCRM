package com.autocrm.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.autocrm.model.Activity;
import com.autocrm.model.AppUser;
import com.autocrm.model.AuditLog;
import com.autocrm.model.Customer;
import com.autocrm.model.Lead;
import com.autocrm.model.Tenant;
import com.autocrm.repository.ActivityRepository;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.AuditLogRepository;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.repository.TenantRepository;
import com.autocrm.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest(properties = { "jwt.secret=autocrm-integration-test-only-secret-key-0123456789abcdef",
        "spring.jpa.show-sql=false", "logging.level.root=ERROR" })
@AutoConfigureMockMvc
class ActivityWorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ActivityRepository activityRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;
    @Autowired
    private CustomerRepository customerRepository;
    @Autowired
    private LeadRepository leadRepository;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private Long tenantId;
    private String actorEmail;
    private String token;
    private Customer selectedCustomer;
    private Lead matchingLead;

    @Autowired
    private TenantRepository tenantRepository;
    @Autowired
    private AppUserRepository appUserRepository;

    @BeforeEach
    void setUp() {
        Tenant tenant = new Tenant();
        tenant.setName("Activity Integration Test");
        tenant.setEmail("activity-" + UUID.randomUUID() + "@example.test");
        tenant.setPhone("9000000000");

        tenant = tenantRepository.saveAndFlush(tenant);
        tenantId = tenant.getTenantId();

        actorEmail = "activity-agent-" + UUID.randomUUID() + "@example.test";
        token = tokenFor(actorEmail, tenantId);
        selectedCustomer = saveCustomer(tenantId, "Selected");
        matchingLead = saveLead(tenantId, selectedCustomer.getCustomerId(), "Matching");
    }

    @AfterEach
    void cleanUp() {
        if (actorEmail != null) appUserRepository.findByEmail(actorEmail).ifPresent(appUserRepository::delete);
        if (tenantId == null) {
            return;
        }

        activityRepository.deleteAll(activityRepository.findByTenantId(tenantId));
        jdbcTemplate.update("DELETE FROM audit_log WHERE tenant_id = ?", tenantId);
        leadRepository.deleteAll(leadRepository.findByTenantId(tenantId));
        customerRepository.deleteAll(customerRepository.findByTenantId(tenantId));

        tenantRepository.deleteById(tenantId);
    }

    @Test
    void createsActivityAndPersistsAuditWithServerDerivedActorAndTenant() throws Exception {
        MvcResult result = mockMvc
                .perform(post("/api/activities").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("customerId", selectedCustomer.getCustomerId(),
                                "leadId", matchingLead.getLeadId(), "activityType", "CALL", "notes",
                                "Integration follow-up", "status", "SCHEDULED", "tenantId", tenantId + 1000))))
                .andExpect(status().isOk()).andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        Long activityId = response.get("activityId").asLong();
        assertNotNull(activityId);

        Activity persisted = activityRepository.findByActivityIdAndTenantId(activityId, tenantId).orElseThrow();
        assertEquals(selectedCustomer.getCustomerId(), persisted.getCustomerId());
        assertEquals(matchingLead.getLeadId(), persisted.getLeadId());
        assertEquals(tenantId, persisted.getTenantId(), "tenant must come from the authenticated context");
        assertEquals("CALL", persisted.getActivityType());
        assertEquals("Integration follow-up", persisted.getNotes());

        List<AuditLog> auditEntries = auditLogRepository.findByTenantIdOrderByOccurredAtDesc(tenantId).stream()
                .filter(entry -> "ACTIVITY_CREATED".equals(entry.getAction()))
                .filter(entry -> "ACTIVITY".equals(entry.getEntityType()))
                .filter(entry -> activityId.equals(entry.getEntityId())).toList();
        assertEquals(1, auditEntries.size());
        AuditLog audit = auditEntries.get(0);
        assertEquals(activityId, audit.getEntityId());
        assertEquals(actorEmail, audit.getActorEmail());
        assertEquals(tenantId, audit.getTenantId());
    }

    @Test
    void rejectsMismatchedCustomerAndLeadWithoutPersistingActivityOrAudit() throws Exception {
        Customer otherCustomer = saveCustomer(tenantId, "Other");
        Lead otherCustomerLead = saveLead(tenantId, otherCustomer.getCustomerId(), "Other customer");

        mockMvc.perform(post("/api/activities").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(Map.of("customerId", selectedCustomer.getCustomerId(), "leadId",
                        otherCustomerLead.getLeadId(), "activityType", "CALL", "notes", "Should not persist"))))
                .andExpect(status().isConflict());

        assertTrue(activityRepository.findByTenantId(tenantId).isEmpty());
        assertFalse(auditLogRepository.findByTenantIdOrderByOccurredAtDesc(tenantId).stream()
                .anyMatch(entry -> "ACTIVITY_CREATED".equals(entry.getAction())));
    }

    private Customer saveCustomer(Long ownerTenantId, String label) {
        Customer customer = new Customer();
        customer.setName(label + " Customer");
        customer.setEmail(label.toLowerCase() + "-" + UUID.randomUUID() + "@example.test");
        customer.setPhone("9876543210");
        customer.setTenantId(ownerTenantId);
        return customerRepository.saveAndFlush(customer);
    }

    private Lead saveLead(Long ownerTenantId, Long customerId, String label) {
        Lead lead = new Lead();
        lead.setSource("INTEGRATION_TEST");
        lead.setStatus("NEW");
        lead.setInterestedVehicle(label + " vehicle");
        lead.setCustomerId(customerId);
        lead.setTenantId(ownerTenantId);
        return leadRepository.saveAndFlush(lead);
    }

    private String tokenFor(String email, Long ownerTenantId) {
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setRole("SALES");
        user.setTenantId(ownerTenantId);
        user.setName("Integration Sales");
        user.setPassword("unused-integration-password");
        return jwtService.generateToken(appUserRepository.saveAndFlush(user));
    }
}

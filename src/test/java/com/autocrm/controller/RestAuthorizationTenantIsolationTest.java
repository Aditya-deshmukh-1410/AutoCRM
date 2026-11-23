package com.autocrm.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.autocrm.config.SecurityConfig;
import com.autocrm.model.AppUser;
import com.autocrm.model.Customer;
import com.autocrm.model.Finance;
import com.autocrm.model.Lead;
import com.autocrm.model.Sale;
import com.autocrm.model.TestDrive;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.FinanceRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.repository.SaleRepository;
import com.autocrm.repository.TestDriveRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.JwtService;
import com.autocrm.service.AppUserService;
import com.autocrm.service.AuditLogService;
import com.autocrm.service.CustomerService;
import com.autocrm.service.FinanceService;
import com.autocrm.service.LeadService;
import com.autocrm.service.SaleService;
import com.autocrm.service.TenantService;
import com.autocrm.service.TestDriveService;
import com.autocrm.service.VehicleService;
import com.autocrm.service.WorkAssignmentAccess;

@WebMvcTest(controllers = { TenantController.class, AppUserController.class, CustomerController.class,
        LeadController.class, TestDriveController.class, SaleController.class, FinanceController.class },
        properties = "jwt.secret=autocrm-api-security-test-only-secret-key-0123456789abcdef")
@ImportAutoConfiguration({ SecurityAutoConfiguration.class, ServletWebSecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class })
@Import({ SecurityConfig.class, JwtService.class, RestAuthorizationTenantIsolationTest.ServiceConfiguration.class })
@AutoConfigureMockMvc
class RestAuthorizationTenantIsolationTest {

    private static final Long TENANT_A = 101L;
    private static final Long TENANT_B = 202L;
    private static final Long RECORD_ID = 303L;
    private final AtomicLong tokenUserIds = new AtomicLong(9_000L);

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @MockitoBean private TenantService tenantService;
    @MockitoBean private CustomerRepository customers;
    @MockitoBean private LeadRepository leads;
    @MockitoBean private TestDriveRepository testDrives;
    @MockitoBean private SaleRepository sales;
    @MockitoBean private FinanceRepository finances;
    @MockitoBean private AppUserRepository users;
    @MockitoBean private VehicleRepository vehicles;
    @MockitoBean private VehicleService vehicleService;
    @MockitoBean private AuditLogService auditLogService;

    @Test
    void unauthenticatedRequestsCannotReachProtectedResourceRoutes() throws Exception {
        mockMvc.perform(get("/api/tenants")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/customers")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/leads")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/test-drives")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/sales")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/finance")).andExpect(status().isUnauthorized());

        verifyNoInteractions(tenantService, customers, leads, testDrives, sales, finances, users);
    }

    @Test
    void platformAdminAdminAndSalesKeepTheirConfiguredEndpointPermissions() throws Exception {
        when(tenantService.getAllTenants(null)).thenReturn(List.of());
        when(users.findByTenantId(TENANT_A)).thenReturn(List.of());
        when(leads.findByTenantId(TENANT_A)).thenReturn(List.of());
        when(leads.findByTenantIdAndAssignedUserId(TENANT_A, 44L)).thenReturn(List.of());
        when(testDrives.findByTenantId(TENANT_A)).thenReturn(List.of());
        when(testDrives.findByTenantIdAndAssignedUserId(TENANT_A, 44L)).thenReturn(List.of());
        String suffix = UUID.randomUUID().toString();
        String salesEmail = "sales-" + suffix + "@example.test";
        when(users.findByEmail(salesEmail)).thenReturn(Optional.of(user(44L, TENANT_A, "SALES")));
        when(sales.findByTenantId(TENANT_A)).thenReturn(List.of());
        when(finances.findByTenantId(TENANT_A)).thenReturn(List.of());

        String admin = token("admin-" + suffix + "@example.test", "ADMIN", TENANT_A);
        String salesToken = token(salesEmail, "SALES", TENANT_A);
        String platformAdmin = token("platform-" + suffix + "@example.test", "PLATFORM_ADMIN", null);

        mockMvc.perform(get("/api/users").header("Authorization", bearer(admin)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/users").header("Authorization", bearer(salesToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/users").header("Authorization", bearer(platformAdmin)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/tenants").header("Authorization", bearer(platformAdmin)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/tenants").header("Authorization", bearer(admin)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/tenants").header("Authorization", bearer(salesToken)))
                .andExpect(status().isForbidden());

        for (String token : List.of(admin, salesToken)) {
            mockMvc.perform(get("/api/leads").header("Authorization", bearer(token))).andExpect(status().isOk());
            mockMvc.perform(get("/api/test-drives").header("Authorization", bearer(token)))
                    .andExpect(status().isOk());
            mockMvc.perform(get("/api/sales").header("Authorization", bearer(token))).andExpect(status().isOk());
            mockMvc.perform(get("/api/finance").header("Authorization", bearer(token))).andExpect(status().isOk());
        }

        verify(tenantService).getAllTenants(null);
    }

    @Test
    void tenantScopedRecordIdsCannotReadUpdateOrDeleteAcrossTenants() throws Exception {
        when(customers.findByCustomerIdAndTenantId(RECORD_ID, TENANT_A)).thenReturn(Optional.empty());
        when(leads.findByLeadIdAndTenantId(RECORD_ID, TENANT_A)).thenReturn(Optional.empty());
        when(testDrives.findByTestDriveIdAndTenantId(RECORD_ID, TENANT_A)).thenReturn(Optional.empty());
        when(sales.findBySaleIdAndTenantId(RECORD_ID, TENANT_A)).thenReturn(Optional.empty());
        when(finances.findByFinanceIdAndTenantId(RECORD_ID, TENANT_A)).thenReturn(Optional.empty());
        when(users.findByUserIdAndTenantId(RECORD_ID, TENANT_A)).thenReturn(Optional.empty());
        when(users.findById(RECORD_ID)).thenReturn(Optional.of(user(RECORD_ID, TENANT_B, "SALES")));
        String admin = bearer(token("record-admin@example.test", "ADMIN", TENANT_A));

        assertNotFoundForCrud("/api/customers", customerJson(), admin);
        assertNotFoundForCrud("/api/leads", leadJson(), admin);
        assertNotFoundForCrud("/api/test-drives", testDriveJson(), admin);
        assertNotFoundForCrud("/api/sales", saleJson(), admin);
        assertNotFoundForCrud("/api/finance", financeJson(), admin);
        mockMvc.perform(get("/api/users/{id}", RECORD_ID).header("Authorization", admin))
                .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/users/{id}", RECORD_ID).header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Foreign User\",\"email\":\"foreign@example.test\","
                        + "\"password\":\"plain-password\",\"role\":\"SALES\",\"tenantId\":" + TENANT_A + "}"))
                .andExpect(status().isNotFound());

        verify(customers, org.mockito.Mockito.times(3)).findByCustomerIdAndTenantId(RECORD_ID, TENANT_A);
        verify(leads, org.mockito.Mockito.times(3)).findByLeadIdAndTenantId(RECORD_ID, TENANT_A);
        verify(testDrives, org.mockito.Mockito.times(3)).findByTestDriveIdAndTenantId(RECORD_ID, TENANT_A);
        verify(sales, org.mockito.Mockito.times(3)).findBySaleIdAndTenantId(RECORD_ID, TENANT_A);
        verify(finances, org.mockito.Mockito.times(3)).findByFinanceIdAndTenantId(RECORD_ID, TENANT_A);
        verify(users).findByUserIdAndTenantId(RECORD_ID, TENANT_A);
        verify(users).findById(RECORD_ID);
        verify(users, org.mockito.Mockito.never()).save(any(AppUser.class));
    }

    @Test
    void salesCannotUseLeadOrTestDriveIdsAssignedToAnotherSalesUser() throws Exception {
        String email = "assigned-sales@example.test";
        when(users.findByEmail(email)).thenReturn(Optional.of(user(44L, TENANT_A, "SALES")));
        Lead lead = new Lead();
        lead.setAssignedUserId(55L);
        when(leads.findByLeadIdAndTenantId(RECORD_ID, TENANT_A)).thenReturn(Optional.of(lead));
        com.autocrm.model.TestDrive testDrive = new com.autocrm.model.TestDrive();
        testDrive.setAssignedUserId(55L);
        when(testDrives.findByTestDriveIdAndTenantId(RECORD_ID, TENANT_A)).thenReturn(Optional.of(testDrive));
        String salesToken = bearer(token(email, "SALES", TENANT_A));

        assertForbiddenForCrud("/api/leads", leadJson(), salesToken);
        assertForbiddenForCrud("/api/test-drives", testDriveJson(), salesToken);

        verify(leads, org.mockito.Mockito.times(3)).findByLeadIdAndTenantId(RECORD_ID, TENANT_A);
        verify(testDrives, org.mockito.Mockito.times(3)).findByTestDriveIdAndTenantId(RECORD_ID, TENANT_A);
        verify(leads, org.mockito.Mockito.never()).save(any(Lead.class));
        verify(testDrives, org.mockito.Mockito.never()).save(any(com.autocrm.model.TestDrive.class));
    }

    @Test
    void leadAndTestDriveAssignmentRoutesRemainAdminOnly() throws Exception {
        String salesToken = bearer(token("assignment-sales@example.test", "SALES", TENANT_A));
        String adminToken = bearer(token("assignment-admin@example.test", "ADMIN", TENANT_A));
        String assignment = "{\"assigneeId\":44}";

        mockMvc.perform(put("/api/leads/{id}/assignment", RECORD_ID).header("Authorization", salesToken)
                .contentType(MediaType.APPLICATION_JSON).content(assignment)).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/test-drives/{id}/assignment", RECORD_ID).header("Authorization", salesToken)
                .contentType(MediaType.APPLICATION_JSON).content(assignment)).andExpect(status().isForbidden());
        verifyNoInteractions(leads, testDrives, auditLogService);

        Lead lead = new Lead();
        lead.setLeadId(RECORD_ID);
        lead.setTenantId(TENANT_A);
        when(leads.findByLeadIdAndTenantId(RECORD_ID, TENANT_A)).thenReturn(Optional.of(lead));
        when(users.findByUserIdAndTenantId(44L, TENANT_A)).thenReturn(Optional.of(user(44L, TENANT_A, "SALES")));
        when(leads.save(lead)).thenReturn(lead);

        com.autocrm.model.TestDrive testDrive = new com.autocrm.model.TestDrive();
        testDrive.setTestDriveId(RECORD_ID);
        testDrive.setTenantId(TENANT_A);
        when(testDrives.findByTestDriveIdAndTenantId(RECORD_ID, TENANT_A)).thenReturn(Optional.of(testDrive));
        when(testDrives.save(testDrive)).thenReturn(testDrive);

        mockMvc.perform(put("/api/leads/{id}/assignment", RECORD_ID).header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(assignment)).andExpect(status().isOk());
        mockMvc.perform(put("/api/test-drives/{id}/assignment", RECORD_ID).header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(assignment)).andExpect(status().isOk());

        verify(leads).save(lead);
        verify(testDrives).save(testDrive);
    }

    @Test
    void customerCreateUsesTenantFromJwtInsteadOfPayload() throws Exception {
        when(customers.save(any(Customer.class))).thenAnswer(call -> {
            Customer saved = call.getArgument(0);
            saved.setCustomerId(88L);
            return saved;
        });
        String body = "{\"name\":\"Customer\",\"email\":\"customer@example.test\","
                + "\"phone\":\"1234567890\",\"tenantId\":" + TENANT_B + "}";

        mockMvc.perform(post("/api/customers").header("Authorization",
                bearer(token("tenant-actor@example.test", "ADMIN", TENANT_A)))
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());

        org.mockito.ArgumentCaptor<Customer> savedCustomer = org.mockito.ArgumentCaptor.forClass(Customer.class);
        verify(customers).save(savedCustomer.capture());
        assertEquals(TENANT_A, savedCustomer.getValue().getTenantId());
        verify(auditLogService).record("CUSTOMER_CREATED", "CUSTOMER", 88L, "Customer record created.");
    }

    private void assertNotFoundForCrud(String basePath, String body, String token) throws Exception {
        mockMvc.perform(get(basePath + "/" + RECORD_ID).header("Authorization", token))
                .andExpect(status().isNotFound());
        mockMvc.perform(put(basePath + "/" + RECORD_ID).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNotFound());
        mockMvc.perform(delete(basePath + "/" + RECORD_ID).header("Authorization", token))
                .andExpect(status().isNotFound());
    }

    private void assertForbiddenForCrud(String basePath, String body, String token) throws Exception {
        mockMvc.perform(get(basePath + "/" + RECORD_ID).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(put(basePath + "/" + RECORD_ID).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mockMvc.perform(delete(basePath + "/" + RECORD_ID).header("Authorization", token))
                .andExpect(status().isForbidden());
    }

    private String token(String email, String role, Long tenantId) {
        long id = tokenUserIds.incrementAndGet();
        AppUser user = user(id, tenantId, role);
        user.setEmail(email);
        when(users.findById(id)).thenReturn(Optional.of(user));
        return jwtService.generateToken(user);
    }

    private AppUser user(Long id, Long tenantId, String role) {
        AppUser user = new AppUser();
        user.setUserId(id);
        user.setEmail("user@example.test");
        user.setRole(role);
        user.setTenantId(tenantId);
        return user;
    }

    private String bearer(String token) { return "Bearer " + token; }

    private String customerJson() {
        return "{\"name\":\"Customer\",\"email\":\"customer@example.test\",\"phone\":\"1234567890\",\"tenantId\":" + TENANT_B + "}";
    }

    private String leadJson() {
        return "{\"customerId\":1,\"source\":\"WEB\",\"status\":\"NEW\",\"interestedVehicle\":\"Car\",\"tenantId\":" + TENANT_B + "}";
    }

    private String testDriveJson() {
        return "{\"customerId\":1,\"vehicleId\":2,\"scheduledDateTime\":\"2030-01-01T10:00:00\",\"status\":\"SCHEDULED\",\"tenantId\":" + TENANT_B + "}";
    }

    private String saleJson() {
        return "{\"customerId\":1,\"vehicleId\":2,\"saleDate\":\"2030-01-01\",\"salePrice\":1000,\"paymentStatus\":\"PENDING\",\"saleStatus\":\"DRAFT\",\"tenantId\":" + TENANT_B + "}";
    }

    private String financeJson() {
        return "{\"customerId\":1,\"saleId\":2,\"loanAmount\":1000,\"downPayment\":0,\"interestRate\":0,\"tenureMonths\":1,\"financeStatus\":\"ACTIVE\",\"tenantId\":" + TENANT_B + "}";
    }

    @TestConfiguration
    static class ServiceConfiguration {
        @Bean AppUserService appUserService(AppUserRepository users, PasswordEncoder passwordEncoder,
                AuditLogService audit) {
            return new AppUserService(users, passwordEncoder, audit);
        }
        @Bean CustomerService customerService(CustomerRepository customers, AuditLogService audit) {
            return new CustomerService(customers, audit);
        }
        @Bean WorkAssignmentAccess workAssignmentAccess(AppUserRepository users) {
            return new WorkAssignmentAccess(users);
        }
        @Bean LeadService leadService(LeadRepository leads, CustomerRepository customers, AuditLogService audit,
                WorkAssignmentAccess access) {
            return new LeadService(leads, customers, audit, access);
        }
        @Bean TestDriveService testDriveService(TestDriveRepository drives, CustomerRepository customers,
                VehicleRepository vehicles, AuditLogService audit, WorkAssignmentAccess access) {
            return new TestDriveService(drives, customers, vehicles, audit, access);
        }
        @Bean SaleService saleService(SaleRepository sales, CustomerRepository customers, VehicleService vehicles,
                AuditLogService audit) {
            return new SaleService(sales, customers, vehicles, audit);
        }
        @Bean FinanceService financeService(FinanceRepository finances, CustomerRepository customers,
                SaleRepository sales, AuditLogService audit) {
            return new FinanceService(finances, customers, sales, audit);
        }
    }
}

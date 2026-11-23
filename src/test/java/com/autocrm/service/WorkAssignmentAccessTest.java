package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.autocrm.model.AppUser;
import com.autocrm.model.Lead;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.security.TenantContext;

@ExtendWith(MockitoExtension.class)
class WorkAssignmentAccessTest {
    private static final Long TENANT = 12L;
    @Mock private AppUserRepository users;
    @Mock private LeadRepository leads;
    @Mock private CustomerRepository customers;
    @Mock private AuditLogService audit;
    private WorkAssignmentAccess access;

    @BeforeEach void setUp() { TenantContext.setTenantId(TENANT); access = new WorkAssignmentAccess(users); }
    @AfterEach void clean() { TenantContext.clear(); SecurityContextHolder.clearContext(); }

    @Test void acceptsOnlySameTenantSalesAssignee() {
        AppUser sales = user(41L, TENANT, "SALES");
        when(users.findByUserIdAndTenantId(41L, TENANT)).thenReturn(Optional.of(sales));
        assertEquals(41L, access.validateSalesAssignee(41L));
        assertThrows(IllegalArgumentException.class, () -> access.validateSalesAssignee(42L));
        verify(users).findByUserIdAndTenantId(42L, TENANT);
    }

    @Test void rejectsAdminAsAssigneeAndAllowsExplicitUnassignment() {
        when(users.findByUserIdAndTenantId(41L, TENANT)).thenReturn(Optional.of(user(41L, TENANT, "ADMIN")));
        assertThrows(IllegalArgumentException.class, () -> access.validateSalesAssignee(41L));
        assertNull(access.validateSalesAssignee(null));
    }

    @Test void adminSeesDealershipWorkWhileSalesIsQueriedOnlyForOwnAssignments() {
        Lead one = new Lead(); one.setLeadId(1L); one.setAssignedUserId(41L);
        Lead two = new Lead(); two.setLeadId(2L); two.setAssignedUserId(null);
        LeadService service = new LeadService(leads, customers, audit, access);
        authenticate("admin@example.com", "ADMIN");
        when(leads.findByTenantId(TENANT)).thenReturn(List.of(one, two));
        assertEquals(2, service.getAllLeads().size());

        authenticate("sales@example.com", "SALES");
        when(users.findByEmail("sales@example.com")).thenReturn(Optional.of(user(41L, TENANT, "SALES")));
        when(leads.findByTenantIdAndAssignedUserId(TENANT, 41L)).thenReturn(List.of(one));
        assertEquals(List.of(one), service.getAllLeads());
    }

    @Test void salesCannotAccessAnotherEmployeesOrUnassignedRecord() {
        authenticate("sales@example.com", "SALES");
        when(users.findByEmail("sales@example.com")).thenReturn(Optional.of(user(41L, TENANT, "SALES")));
        assertThrows(AccessDeniedException.class, () -> access.requireRecordAccess(42L));
        assertThrows(AccessDeniedException.class, () -> access.requireRecordAccess(null));
        assertDoesNotThrow(() -> access.requireRelatedRecordAccess(null));
        assertThrows(AccessDeniedException.class, () -> access.requireRelatedRecordAccess(42L));
        assertDoesNotThrow(() -> access.requireRecordAccess(41L));
    }

    @Test void reassignmentIsAuditedAndClientUpdateCannotChangeAssignment() {
        authenticate("admin@example.com", "ADMIN");
        AppUser sales = user(41L, TENANT, "SALES");
        when(users.findByUserIdAndTenantId(41L, TENANT)).thenReturn(Optional.of(sales));
        Lead lead = new Lead(); lead.setLeadId(5L); lead.setCustomerId(8L); lead.setTenantId(TENANT);
        lead.setStatus("NEW"); lead.setAssignedUserId(null);
        when(leads.findByLeadIdAndTenantId(5L, TENANT)).thenReturn(Optional.of(lead));
        when(leads.save(lead)).thenReturn(lead);
        LeadService service = new LeadService(leads, customers, audit, access);

        service.assignLead(5L, 41L);
        assertEquals(41L, lead.getAssignedUserId());
        verify(audit).record("LEAD_ASSIGNED", "LEAD", 5L, "assigneeId: null -> 41");

        lead.setAssignedUserId(null); // Legacy unassigned records remain unassigned through normal edits.
        Lead request = new Lead(); request.setCustomerId(8L); request.setSource("WEB"); request.setStatus("CONTACTED");
        request.setInterestedVehicle("Vehicle"); request.setAssignedUserId(99L);
        when(customers.findByCustomerIdAndTenantId(8L, TENANT)).thenReturn(Optional.of(new com.autocrm.model.Customer()));
        service.updateLead(5L, request);
        assertNull(lead.getAssignedUserId());
    }

    private void authenticate(String email, String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(email, "",
                List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }

    private AppUser user(Long id, Long tenantId, String role) {
        AppUser user = new AppUser(); user.setUserId(id); user.setTenantId(tenantId); user.setRole(role); return user;
    }
}

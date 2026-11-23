package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.autocrm.exception.BusinessException;
import com.autocrm.model.Activity;
import com.autocrm.model.Customer;
import com.autocrm.model.Lead;
import com.autocrm.repository.ActivityRepository;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.security.TenantContext;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

    private static final Long TENANT_ID = 17L;

    @Mock private ActivityRepository activityRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private LeadRepository leadRepository;
    @Mock private AuditLogService auditLogService;
    @Mock private WorkAssignmentAccess assignmentAccess;

    private ActivityService service;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TENANT_ID);
        service = new ActivityService(activityRepository, customerRepository, leadRepository, auditLogService, assignmentAccess);
    }

    @AfterEach
    void clearTenantContext() {
        TenantContext.clear();
    }

    @Test
    void createsActivityWhenLeadBelongsToSelectedCustomer() {
        Customer customer = customer(31L);
        Lead lead = lead(42L, customer.getCustomerId());
        Activity activity = new Activity();
        activity.setCustomerId(customer.getCustomerId());
        activity.setLeadId(lead.getLeadId());
        activity.setActivityType("CALL");
        activity.setNotes("Follow-up call");

        when(customerRepository.findByCustomerIdAndTenantId(31L, TENANT_ID))
                .thenReturn(Optional.of(customer));
        when(leadRepository.findByLeadIdAndTenantId(42L, TENANT_ID))
                .thenReturn(Optional.of(lead));
        when(activityRepository.save(any(Activity.class))).thenAnswer(invocation -> {
            Activity saved = invocation.getArgument(0);
            saved.setActivityId(53L);
            return saved;
        });

        Activity saved = service.createActivity(activity);

        assertEquals(TENANT_ID, saved.getTenantId());
        assertEquals(31L, saved.getCustomerId());
        assertEquals(42L, saved.getLeadId());
        assertEquals("CALL", saved.getActivityType());
        assertEquals("Follow-up call", saved.getNotes());
        verify(activityRepository).save(activity);
        verify(auditLogService).record("ACTIVITY_CREATED", "ACTIVITY", 53L,
                "scheduledDateTime: null; nextFollowUpDate: null");
    }

    @Test
    void rejectsActivityWhenLeadBelongsToDifferentCustomerWithoutSaving() {
        Customer selectedCustomer = customer(31L);
        Lead lead = lead(42L, 99L);
        Activity activity = new Activity();
        activity.setCustomerId(selectedCustomer.getCustomerId());
        activity.setLeadId(lead.getLeadId());

        when(customerRepository.findByCustomerIdAndTenantId(31L, TENANT_ID))
                .thenReturn(Optional.of(selectedCustomer));
        when(leadRepository.findByLeadIdAndTenantId(42L, TENANT_ID))
                .thenReturn(Optional.of(lead));

        BusinessException error = assertThrows(BusinessException.class, () -> service.createActivity(activity));

        assertEquals("Lead does not belong to selected customer", error.getMessage());
        verify(activityRepository, never()).save(any(Activity.class));
        verifyNoInteractions(auditLogService);
    }

    @Test
    void updatesFollowUpFieldsWithoutChangingTenantOrAssignmentAndAuditsStatus() {
        Customer customer = customer(31L);
        Lead lead = lead(42L, customer.getCustomerId());
        Activity existing = new Activity();
        existing.setActivityId(53L);
        existing.setTenantId(TENANT_ID);
        existing.setAssignedUserId(72L);
        existing.setCustomerId(31L);
        existing.setLeadId(42L);
        existing.setStatus("OPEN");
        Activity request = new Activity();
        request.setCustomerId(31L);
        request.setLeadId(42L);
        request.setStatus("COMPLETED");
        request.setNotes("Customer contacted");

        when(activityRepository.findByActivityIdAndTenantId(53L, TENANT_ID)).thenReturn(Optional.of(existing));
        when(customerRepository.findByCustomerIdAndTenantId(31L, TENANT_ID)).thenReturn(Optional.of(customer));
        when(leadRepository.findByLeadIdAndTenantId(42L, TENANT_ID)).thenReturn(Optional.of(lead));
        when(activityRepository.save(existing)).thenReturn(existing);

        Activity updated = service.updateActivity(53L, request);

        assertEquals("COMPLETED", updated.getStatus());
        assertEquals("Customer contacted", updated.getNotes());
        assertEquals(TENANT_ID, updated.getTenantId());
        assertEquals(72L, updated.getAssignedUserId());
        verify(assignmentAccess).requireRecordAccess(72L);
        verify(auditLogService).record("ACTIVITY_UPDATED", "ACTIVITY", 53L,
                "status: OPEN -> COMPLETED; nextFollowUpDate: null");
    }

    @Test
    void refusesToUpdateActivityWhenAssignmentAccessDeniesTheActor() {
        Activity existing = new Activity();
        existing.setActivityId(53L);
        existing.setAssignedUserId(72L);
        when(activityRepository.findByActivityIdAndTenantId(53L, TENANT_ID)).thenReturn(Optional.of(existing));
        org.mockito.Mockito.doThrow(new AccessDeniedException("Record not found"))
                .when(assignmentAccess).requireRecordAccess(72L);

        assertThrows(AccessDeniedException.class, () -> service.updateActivity(53L, new Activity()));

        verify(activityRepository, never()).save(any(Activity.class));
        verifyNoInteractions(customerRepository, leadRepository, auditLogService);
    }

    private Customer customer(Long id) {
        Customer customer = new Customer();
        customer.setCustomerId(id);
        customer.setTenantId(TENANT_ID);
        return customer;
    }

    private Lead lead(Long id, Long customerId) {
        Lead lead = new Lead();
        lead.setLeadId(id);
        lead.setCustomerId(customerId);
        lead.setTenantId(TENANT_ID);
        return lead;
    }
}

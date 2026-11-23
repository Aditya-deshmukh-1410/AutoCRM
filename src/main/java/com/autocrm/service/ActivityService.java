package com.autocrm.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.exception.BusinessException;
import com.autocrm.model.Activity;
import com.autocrm.model.Customer;
import com.autocrm.model.Lead;
import com.autocrm.repository.ActivityRepository;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.security.TenantContext;

@Service
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final CustomerRepository customerRepository;
    private final LeadRepository leadRepository;
    private final AuditLogService auditLogService;
    private final WorkAssignmentAccess assignmentAccess;

    public ActivityService(ActivityRepository activityRepository, CustomerRepository customerRepository,
            LeadRepository leadRepository, AuditLogService auditLogService, WorkAssignmentAccess assignmentAccess) {

        this.activityRepository = activityRepository;
        this.customerRepository = customerRepository;
        this.leadRepository = leadRepository;
        this.auditLogService = auditLogService;
        this.assignmentAccess = assignmentAccess;
    }

    @Transactional
    public Activity createActivity(Activity activity) {

        Long tenantId = TenantContext.requireTenantId();

        Customer customer = customerRepository.findByCustomerIdAndTenantId(activity.getCustomerId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        Lead lead = leadRepository.findByLeadIdAndTenantId(activity.getLeadId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Lead not found"));
        assignmentAccess.requireRelatedRecordAccess(lead.getAssignedUserId());

        if (!customer.getCustomerId().equals(lead.getCustomerId())) {
            throw new BusinessException("Lead does not belong to selected customer");
        }

        activity.setActivityId(null);
        activity.setTenantId(tenantId);
        activity.setAssignedUserId(null);

        Activity savedActivity = activityRepository.save(activity);
        auditLogService.record("ACTIVITY_CREATED", "ACTIVITY", savedActivity.getActivityId(),
                "scheduledDateTime: " + savedActivity.getScheduledDateTime() + "; nextFollowUpDate: "
                        + savedActivity.getNextFollowUpDate());
        return savedActivity;
    }

    public List<Activity> getAllActivities() {

        Long tenantId = TenantContext.requireTenantId();

        if (assignmentAccess.isAdmin()) return activityRepository.findByTenantId(tenantId);
        if (!assignmentAccess.isSales()) throw new org.springframework.security.access.AccessDeniedException("Role not permitted");
        return activityRepository.findByTenantIdAndAssignedUserId(tenantId, assignmentAccess.currentUserId());
    }

    public Activity getActivityById(Long activityId) {

        Long tenantId = TenantContext.requireTenantId();

        Activity activity = activityRepository.findByActivityIdAndTenantId(activityId, tenantId)
                .orElseThrow(() -> new RuntimeException("Activity not found"));
        assignmentAccess.requireRecordAccess(activity.getAssignedUserId());
        return activity;
    }

    @Transactional
    public Activity updateActivity(Long activityId, Activity updatedActivity) {
        Long tenantId = TenantContext.requireTenantId();
        Activity existing = activityRepository.findByActivityIdAndTenantId(activityId, tenantId)
                .orElseThrow(() -> new RuntimeException("Activity not found"));
        assignmentAccess.requireRecordAccess(existing.getAssignedUserId());

        Customer customer = customerRepository.findByCustomerIdAndTenantId(updatedActivity.getCustomerId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        Lead lead = leadRepository.findByLeadIdAndTenantId(updatedActivity.getLeadId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Lead not found"));
        assignmentAccess.requireRelatedRecordAccess(lead.getAssignedUserId());
        if (!customer.getCustomerId().equals(lead.getCustomerId())) {
            throw new BusinessException("Lead does not belong to selected customer");
        }

        String previousStatus = existing.getStatus();
        existing.setCustomerId(customer.getCustomerId());
        existing.setLeadId(lead.getLeadId());
        existing.setActivityType(updatedActivity.getActivityType());
        existing.setNotes(updatedActivity.getNotes());
        existing.setScheduledDateTime(updatedActivity.getScheduledDateTime());
        existing.setStatus(updatedActivity.getStatus());
        existing.setNextFollowUpDate(updatedActivity.getNextFollowUpDate());
        Activity saved = activityRepository.save(existing);
        auditLogService.record("ACTIVITY_UPDATED", "ACTIVITY", saved.getActivityId(),
                "status: " + previousStatus + " -> " + saved.getStatus()
                        + "; nextFollowUpDate: " + saved.getNextFollowUpDate());
        return saved;
    }

    @Transactional
    public Activity assignActivity(Long activityId, Long assigneeId) {
        Long tenantId = TenantContext.requireTenantId();
        Activity activity = activityRepository.findByActivityIdAndTenantId(activityId, tenantId)
                .orElseThrow(() -> new RuntimeException("Activity not found"));
        Long validatedAssignee = assignmentAccess.validateSalesAssignee(assigneeId);
        Long previous = activity.getAssignedUserId();
        activity.setAssignedUserId(validatedAssignee);
        Activity saved = activityRepository.save(activity);
        auditLogService.record("ACTIVITY_ASSIGNED", "ACTIVITY", saved.getActivityId(), "assigneeId: " + previous + " -> " + validatedAssignee);
        return saved;
    }
}

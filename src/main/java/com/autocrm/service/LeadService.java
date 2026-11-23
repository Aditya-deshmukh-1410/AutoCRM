package com.autocrm.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.model.Lead;
import com.autocrm.model.Customer;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.security.TenantContext;

@Service
public class LeadService {

    private final LeadRepository leadRepository;
    private final CustomerRepository customerRepository;
    private final AuditLogService auditLogService;
    private final WorkAssignmentAccess assignmentAccess;

    public LeadService(LeadRepository leadRepository, CustomerRepository customerRepository,
            AuditLogService auditLogService, WorkAssignmentAccess assignmentAccess) {

        this.leadRepository = leadRepository;
        this.customerRepository = customerRepository;
        this.auditLogService = auditLogService;
        this.assignmentAccess = assignmentAccess;
    }

    @Transactional
    public Lead createLead(Lead lead) {

        Long tenantId = TenantContext.requireTenantId();

        customerRepository.findByCustomerIdAndTenantId(lead.getCustomerId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        lead.setLeadId(null);
        lead.setTenantId(tenantId);
        lead.setAssignedUserId(null);

        Lead savedLead = leadRepository.save(lead);
        auditLogService.record("LEAD_CREATED", "LEAD", savedLead.getLeadId(),
                "status: (new) -> " + savedLead.getStatus());
        return savedLead;
    }

    @Transactional
    public Lead createForPublicEnquiry(Lead lead, Customer customer, Vehicle publishedVehicle) {
        if (publishedVehicle == null || !publishedVehicle.isPubliclyVisible() || publishedVehicle.getTenantId() == null
                || customer == null || customer.getCustomerId() == null
                || !publishedVehicle.getTenantId().equals(customer.getTenantId())) {
            throw new IllegalArgumentException("Enquiry customer and published vehicle must belong to the same dealership");
        }
        customerRepository.findByCustomerIdAndTenantId(customer.getCustomerId(), publishedVehicle.getTenantId())
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        lead.setLeadId(null);
        lead.setCustomerId(customer.getCustomerId());
        lead.setTenantId(publishedVehicle.getTenantId());
        lead.setAssignedUserId(null);
        Lead savedLead = leadRepository.save(lead);
        auditLogService.recordPublicEnquiry(publishedVehicle.getTenantId(), "LEAD_CREATED", "LEAD",
                savedLead.getLeadId());
        return savedLead;
    }

    public List<Lead> getAllLeads() {

        Long tenantId = TenantContext.requireTenantId();

        if (assignmentAccess.isAdmin()) return leadRepository.findByTenantId(tenantId);
        if (!assignmentAccess.isSales()) throw new org.springframework.security.access.AccessDeniedException("Role not permitted");
        return leadRepository.findByTenantIdAndAssignedUserId(tenantId, assignmentAccess.currentUserId());
    }

    public Lead getLeadById(Long leadId) {

        Long tenantId = TenantContext.requireTenantId();

        Lead lead = leadRepository.findByLeadIdAndTenantId(leadId, tenantId)
                .orElseThrow(() -> new RuntimeException("Lead not found"));
        assignmentAccess.requireRecordAccess(lead.getAssignedUserId());
        return lead;
    }

    @Transactional
    public Lead updateLead(Long leadId, Lead updatedLead) {

        Long tenantId = TenantContext.requireTenantId();

        Lead existingLead = leadRepository.findByLeadIdAndTenantId(leadId, tenantId)
                .orElseThrow(() -> new RuntimeException("Lead not found"));
        assignmentAccess.requireRecordAccess(existingLead.getAssignedUserId());

        customerRepository.findByCustomerIdAndTenantId(updatedLead.getCustomerId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        String previousStatus = existingLead.getStatus();
        existingLead.setSource(updatedLead.getSource());
        existingLead.setStatus(updatedLead.getStatus());
        existingLead.setInterestedVehicle(updatedLead.getInterestedVehicle());
        existingLead.setNotes(updatedLead.getNotes());
        existingLead.setCustomerId(updatedLead.getCustomerId());

        Lead savedLead = leadRepository.save(existingLead);
        String auditAction = java.util.Objects.equals(previousStatus, savedLead.getStatus()) ? "LEAD_UPDATED" : "LEAD_STATUS_CHANGED";
        auditLogService.record(auditAction, "LEAD", savedLead.getLeadId(),
                "Lead record updated; status: " + previousStatus + " -> " + savedLead.getStatus());
        return savedLead;
    }

    @Transactional
    public void deleteLead(Long leadId) {

        Long tenantId = TenantContext.requireTenantId();

        Lead existingLead = leadRepository.findByLeadIdAndTenantId(leadId, tenantId)
                .orElseThrow(() -> new RuntimeException("Lead not found"));
        assignmentAccess.requireRecordAccess(existingLead.getAssignedUserId());

        leadRepository.delete(existingLead);
        auditLogService.record("LEAD_DELETED", "LEAD", existingLead.getLeadId(),
                "status: " + existingLead.getStatus() + " -> DELETED");
    }

    @Transactional
    public Lead assignLead(Long leadId, Long assigneeId) {
        Long tenantId = TenantContext.requireTenantId();
        Lead lead = leadRepository.findByLeadIdAndTenantId(leadId, tenantId)
                .orElseThrow(() -> new RuntimeException("Lead not found"));
        Long validatedAssignee = assignmentAccess.validateSalesAssignee(assigneeId);
        Long previous = lead.getAssignedUserId();
        lead.setAssignedUserId(validatedAssignee);
        Lead saved = leadRepository.save(lead);
        auditLogService.record("LEAD_ASSIGNED", "LEAD", saved.getLeadId(), "assigneeId: " + previous + " -> " + validatedAssignee);
        return saved;
    }
}

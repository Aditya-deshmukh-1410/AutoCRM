package com.autocrm.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;
import com.autocrm.dto.AssignmentRequest;

import com.autocrm.model.Lead;
import com.autocrm.service.LeadService;

@RestController
@RequestMapping("/api/leads")
@PreAuthorize("hasAnyRole('ADMIN', 'SALES')")
public class LeadController {

    private final LeadService leadService;

    public LeadController(LeadService leadService) {
        this.leadService = leadService;
    }

    @PostMapping
    public Lead createLead(@Valid @RequestBody Lead lead) {
        return leadService.createLead(lead);
    }

    @GetMapping
    public List<Lead> getAllLeads() {
        return leadService.getAllLeads();
    }

    @GetMapping("/{leadId}")
    public Lead getLeadById(@PathVariable Long leadId) {
        return leadService.getLeadById(leadId);
    }

    @PutMapping("/{leadId}")
    public Lead updateLead(@PathVariable Long leadId, @Valid @RequestBody Lead lead) {

        return leadService.updateLead(leadId, lead);
    }

    @DeleteMapping("/{leadId}")
    public String deleteLead(@PathVariable Long leadId) {
        leadService.deleteLead(leadId);

        return "Lead deleted successfully!";
    }

    @org.springframework.web.bind.annotation.PutMapping("/{leadId}/assignment")
    @PreAuthorize("hasRole('ADMIN')")
    public Lead assignLead(@PathVariable Long leadId, @Valid @RequestBody AssignmentRequest request) {
        return leadService.assignLead(leadId, request.assigneeId());
    }
}

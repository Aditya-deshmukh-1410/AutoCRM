package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.autocrm.model.Customer;
import com.autocrm.model.Lead;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.LeadRepository;

@ExtendWith(MockitoExtension.class)
class PublicEnquiryTenantAssignmentTest {

    @Mock private CustomerRepository customerRepository;
    @Mock private LeadRepository leadRepository;
    @Mock private AuditLogService auditLogService;

    @Test
    void customerTenantAndAuditComeFromPublishedVehicle() {
        CustomerService service = new CustomerService(customerRepository, auditLogService);
        Vehicle vehicle = publishedVehicle();
        when(customerRepository.save(any(Customer.class))).thenAnswer(call -> {
            Customer customer = call.getArgument(0);
            customer.setCustomerId(22L);
            return customer;
        });
        Customer customer = new Customer();
        customer.setName("Visitor");
        customer.setEmail("visitor@example.com");
        customer.setPhone("1234567890");

        Customer saved = service.createForPublicEnquiry(customer, vehicle);

        assertEquals(5L, saved.getTenantId());
        assertNull(saved.getAddress());
        verify(auditLogService).recordPublicEnquiry(5L, "CUSTOMER_CREATED", "CUSTOMER", 22L);
    }

    @Test
    void leadCustomerAndAuditUseThePublishedVehiclesTenant() {
        LeadService service = new LeadService(leadRepository, customerRepository, auditLogService, null);
        Vehicle vehicle = publishedVehicle();
        Customer customer = new Customer();
        customer.setCustomerId(22L);
        customer.setTenantId(5L);
        when(customerRepository.findByCustomerIdAndTenantId(22L, 5L)).thenReturn(Optional.of(customer));
        when(leadRepository.save(any(Lead.class))).thenAnswer(call -> {
            Lead lead = call.getArgument(0);
            lead.setLeadId(33L);
            return lead;
        });
        Lead lead = new Lead();
        lead.setSource("PUBLIC_SHOWROOM");
        lead.setStatus("NEW");
        lead.setInterestedVehicle("2027 Example Model (Vehicle ID 7)");

        Lead saved = service.createForPublicEnquiry(lead, customer, vehicle);

        assertEquals(5L, saved.getTenantId());
        assertEquals(22L, saved.getCustomerId());
        assertNull(saved.getAssignedUserId(), "Public showroom enquiries must remain unassigned");
        verify(auditLogService).recordPublicEnquiry(5L, "LEAD_CREATED", "LEAD", 33L);
    }

    private Vehicle publishedVehicle() {
        Vehicle vehicle = new Vehicle();
        vehicle.setVehicleId(7L);
        vehicle.setTenantId(5L);
        vehicle.setPubliclyVisible(true);
        return vehicle;
    }
}

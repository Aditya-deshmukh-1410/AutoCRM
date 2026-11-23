package com.autocrm.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.model.Customer;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.security.TenantContext;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final AuditLogService auditLogService;

    public CustomerService(CustomerRepository customerRepository, AuditLogService auditLogService) {
        this.customerRepository = customerRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public Customer createCustomer(Customer customer) {

        Long tenantId = TenantContext.requireTenantId();

        customer.setCustomerId(null);
        customer.setTenantId(tenantId);

        Customer savedCustomer = customerRepository.save(customer);
        auditLogService.record("CUSTOMER_CREATED", "CUSTOMER", savedCustomer.getCustomerId(), "Customer record created.");
        return savedCustomer;
    }

    @Transactional
    public Customer createForPublicEnquiry(Customer customer, Vehicle publishedVehicle) {
        if (publishedVehicle == null || !publishedVehicle.isPubliclyVisible() || publishedVehicle.getTenantId() == null) {
            throw new IllegalArgumentException("A published dealership vehicle is required");
        }
        customer.setCustomerId(null);
        customer.setTenantId(publishedVehicle.getTenantId());
        Customer savedCustomer = customerRepository.save(customer);
        auditLogService.recordPublicEnquiry(publishedVehicle.getTenantId(), "CUSTOMER_CREATED", "CUSTOMER",
                savedCustomer.getCustomerId());
        return savedCustomer;
    }

    public List<Customer> getAllCustomers() {

        Long tenantId = TenantContext.requireTenantId();

        return customerRepository.findByTenantId(tenantId);
    }

    public Customer getCustomerById(Long customerId) {

        Long tenantId = TenantContext.requireTenantId();

        return customerRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
    }

    @Transactional
    public Customer updateCustomer(Long customerId, Customer updatedCustomer) {

        Long tenantId = TenantContext.requireTenantId();

        Customer existingCustomer = customerRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        existingCustomer.setName(updatedCustomer.getName());
        existingCustomer.setEmail(updatedCustomer.getEmail());
        existingCustomer.setPhone(updatedCustomer.getPhone());
        existingCustomer.setAddress(updatedCustomer.getAddress());

        Customer savedCustomer = customerRepository.save(existingCustomer);
        auditLogService.record("CUSTOMER_UPDATED", "CUSTOMER", savedCustomer.getCustomerId(), "Customer profile fields updated.");
        return savedCustomer;
    }

    @Transactional
    public void deleteCustomer(Long customerId) {

        Long tenantId = TenantContext.requireTenantId();

        Customer existingCustomer = customerRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        customerRepository.delete(existingCustomer);
        auditLogService.record("CUSTOMER_DELETED", "CUSTOMER", existingCustomer.getCustomerId(), null);
    }
}

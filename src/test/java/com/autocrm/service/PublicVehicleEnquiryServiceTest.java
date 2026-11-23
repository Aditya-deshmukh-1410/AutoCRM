package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

import com.autocrm.dto.PublicVehicleEnquiryRequest;
import com.autocrm.dto.PublicVehicleEnquiryResponse;
import com.autocrm.model.Customer;
import com.autocrm.model.Lead;
import com.autocrm.model.Vehicle;

@ExtendWith(MockitoExtension.class)
class PublicVehicleEnquiryServiceTest {

    @Mock private VehicleService vehicleService;
    @Mock private CustomerService customerService;
    @Mock private LeadService leadService;

    private PublicVehicleEnquiryService service;
    private Vehicle publishedVehicle;

    @BeforeEach
    void setUp() {
        service = new PublicVehicleEnquiryService(vehicleService, customerService, leadService);
        publishedVehicle = new Vehicle();
        publishedVehicle.setVehicleId(7L);
        publishedVehicle.setTenantId(5L);
        publishedVehicle.setPubliclyVisible(true);
        publishedVehicle.setYear(2027);
        publishedVehicle.setMake("Example");
        publishedVehicle.setModel("Model");
    }

    @Test
    void createsCustomerAndNewLeadUsingTheVehicleTenant() {
        when(vehicleService.getPublishedVehicleById(7L)).thenReturn(publishedVehicle);
        when(customerService.createForPublicEnquiry(any(Customer.class), same(publishedVehicle)))
                .thenAnswer(call -> {
                    Customer customer = call.getArgument(0);
                    customer.setCustomerId(22L);
                    customer.setTenantId(publishedVehicle.getTenantId());
                    return customer;
                });

        PublicVehicleEnquiryResponse response = service.submit(7L,
                new PublicVehicleEnquiryRequest(" Visitor ", " 1234567890 ", " visitor@example.com "));

        ArgumentCaptor<Customer> customerCaptor = ArgumentCaptor.forClass(Customer.class);
        verify(customerService).createForPublicEnquiry(customerCaptor.capture(), same(publishedVehicle));
        Customer customer = customerCaptor.getValue();
        assertEquals("Visitor", customer.getName());
        assertEquals("1234567890", customer.getPhone());
        assertEquals("visitor@example.com", customer.getEmail());
        assertTrue(customer.getAddress() == null);

        ArgumentCaptor<Lead> leadCaptor = ArgumentCaptor.forClass(Lead.class);
        verify(leadService).createForPublicEnquiry(leadCaptor.capture(), same(customer), same(publishedVehicle));
        Lead lead = leadCaptor.getValue();
        assertEquals("PUBLIC_SHOWROOM", lead.getSource());
        assertEquals("NEW", lead.getStatus());
        assertEquals("2027 Example Model (Vehicle ID 7)", lead.getInterestedVehicle());
        assertEquals("Thanks. The dealership will contact you.", response.message());
    }

    @Test
    void doesNotCreateRecordsWhenVehicleIsNotPublished() {
        when(vehicleService.getPublishedVehicleById(7L)).thenThrow(new RuntimeException("Vehicle not found"));

        assertThrows(RuntimeException.class, () -> service.submit(7L,
                new PublicVehicleEnquiryRequest("Visitor", "1234567890", "visitor@example.com")));
        verifyNoInteractions(customerService, leadService);
    }

    @Test
    void rejectsInvalidPublicInput() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();
            assertTrue(!validator.validate(new PublicVehicleEnquiryRequest(" ", "", "not-an-email")).isEmpty());
        }
    }

    @Test
    void rollsBackTheTransactionWhenLeadCreationFails() {
        when(vehicleService.getPublishedVehicleById(7L)).thenReturn(publishedVehicle);
        when(customerService.createForPublicEnquiry(any(Customer.class), same(publishedVehicle)))
                .thenAnswer(call -> {
                    Customer customer = call.getArgument(0);
                    customer.setCustomerId(22L);
                    customer.setTenantId(publishedVehicle.getTenantId());
                    return customer;
                });
        org.mockito.Mockito.doThrow(new IllegalStateException("Lead creation failed"))
                .when(leadService).createForPublicEnquiry(any(Lead.class), any(Customer.class), same(publishedVehicle));
        RecordingTransactionManager transactionManager = new RecordingTransactionManager();
        ProxyFactory proxyFactory = new ProxyFactory(service);
        proxyFactory.setProxyTargetClass(true);
        proxyFactory.addAdvice(new TransactionInterceptor(transactionManager, new AnnotationTransactionAttributeSource()));
        PublicVehicleEnquiryService transactionalService = (PublicVehicleEnquiryService) proxyFactory.getProxy();

        assertThrows(IllegalStateException.class, () -> transactionalService.submit(7L,
                new PublicVehicleEnquiryRequest("Visitor", "1234567890", "visitor@example.com")));
        assertTrue(transactionManager.rolledBack);
    }

    private static final class RecordingTransactionManager extends AbstractPlatformTransactionManager {
        private boolean rolledBack;

        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object transaction, TransactionDefinition definition) { }
        @Override protected void doCommit(DefaultTransactionStatus status) { }
        @Override protected void doRollback(DefaultTransactionStatus status) { rolledBack = true; }
    }
}
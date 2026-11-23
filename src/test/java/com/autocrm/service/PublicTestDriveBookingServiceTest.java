package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.autocrm.dto.PublicTestDriveBookingRequest;
import com.autocrm.dto.PublicTestDriveBookingResponse;
import com.autocrm.model.Customer;
import com.autocrm.model.TestDrive;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.TestDriveRepository;

@ExtendWith(MockitoExtension.class)
class PublicTestDriveBookingServiceTest {

    @Mock private VehicleService vehicleService;
    @Mock private CustomerService customerService;
    @Mock private TestDriveRepository testDriveRepository;
    @Mock private AuditLogService auditLogService;

    private PublicTestDriveBookingService service;
    private Vehicle publishedVehicle;

    @BeforeEach
    void setUp() {
        service = new PublicTestDriveBookingService(vehicleService, customerService, testDriveRepository, auditLogService);
        publishedVehicle = new Vehicle();
        publishedVehicle.setVehicleId(7L);
        publishedVehicle.setTenantId(5L);
        publishedVehicle.setPubliclyVisible(true);
    }

    @Test
    void bookingUsesPublishedVehicleTenantAndLeavesDriveUnassigned() {
        LocalDateTime scheduledAt = LocalDateTime.of(2026, 11, 1, 14, 30);
        when(vehicleService.getPublishedVehicleById(7L)).thenReturn(publishedVehicle);
        when(customerService.createForPublicEnquiry(any(Customer.class), same(publishedVehicle))).thenAnswer(call -> {
            Customer customer = call.getArgument(0);
            customer.setCustomerId(22L);
            customer.setTenantId(5L);
            return customer;
        });
        when(testDriveRepository.save(any(TestDrive.class))).thenAnswer(call -> {
            TestDrive testDrive = call.getArgument(0);
            testDrive.setTestDriveId(33L);
            return testDrive;
        });

        PublicTestDriveBookingResponse response = service.submit(7L,
                new PublicTestDriveBookingRequest(" Visitor ", " 1234567890 ", " visitor@example.com ", scheduledAt));

        ArgumentCaptor<Customer> customerCaptor = ArgumentCaptor.forClass(Customer.class);
        verify(customerService).createForPublicEnquiry(customerCaptor.capture(), same(publishedVehicle));
        assertEquals("Visitor", customerCaptor.getValue().getName());
        assertEquals("1234567890", customerCaptor.getValue().getPhone());
        assertEquals("visitor@example.com", customerCaptor.getValue().getEmail());

        ArgumentCaptor<TestDrive> driveCaptor = ArgumentCaptor.forClass(TestDrive.class);
        verify(testDriveRepository).save(driveCaptor.capture());
        TestDrive saved = driveCaptor.getValue();
        assertEquals(22L, saved.getCustomerId());
        assertEquals(7L, saved.getVehicleId());
        assertEquals(5L, saved.getTenantId());
        assertEquals("SCHEDULED", saved.getStatus());
        assertEquals(scheduledAt, saved.getScheduledDateTime());
        assertNull(saved.getAssignedUserId());
        verify(auditLogService).recordPublicEnquiry(5L, "TEST_DRIVE_BOOKED", "TEST_DRIVE", 33L);
        assertEquals("Thanks. The dealership will confirm your test-drive appointment.", response.message());
    }

    @Test
    void unpublishedVehicleCannotCreateCustomerOrBooking() {
        when(vehicleService.getPublishedVehicleById(7L)).thenThrow(new RuntimeException("Vehicle not found"));

        assertThrows(RuntimeException.class, () -> service.submit(7L,
                new PublicTestDriveBookingRequest("Visitor", "1234567890", "visitor@example.com",
                        LocalDateTime.of(2026, 11, 1, 14, 30))));
        verifyNoInteractions(customerService, testDriveRepository, auditLogService);
    }
}

package com.autocrm.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.dto.PublicTestDriveBookingRequest;
import com.autocrm.dto.PublicTestDriveBookingResponse;
import com.autocrm.model.Customer;
import com.autocrm.model.Lead;
import com.autocrm.model.TestDrive;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.TestDriveRepository;

@Service
public class PublicTestDriveBookingService {

    private final VehicleService vehicleService;
    private final CustomerService customerService;
    private final TestDriveRepository testDriveRepository;
    private final AuditLogService auditLogService;
    private CrmNotificationService notifications;
    private LeadService leadService;

    public PublicTestDriveBookingService(VehicleService vehicleService, CustomerService customerService,
            TestDriveRepository testDriveRepository, AuditLogService auditLogService) {
        this.vehicleService = vehicleService;
        this.customerService = customerService;
        this.testDriveRepository = testDriveRepository;
        this.auditLogService = auditLogService;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public void setNotifications(CrmNotificationService notifications) { this.notifications = notifications; }

    @org.springframework.beans.factory.annotation.Autowired
    public void setLeadService(LeadService leadService) { this.leadService = leadService; }

    @Transactional
    public PublicTestDriveBookingResponse submit(Long vehicleId, PublicTestDriveBookingRequest request) {
        Vehicle vehicle = vehicleService.getPublishedVehicleById(vehicleId);

        Customer customer = new Customer();
        customer.setName(request.name().trim());
        customer.setPhone(request.phone().trim());
        customer.setEmail(request.email().trim());
        Customer savedCustomer = customerService.createForPublicEnquiry(customer, vehicle);

        if (leadService != null) {
            Lead lead = new Lead();
            lead.setSource("PUBLIC_SHOWROOM");
            lead.setStatus("NEW");
            lead.setInterestedVehicle(vehicle.getYear() + " " + vehicle.getMake() + " " + vehicle.getModel()
                    + " (test drive)");
            lead.setNotes("Website test drive request for " + request.scheduledDateTime());
            leadService.createForPublicEnquiry(lead, savedCustomer, vehicle);
        }

        TestDrive testDrive = new TestDrive();
        testDrive.setCustomerId(savedCustomer.getCustomerId());
        testDrive.setVehicleId(vehicle.getVehicleId());
        testDrive.setScheduledDateTime(request.scheduledDateTime());
        testDrive.setStatus("SCHEDULED");
        testDrive.setTenantId(vehicle.getTenantId());
        testDrive.setAssignedUserId(null);
        TestDrive savedTestDrive = testDriveRepository.save(testDrive);
        auditLogService.recordPublicEnquiry(vehicle.getTenantId(), "TEST_DRIVE_BOOKED", "TEST_DRIVE",
                savedTestDrive.getTestDriveId());
        if (notifications != null) {
            notifications.create(vehicle.getTenantId(), "test_drive", "New test drive booking",
                    "A website visitor requested a test drive.", "TEST_DRIVE", savedTestDrive.getTestDriveId());
        }

        return new PublicTestDriveBookingResponse("Thanks. The dealership will confirm your test-drive appointment.");
    }
}

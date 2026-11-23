package com.autocrm.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.model.TestDrive;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.TestDriveRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.TenantContext;

@Service
public class TestDriveService {

    private final TestDriveRepository testDriveRepository;
    private final CustomerRepository customerRepository;
    private final VehicleRepository vehicleRepository;
    private final AuditLogService auditLogService;
    private final WorkAssignmentAccess assignmentAccess;

    public TestDriveService(TestDriveRepository testDriveRepository, CustomerRepository customerRepository,
            VehicleRepository vehicleRepository, AuditLogService auditLogService, WorkAssignmentAccess assignmentAccess) {

        this.testDriveRepository = testDriveRepository;
        this.customerRepository = customerRepository;
        this.vehicleRepository = vehicleRepository;
        this.auditLogService = auditLogService;
        this.assignmentAccess = assignmentAccess;
    }

    @Transactional
    public TestDrive createTestDrive(TestDrive testDrive) {

        Long tenantId = TenantContext.requireTenantId();

        customerRepository.findByCustomerIdAndTenantId(testDrive.getCustomerId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        vehicleRepository.findByVehicleIdAndTenantId(testDrive.getVehicleId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        testDrive.setTestDriveId(null);
        testDrive.setTenantId(tenantId);
        testDrive.setAssignedUserId(null);

        TestDrive savedTestDrive = testDriveRepository.save(testDrive);
        auditLogService.record("TEST_DRIVE_SCHEDULED", "TEST_DRIVE", savedTestDrive.getTestDriveId(),
                "scheduledDateTime: " + savedTestDrive.getScheduledDateTime() + "; status: (new) -> " + savedTestDrive.getStatus());
        return savedTestDrive;
    }

    public List<TestDrive> getAllTestDrives() {

        Long tenantId = TenantContext.requireTenantId();

        if (assignmentAccess.isAdmin()) return testDriveRepository.findByTenantId(tenantId);
        if (!assignmentAccess.isSales()) throw new org.springframework.security.access.AccessDeniedException("Role not permitted");
        return testDriveRepository.findByTenantIdAndAssignedUserId(tenantId, assignmentAccess.currentUserId());
    }

    public TestDrive getTestDriveById(Long testDriveId) {

        Long tenantId = TenantContext.requireTenantId();

        TestDrive drive = testDriveRepository.findByTestDriveIdAndTenantId(testDriveId, tenantId)
                .orElseThrow(() -> new RuntimeException("Test drive not found"));
        assignmentAccess.requireRecordAccess(drive.getAssignedUserId());
        return drive;
    }

    @Transactional
    public TestDrive updateTestDrive(Long testDriveId, TestDrive updatedTestDrive) {

        Long tenantId = TenantContext.requireTenantId();

        TestDrive existingTestDrive = testDriveRepository.findByTestDriveIdAndTenantId(testDriveId, tenantId)
                .orElseThrow(() -> new RuntimeException("Test drive not found"));
        assignmentAccess.requireRecordAccess(existingTestDrive.getAssignedUserId());

        customerRepository.findByCustomerIdAndTenantId(updatedTestDrive.getCustomerId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        vehicleRepository.findByVehicleIdAndTenantId(updatedTestDrive.getVehicleId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        String previousStatus = existingTestDrive.getStatus();
        String previousScheduledDateTime = String.valueOf(existingTestDrive.getScheduledDateTime());
        existingTestDrive.setCustomerId(updatedTestDrive.getCustomerId());

        existingTestDrive.setVehicleId(updatedTestDrive.getVehicleId());

        existingTestDrive.setScheduledDateTime(updatedTestDrive.getScheduledDateTime());

        existingTestDrive.setStatus(updatedTestDrive.getStatus());

        existingTestDrive.setNotes(updatedTestDrive.getNotes());

        TestDrive savedTestDrive = testDriveRepository.save(existingTestDrive);
        String auditAction = !java.util.Objects.equals(previousStatus, savedTestDrive.getStatus())
                ? "TEST_DRIVE_STATUS_CHANGED"
                : !previousScheduledDateTime.equals(String.valueOf(savedTestDrive.getScheduledDateTime()))
                        ? "TEST_DRIVE_RESCHEDULED" : "TEST_DRIVE_UPDATED";
        auditLogService.record(auditAction, "TEST_DRIVE", savedTestDrive.getTestDriveId(),
                "scheduledDateTime: " + previousScheduledDateTime + " -> "
                        + savedTestDrive.getScheduledDateTime() + "; status: " + previousStatus + " -> "
                        + savedTestDrive.getStatus());
        return savedTestDrive;
    }

    @Transactional
    public void deleteTestDrive(Long testDriveId) {

        Long tenantId = TenantContext.requireTenantId();

        TestDrive existingTestDrive = testDriveRepository.findByTestDriveIdAndTenantId(testDriveId, tenantId)
                .orElseThrow(() -> new RuntimeException("Test drive not found"));
        assignmentAccess.requireRecordAccess(existingTestDrive.getAssignedUserId());

        testDriveRepository.delete(existingTestDrive);
        auditLogService.record("TEST_DRIVE_DELETED", "TEST_DRIVE", existingTestDrive.getTestDriveId(),
                "status: " + existingTestDrive.getStatus() + " -> DELETED");
    }

    @Transactional
    public TestDrive assignTestDrive(Long testDriveId, Long assigneeId) {
        Long tenantId = TenantContext.requireTenantId();
        TestDrive drive = testDriveRepository.findByTestDriveIdAndTenantId(testDriveId, tenantId)
                .orElseThrow(() -> new RuntimeException("Test drive not found"));
        Long validatedAssignee = assignmentAccess.validateSalesAssignee(assigneeId);
        Long previous = drive.getAssignedUserId();
        drive.setAssignedUserId(validatedAssignee);
        TestDrive saved = testDriveRepository.save(drive);
        auditLogService.record("TEST_DRIVE_ASSIGNED", "TEST_DRIVE", saved.getTestDriveId(), "assigneeId: " + previous + " -> " + validatedAssignee);
        return saved;
    }
}

package com.autocrm.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.autocrm.model.TestDrive;
import com.autocrm.service.TestDriveService;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import com.autocrm.dto.AssignmentRequest;

@RestController
@RequestMapping("/api/test-drives")
@PreAuthorize("hasAnyRole('ADMIN', 'SALES')")
public class TestDriveController {

    private final TestDriveService testDriveService;

    public TestDriveController(TestDriveService testDriveService) {
        this.testDriveService = testDriveService;
    }

    @PostMapping
    public TestDrive createTestDrive(@Valid @RequestBody TestDrive testDrive) {
        return testDriveService.createTestDrive(testDrive);
    }

    @GetMapping
    public List<TestDrive> getAllTestDrives() {
        return testDriveService.getAllTestDrives();
    }

    @GetMapping("/{testDriveId}")
    public TestDrive getTestDriveById(@PathVariable Long testDriveId) {

        return testDriveService.getTestDriveById(testDriveId);
    }

    @PutMapping("/{testDriveId}")
    public TestDrive updateTestDrive(@PathVariable Long testDriveId, @Valid @RequestBody TestDrive testDrive) {

        return testDriveService.updateTestDrive(testDriveId, testDrive);
    }

    @DeleteMapping("/{testDriveId}")
    public String deleteTestDrive(@PathVariable Long testDriveId) {

        testDriveService.deleteTestDrive(testDriveId);

        return "Test drive deleted successfully";
    }

    @PutMapping("/{testDriveId}/assignment")
    @PreAuthorize("hasRole('ADMIN')")
    public TestDrive assignTestDrive(@PathVariable Long testDriveId, @Valid @RequestBody AssignmentRequest request) {
        return testDriveService.assignTestDrive(testDriveId, request.assigneeId());
    }
}

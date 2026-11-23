package com.autocrm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.autocrm.model.TestDrive;

public interface TestDriveRepository extends JpaRepository<TestDrive, Long> {

    List<TestDrive> findByTenantId(Long tenantId);

    List<TestDrive> findByTenantIdAndAssignedUserId(Long tenantId, Long assignedUserId);

    Optional<TestDrive> findByTestDriveIdAndTenantId(Long testDriveId, Long tenantId);
}

package com.autocrm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.autocrm.model.Activity;

public interface ActivityRepository extends JpaRepository<Activity, Long> {

    List<Activity> findByTenantId(Long tenantId);

    List<Activity> findByTenantIdAndAssignedUserId(Long tenantId, Long assignedUserId);

    Optional<Activity> findByActivityIdAndTenantId(Long activityId, Long tenantId);
}

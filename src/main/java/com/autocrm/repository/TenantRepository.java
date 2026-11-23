package com.autocrm.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.autocrm.model.Tenant;

public interface TenantRepository extends JpaRepository<Tenant, Long> {

}
package com.autocrm.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.autocrm.model.AuditLog;

public interface AuditLogRepository extends Repository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

    <S extends AuditLog> S save(S auditLog);

    List<AuditLog> findByTenantIdOrderByOccurredAtDesc(Long tenantId);

    long countByTenantId(Long tenantId);

    @Query("select count(distinct a.actorEmail) from AuditLog a where a.tenantId = :tenantId and a.actorEmail <> 'PUBLIC_SHOWROOM'")
    long countDistinctEmployeesByTenantId(@Param("tenantId") Long tenantId);

    @Query("select distinct a.actorEmail from AuditLog a where a.tenantId = :tenantId and a.actorEmail <> 'PUBLIC_SHOWROOM' order by a.actorEmail")
    List<String> findDistinctEmployeeEmailsByTenantId(@Param("tenantId") Long tenantId);

    @Query("select distinct a.action from AuditLog a where a.tenantId = :tenantId order by a.action")
    List<String> findDistinctActionsByTenantId(@Param("tenantId") Long tenantId);

    @Query("select distinct a.entityType from AuditLog a where a.tenantId = :tenantId order by a.entityType")
    List<String> findDistinctEntityTypesByTenantId(@Param("tenantId") Long tenantId);
}

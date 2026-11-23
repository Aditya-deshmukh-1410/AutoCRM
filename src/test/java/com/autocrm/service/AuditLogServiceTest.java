package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

import com.autocrm.dto.AuditLogPageResponse;
import com.autocrm.model.AuditLog;
import com.autocrm.repository.AuditLogRepository;
import com.autocrm.security.TenantContext;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    private static final Long TENANT_ID = 72L;

    @Mock private AuditLogRepository auditLogRepository;

    private AuditLogService service;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TENANT_ID);
        service = new AuditLogService(auditLogRepository);
    }

    @AfterEach
    void clearTenantContext() {
        TenantContext.clear();
    }

    @Test
    void returnsNewestFirstPageAndTenantScopedSummary() {
        AuditLog entry = new AuditLog(TENANT_ID, "admin@example.test", "VEHICLE_STATUS_CHANGED", "VEHICLE", 88L,
                "status: AVAILABLE -> SOLD");
        when(auditLogRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entry), PageRequest.of(0, 25,
                        Sort.by(Sort.Direction.DESC, "occurredAt")), 1));
        when(auditLogRepository.countByTenantId(TENANT_ID)).thenReturn(14L);
        when(auditLogRepository.countDistinctEmployeesByTenantId(TENANT_ID)).thenReturn(3L);
        when(auditLogRepository.findDistinctEmployeeEmailsByTenantId(TENANT_ID))
                .thenReturn(List.of("admin@example.test", "sales@example.test"));
        when(auditLogRepository.findDistinctActionsByTenantId(TENANT_ID)).thenReturn(List.of("VEHICLE_STATUS_CHANGED"));
        when(auditLogRepository.findDistinctEntityTypesByTenantId(TENANT_ID)).thenReturn(List.of("VEHICLE"));

        AuditLogPageResponse result = service.searchCurrentTenantAuditLogs(0, 25, "VEHICLES", null,
                null, null, null, null, null, null);

        assertEquals(14L, result.getTotalEvents());
        assertEquals(3L, result.getDistinctEmployees());
        assertEquals(1, result.getTotalElements());
        assertEquals("admin@example.test", result.getContent().get(0).getActorEmail());

        ArgumentCaptor<Specification<AuditLog>> specification = ArgumentCaptor.forClass(Specification.class);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(auditLogRepository).findAll(specification.capture(), pageable.capture());
        assertEquals(25, pageable.getValue().getPageSize());
        assertEquals(Sort.Direction.DESC, pageable.getValue().getSort().getOrderFor("occurredAt").getDirection());

        @SuppressWarnings("unchecked")
        Root<AuditLog> root = org.mockito.Mockito.mock(Root.class);
        @SuppressWarnings("unchecked")
        Path<Object> tenantPath = org.mockito.Mockito.mock(Path.class);
        @SuppressWarnings("unchecked")
        Path<Object> entityTypePath = org.mockito.Mockito.mock(Path.class);
        CriteriaBuilder builder = org.mockito.Mockito.mock(CriteriaBuilder.class);
        Predicate tenantPredicate = org.mockito.Mockito.mock(Predicate.class);
        Predicate categoryPredicate = org.mockito.Mockito.mock(Predicate.class);
        Predicate combinedPredicate = org.mockito.Mockito.mock(Predicate.class);
        when(root.get("tenantId")).thenReturn(tenantPath);
        when(root.get("entityType")).thenReturn(entityTypePath);
        when(builder.equal(tenantPath, TENANT_ID)).thenReturn(tenantPredicate);
        when(entityTypePath.in(java.util.Set.of("VEHICLE"))).thenReturn(categoryPredicate);
        when(builder.and(tenantPredicate, categoryPredicate)).thenReturn(combinedPredicate);
        assertSame(combinedPredicate, specification.getValue().toPredicate(root,
                org.mockito.Mockito.mock(CriteriaQuery.class), builder));
    }

    @Test
    void rejectsUnknownCategoryAndInvalidDateRange() {
        ResponseStatusException categoryError = assertThrows(ResponseStatusException.class,
                () -> service.searchCurrentTenantAuditLogs(0, 25, "UNKNOWN", null, null, null, null, null, null,
                        null));
        assertEquals(HttpStatusCode.valueOf(400), categoryError.getStatusCode());

        ResponseStatusException dateError = assertThrows(ResponseStatusException.class,
                () -> service.searchCurrentTenantAuditLogs(0, 25, null, null, null, null, null,
                        Instant.parse("2026-02-01T00:00:00Z"), Instant.parse("2026-01-01T00:00:00Z"), null));
        assertEquals(HttpStatusCode.valueOf(400), dateError.getStatusCode());
    }
}

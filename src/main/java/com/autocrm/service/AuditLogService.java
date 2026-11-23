package com.autocrm.service;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.time.Instant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import com.autocrm.dto.AuditLogPageResponse;
import com.autocrm.dto.AuditLogResponse;
import com.autocrm.model.AuditLog;
import com.autocrm.repository.AuditLogRepository;
import com.autocrm.security.TenantContext;

@Service
public class AuditLogService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> KNOWN_ENTITY_TYPES = Set.of("VEHICLE", "CUSTOMER", "LEAD", "TEST_DRIVE",
            "ACTIVITY", "SALE", "FINANCE", "USER", "ROLE", "TENANT");
    private static final Pattern SEARCH_ESCAPE = Pattern.compile("([%_\\\\])");

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Appends an audit record using request identity from trusted server context.
     * Change details must be concise and must not contain credentials, tokens, or
     * unnecessary personal data.
     */
    @Transactional
    public AuditLog record(String action, String entityType, Long entityId, String changeDetails) {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Cannot record an audit log without an authenticated tenant");
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || !StringUtils.hasText(authentication.getName())) {
            throw new IllegalStateException("Cannot record an audit log without an authenticated actor");
        }
        if (!StringUtils.hasText(action) || !StringUtils.hasText(entityType) || entityId == null) {
            throw new IllegalArgumentException("Audit action, entity type, and entity ID are required");
        }

        AuditLog auditLog = new AuditLog(tenantId, authentication.getName(), action.trim(), entityType.trim(),
                entityId, StringUtils.hasText(changeDetails) ? changeDetails.trim() : null);
        return auditLogRepository.save(auditLog);
    }

    @Transactional
    public AuditLog recordPublicEnquiry(Long tenantId, String action, String entityType, Long entityId) {
        if (tenantId == null || !StringUtils.hasText(action) || !StringUtils.hasText(entityType) || entityId == null) {
            throw new IllegalArgumentException("Public enquiry audit details are incomplete");
        }
        return auditLogRepository.save(new AuditLog(tenantId, "PUBLIC_SHOWROOM", action.trim(), entityType.trim(),
                entityId, null));
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getCurrentTenantAuditLogs() {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Cannot retrieve audit logs without an authenticated tenant");
        }

        return auditLogRepository.findByTenantIdOrderByOccurredAtDesc(tenantId).stream()
                .map(auditLog -> new AuditLogResponse(auditLog.getOccurredAt(), auditLog.getActorEmail(),
                        auditLog.getAction(), auditLog.getEntityType(), auditLog.getEntityId(),
                        auditLog.getChangeDetails()))
                .toList();
    }

    @Transactional(readOnly = true)
    public AuditLogPageResponse searchCurrentTenantAuditLogs(int requestedPage, int requestedSize, String category,
            String employeeEmail, String action, String entityType, Long entityId, Instant from, Instant to,
            String search) {
        Long tenantId = TenantContext.requireTenantId();
        if (from != null && to != null && !from.isBefore(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The audit date range is invalid");
        }

        int pageNumber = Math.max(0, requestedPage);
        int pageSize = Math.max(1, Math.min(requestedSize, MAX_PAGE_SIZE));
        Specification<AuditLog> specification = tenantFilter(tenantId);

        if (StringUtils.hasText(category)) {
            String normalizedCategory = category.trim().toUpperCase(Locale.ROOT);
            Set<String> categoryEntityTypes = switch (normalizedCategory) {
                case "VEHICLES" -> Set.of("VEHICLE");
                case "CUSTOMERS" -> Set.of("CUSTOMER");
                case "LEADS" -> Set.of("LEAD");
                case "TEST_DRIVES" -> Set.of("TEST_DRIVE");
                case "ACTIVITIES" -> Set.of("ACTIVITY");
                case "SALES" -> Set.of("SALE");
                case "FINANCE" -> Set.of("FINANCE");
                case "USERS_ROLES" -> Set.of("USER", "ROLE");
                case "TENANT_MANAGEMENT" -> Set.of("TENANT");
                case "OTHER" -> Set.of();
                default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown audit category");
            };
            specification = specification.and((root, query, builder) -> normalizedCategory.equals("OTHER")
                    ? builder.not(root.get("entityType").in(KNOWN_ENTITY_TYPES))
                    : root.get("entityType").in(categoryEntityTypes));
        }

        if (StringUtils.hasText(employeeEmail)) {
            String normalizedEmail = employeeEmail.trim().toLowerCase(Locale.ROOT);
            specification = specification.and((root, query, builder) -> builder.equal(
                    builder.lower(root.get("actorEmail")), normalizedEmail));
        }
        if (StringUtils.hasText(action)) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("action"), action.trim()));
        }
        if (StringUtils.hasText(entityType)) {
            String normalizedType = entityType.trim().toUpperCase(Locale.ROOT);
            specification = specification.and((root, query, builder) -> builder.equal(root.get("entityType"), normalizedType));
        }
        if (entityId != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("entityId"), entityId));
        }
        if (from != null) {
            specification = specification.and((root, query, builder) -> builder.greaterThanOrEqualTo(root.get("occurredAt"), from));
        }
        if (to != null) {
            specification = specification.and((root, query, builder) -> builder.lessThan(root.get("occurredAt"), to));
        }
        if (StringUtils.hasText(search)) {
            String value = search.trim();
            String pattern = "%" + SEARCH_ESCAPE.matcher(value.toLowerCase(Locale.ROOT)).replaceAll("\\\\$1") + "%";
            Long searchId = parseId(value);
            specification = specification.and((root, query, builder) -> {
                var textMatch = builder.or(
                        builder.like(builder.lower(root.get("actorEmail")), pattern, '\\'),
                        builder.like(builder.lower(root.get("action")), pattern, '\\'),
                        builder.like(builder.lower(root.get("entityType")), pattern, '\\'));
                return searchId == null ? textMatch : builder.or(textMatch, builder.equal(root.get("entityId"), searchId));
            });
        }

        Sort newestFirst = Sort.by(Sort.Direction.DESC, "occurredAt")
                .and(Sort.by(Sort.Direction.DESC, "auditLogId"));
        Pageable pageable = PageRequest.of(pageNumber, pageSize, newestFirst);
        Page<AuditLog> result = auditLogRepository.findAll(specification, pageable);
        List<AuditLogResponse> content = result.getContent().stream()
                .map(entry -> new AuditLogResponse(entry.getOccurredAt(), entry.getActorEmail(), entry.getAction(),
                        entry.getEntityType(), entry.getEntityId(), entry.getChangeDetails()))
                .toList();

        return new AuditLogPageResponse(content, result.getNumber(), result.getSize(), result.getTotalElements(),
                result.getTotalPages(), auditLogRepository.countByTenantId(tenantId),
                auditLogRepository.countDistinctEmployeesByTenantId(tenantId),
                auditLogRepository.findDistinctEmployeeEmailsByTenantId(tenantId),
                auditLogRepository.findDistinctActionsByTenantId(tenantId),
                auditLogRepository.findDistinctEntityTypesByTenantId(tenantId));
    }

    private Specification<AuditLog> tenantFilter(Long tenantId) {
        return (root, query, builder) -> builder.equal(root.get("tenantId"), tenantId);
    }

    private Long parseId(String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}

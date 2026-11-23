package com.autocrm.service;

import com.autocrm.model.CrmNotification;
import com.autocrm.repository.CrmNotificationRepository;
import com.autocrm.security.TenantContext;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CrmNotificationService {
    public record Item(UUID id, String type, String title, String message, boolean isRead, Instant createdAt) {}
    public record Summary(List<Item> items, long unread) {}

    private final CrmNotificationRepository notifications;
    public CrmNotificationService(CrmNotificationRepository notifications) { this.notifications = notifications; }

    @Transactional
    public void create(Long tenantId, String type, String title, String message, String entityType, Long entityId) {
        if (tenantId == null || entityId == null) return;
        CrmNotification n = new CrmNotification();
        n.setId(UUID.randomUUID());
        n.setTenantId(tenantId);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setEntityType(entityType);
        n.setEntityId(entityId);
        n.setRead(false);
        n.setCreatedAt(Instant.now());
        notifications.save(n);
    }

    @Transactional(readOnly = true)
    public Summary currentTenant() {
        Long tenantId = TenantContext.requireTenantId();
        List<Item> items = notifications.findTop100ByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(n -> new Item(n.getId(), n.getType(), n.getTitle(), n.getMessage(), n.isRead(), n.getCreatedAt()))
                .toList();
        return new Summary(items, notifications.countByTenantIdAndReadFalse(tenantId));
    }

    @Transactional
    public void markRead(UUID id) {
        Long tenantId = TenantContext.requireTenantId();
        CrmNotification n = notifications.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        n.setRead(true);
    }

    @Transactional
    public void markAllRead() {
        Long tenantId = TenantContext.requireTenantId();
        notifications.findByTenantIdAndReadFalse(tenantId).forEach(n -> n.setRead(true));
    }
}

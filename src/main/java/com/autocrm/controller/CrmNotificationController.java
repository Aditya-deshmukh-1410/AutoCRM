package com.autocrm.controller;

import com.autocrm.service.CrmNotificationService;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@PreAuthorize("hasAnyRole('ADMIN', 'SALES')")
public class CrmNotificationController {
    private final CrmNotificationService notifications;
    public CrmNotificationController(CrmNotificationService notifications) { this.notifications = notifications; }

    @GetMapping("/api/crm/notifications")
    public CrmNotificationService.Summary list() { return notifications.currentTenant(); }

    @PutMapping("/api/crm/notifications/{id}/read")
    public Map<String, String> markRead(@PathVariable UUID id) {
        notifications.markRead(id);
        return Map.of("message", "Notification marked as read");
    }

    @PutMapping("/api/crm/notifications/read-all")
    public Map<String, String> markAllRead() {
        notifications.markAllRead();
        return Map.of("message", "Notifications marked as read");
    }
}

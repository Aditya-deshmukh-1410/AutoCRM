package com.autocrm.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.autocrm.model.AppUser;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.security.TenantContext;

@Service
public class WorkAssignmentAccess {
    private final AppUserRepository users;

    public WorkAssignmentAccess(AppUserRepository users) { this.users = users; }

    public boolean isAdmin() { return hasRole("ADMIN"); }
    public boolean isSales() { return hasRole("SALES"); }

    private boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }

    public Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) throw new AccessDeniedException("Authenticated user required");
        return users.findByEmail(auth.getName()).filter(u -> TenantContext.requireTenantId().equals(u.getTenantId()))
                .map(AppUser::getUserId).orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
    }

    public void requireRecordAccess(Long assignedUserId) {
        if (isAdmin()) return;
        if (!isSales() || assignedUserId == null || !assignedUserId.equals(currentUserId())) {
            throw new AccessDeniedException("Record not found");
        }
    }

    public void requireRelatedRecordAccess(Long assignedUserId) {
        if (isAdmin() || (isSales() && assignedUserId == null)) return;
        requireRecordAccess(assignedUserId);
    }

    public Long validateSalesAssignee(Long userId) {
        if (userId == null) return null;
        AppUser assignee = users.findByUserIdAndTenantId(userId, TenantContext.requireTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Assignee must belong to this dealership"));
        if (!"SALES".equalsIgnoreCase(assignee.getRole())) throw new IllegalArgumentException("Assignee must be a SALES user");
        return assignee.getUserId();
    }
}

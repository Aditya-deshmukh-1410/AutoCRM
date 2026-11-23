package com.autocrm.service;

import java.util.List;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.model.AppUser;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.security.TenantContext;

@Service
public class AppUserService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public AppUserService(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder,
            AuditLogService auditLogService) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public void createUser(AppUser user) {

        Long tenantId = TenantContext.requireTenantId();

        validateDealershipRole(user.getRole());

        user.setUserId(null);

        user.setTenantId(tenantId);

        user.setPassword(passwordEncoder.encode(user.getPassword()));

        AppUser savedUser = appUserRepository.save(user);
        auditLogService.record("USER_CREATED", "USER", savedUser.getUserId(),
                "role: " + savedUser.getRole());
    }

    public List<AppUser> getAllUsers() {

        Long tenantId = TenantContext.requireTenantId();

        return appUserRepository.findByTenantId(tenantId);
    }

    public Optional<AppUser> getUserById(Long userId) {

        Long tenantId = TenantContext.requireTenantId();

        return appUserRepository.findByUserIdAndTenantId(userId, tenantId);
    }

    @Transactional
    public void updateUser(Long userId, AppUser updatedUser) {

        Long tenantId = TenantContext.requireTenantId();

        AppUser existingUser = appUserRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!tenantId.equals(existingUser.getTenantId())) {
            throw new RuntimeException("User not found");
        }

        String previousRole = existingUser.getRole();

        // Only dealership roles can be assigned through normal user management.

        validateDealershipRole(updatedUser.getRole());

        existingUser.setName(updatedUser.getName());
        existingUser.setEmail(updatedUser.getEmail());
        existingUser.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
        existingUser.setRole(updatedUser.getRole());

        // Do NOT update tenantId from the request.
        // The user's tenant remains unchanged.

        AppUser savedUser = appUserRepository.save(existingUser);
        if (!java.util.Objects.equals(previousRole, savedUser.getRole())) {
            auditLogService.record("USER_ROLE_CHANGED", "USER", savedUser.getUserId(),
                    "role: " + previousRole + " -> " + savedUser.getRole());
        }
    }

    public void resetPassword(Long userId, String newPassword) {

        AppUser user = appUserRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));

        appUserRepository.save(user);
    }

    private void validateDealershipRole(String role) {

        if (!"ADMIN".equalsIgnoreCase(role) && !"SALES".equalsIgnoreCase(role)) {
            throw new RuntimeException("Invalid dealership role");
        }
    }

}

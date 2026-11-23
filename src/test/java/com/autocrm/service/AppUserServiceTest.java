package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.autocrm.model.AppUser;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.security.TenantContext;

@ExtendWith(MockitoExtension.class)
class AppUserServiceTest {

    private static final Long TENANT_ID = 23L;

    @Mock
    private AppUserRepository appUserRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AppUserService service;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TENANT_ID);
    }

    @AfterEach
    void clearTenantContext() {
        TenantContext.clear();
    }

    @Test
    void createsAdminWithServerTenantAndGeneratedId() {
        assertCreatedUser("ADMIN");
    }

    @Test
    void createsSalesUserWithServerTenantAndGeneratedId() {
        assertCreatedUser("SALES");
    }

    @Test
    void rejectsPlatformAdminCreationWithoutSaving() {
        rejectsRole("PLATFORM_ADMIN");
    }

    @Test
    void rejectsUnsupportedRoleWithoutSaving() {
        rejectsRole("MANAGER");
    }

    @Test
    void rejectsPlatformAdminRoleAssignmentDuringUpdate() {
        AppUser existing = user("SALES");
        existing.setUserId(8L);
        existing.setTenantId(TENANT_ID);
        AppUser update = user("PLATFORM_ADMIN");

        when(appUserRepository.findById(8L)).thenReturn(Optional.of(existing));

        RuntimeException error = assertThrows(RuntimeException.class, () -> service.updateUser(8L, update));

        assertEquals("Invalid dealership role", error.getMessage());
        verify(appUserRepository, never()).save(any(AppUser.class));
    }

    @Test
    void recordsDealershipRoleChangesWithoutPasswordDetails() {
        AppUser existing = user("SALES");
        existing.setUserId(8L);
        existing.setTenantId(TENANT_ID);
        AppUser update = user("ADMIN");
        when(appUserRepository.findById(8L)).thenReturn(Optional.of(existing));
        when(passwordEncoder.encode("plain-password")).thenReturn("encoded-password");
        when(appUserRepository.save(existing)).thenReturn(existing);

        service.updateUser(8L, update);

        verify(auditLogService).record("USER_ROLE_CHANGED", "USER", 8L, "role: SALES -> ADMIN");
    }

    private void assertCreatedUser(String role) {
        when(passwordEncoder.encode("plain-password")).thenReturn("encoded-password");
        AppUser user = user(role);
        user.setUserId(999L);
        user.setTenantId(777L);

        AppUser persistedUser = new AppUser();
        persistedUser.setUserId(999L);
        persistedUser.setRole(role);
        when(appUserRepository.save(user)).thenReturn(persistedUser);

        service.createUser(user);

        assertNull(user.getUserId());
        assertEquals(TENANT_ID, user.getTenantId());
        assertEquals(role, user.getRole());
        assertEquals("encoded-password", user.getPassword());
        verify(appUserRepository).save(user);
        verify(auditLogService).record("USER_CREATED", "USER", 999L, "role: " + role);
    }

    private void rejectsRole(String role) {
        AppUser user = user(role);

        RuntimeException error = assertThrows(RuntimeException.class, () -> service.createUser(user));

        assertEquals("Invalid dealership role", error.getMessage());
        verify(appUserRepository, never()).save(any(AppUser.class));
    }

    private AppUser user(String role) {
        AppUser user = new AppUser();
        user.setName("Test User");
        user.setEmail("test@example.invalid");
        user.setPassword("plain-password");
        user.setRole(role);
        return user;
    }
}

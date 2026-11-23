package com.autocrm.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.autocrm.model.AppUser;
import com.autocrm.repository.AppUserRepository;

class PlatformAdminBootstrapTest {

    @Test
    void createsTenantlessPlatformAdminOnlyWhenExplicitlyConfiguredAndHashesPassword() throws Exception {
        AppUserRepository users = Mockito.mock(AppUserRepository.class);
        PasswordEncoder encoder = Mockito.mock(PasswordEncoder.class);
        when(users.findByEmailIgnoreCase("platform@example.test")).thenReturn(Optional.empty());
        when(encoder.encode("secret-bootstrap-password")).thenReturn("$2a$hashed-value");
        PlatformAdminBootstrap bootstrap = new PlatformAdminBootstrap(users, encoder, "Platform Owner",
                " PLATFORM@EXAMPLE.TEST ", "secret-bootstrap-password");

        bootstrap.run(null);

        ArgumentCaptor<AppUser> user = ArgumentCaptor.forClass(AppUser.class);
        verify(users).saveAndFlush(user.capture());
        assertEquals("PLATFORM_ADMIN", user.getValue().getRole());
        assertEquals("platform@example.test", user.getValue().getEmail());
        assertEquals(null, user.getValue().getTenantId());
        assertEquals("$2a$hashed-value", user.getValue().getPassword());
    }

    @Test
    void rejectsEnabledBootstrapWithMissingValues() {
        PlatformAdminBootstrap bootstrap = new PlatformAdminBootstrap(Mockito.mock(AppUserRepository.class),
                Mockito.mock(PasswordEncoder.class), "", "", "");
        assertThrows(IllegalStateException.class, () -> bootstrap.run(null));
    }

    @Test
    void neverReplacesAnExistingAccount() throws Exception {
        AppUserRepository users = Mockito.mock(AppUserRepository.class);
        AppUser existing = new AppUser(); existing.setRole("PLATFORM_ADMIN"); existing.setTenantId(null);
        when(users.findByEmailIgnoreCase("platform@example.test")).thenReturn(Optional.of(existing));
        new PlatformAdminBootstrap(users, Mockito.mock(PasswordEncoder.class), "Other Name",
                "platform@example.test", "new-secret").run(null);
        verify(users, never()).saveAndFlush(any(AppUser.class));
    }
}

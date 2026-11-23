package com.autocrm.config;

import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.autocrm.model.AppUser;
import com.autocrm.repository.AppUserRepository;

/** Optional one-time bootstrap for the first platform administrator; no public signup endpoint is exposed. */
@Component
@ConditionalOnProperty(prefix = "autocrm.platform-admin.bootstrap", name = "enabled", havingValue = "true")
public class PlatformAdminBootstrap implements ApplicationRunner {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final String name;
    private final String email;
    private final String password;

    public PlatformAdminBootstrap(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder,
            @Value("${autocrm.platform-admin.bootstrap.name:}") String name,
            @Value("${autocrm.platform-admin.bootstrap.email:}") String email,
            @Value("${autocrm.platform-admin.bootstrap.password:}") String password) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.name = name;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(name) || !StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            throw new IllegalStateException("Platform administrator bootstrap is enabled but required values are missing");
        }

        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        var existing = appUserRepository.findByEmailIgnoreCase(normalizedEmail);
        if (existing.isPresent()) {
            AppUser user = existing.get();
            if (!"PLATFORM_ADMIN".equalsIgnoreCase(user.getRole()) || user.getTenantId() != null) {
                throw new IllegalStateException("Configured platform administrator email belongs to a non-platform account");
            }
            return;
        }

        AppUser platformAdmin = new AppUser();
        platformAdmin.setName(name.trim());
        platformAdmin.setEmail(normalizedEmail);
        platformAdmin.setPassword(passwordEncoder.encode(password));
        platformAdmin.setRole("PLATFORM_ADMIN");
        platformAdmin.setTenantId(null);
        try {
            appUserRepository.saveAndFlush(platformAdmin);
        } catch (DataIntegrityViolationException exception) {
            throw new IllegalStateException("Platform administrator bootstrap could not create the configured account");
        }
    }
}

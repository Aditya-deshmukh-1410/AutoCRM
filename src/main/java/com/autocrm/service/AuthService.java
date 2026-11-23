package com.autocrm.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.dto.RegisterRequest;
import com.autocrm.exception.BusinessException;
import com.autocrm.model.AppUser;
import com.autocrm.model.Tenant;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.EmailVerificationTokenRepository;
import com.autocrm.repository.TenantRepository;
import com.autocrm.security.JwtService;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;

    public AuthService(AppUserRepository appUserRepository, TenantRepository tenantRepository,
            PasswordEncoder passwordEncoder, JwtService jwtService,
            EmailVerificationTokenRepository emailVerificationTokenRepository) {

        this.appUserRepository = appUserRepository;
        this.tenantRepository = tenantRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
    }

    public String login(String email, String password) {

        if (email == null || email.isBlank() || password == null) {
            throw new RuntimeException("Invalid email or password");
        }

        AppUser user = appUserRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        return jwtService.generateToken(user);
    }

    @Transactional
    public void register(RegisterRequest request) {

        if (appUserRepository.findByEmailIgnoreCase(request.getEmail().trim()).isPresent()) {
            throw new BusinessException("Registration could not be completed");
        }

        emailVerificationTokenRepository.findTopByEmailOrderByIdDesc(request.getEmail().trim())
                .filter(token -> token.isUsed())
                .orElseThrow(() -> new BusinessException("Registration could not be completed"));

        Tenant tenant = new Tenant();
        tenant.setName(request.getShowroomName());
        String normalizedEmail = request.getEmail().trim().toLowerCase(java.util.Locale.ROOT);
        tenant.setEmail(normalizedEmail);
        tenant.setPhone(request.getPhone());

        Tenant savedTenant = tenantRepository.save(tenant);

        AppUser admin = new AppUser();
        admin.setName(request.getName());
        admin.setEmail(normalizedEmail);
        admin.setPassword(passwordEncoder.encode(request.getPassword()));

        // The first user of a newly registered dealership is always ADMIN.
        admin.setRole("ADMIN");
        admin.setTenantId(savedTenant.getTenantId());

        appUserRepository.save(admin);
    }
}

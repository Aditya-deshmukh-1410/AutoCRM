package com.autocrm.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.model.PasswordResetToken;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.PasswordResetTokenRepository;

@Service
public class PasswordResetService {

    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private final PasswordResetTokenRepository tokenRepository;
    private final AppUserRepository appUserRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetService(PasswordResetTokenRepository tokenRepository, AppUserRepository appUserRepository,
            EmailService emailService, PasswordEncoder passwordEncoder) {

        this.tokenRepository = tokenRepository;
        this.appUserRepository = appUserRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void generateResetOtp(String email) {

        if (email == null || appUserRepository.findByEmailIgnoreCase(email.trim()).isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        var previous = tokenRepository.findTopByEmailOrderByIdDesc(email).orElse(null);
        if (previous != null && previous.getCreatedAt() != null
                && previous.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(now)) return;

        tokenRepository.findTopByEmailOrderByIdDesc(email).ifPresent(previousToken -> {
            previousToken.setUsed(true);
            tokenRepository.save(previousToken);
        });

        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));

        PasswordResetToken token = new PasswordResetToken();

        token.setEmail(email);
        token.setOtp(passwordEncoder.encode(otp));
        token.setCreatedAt(now);
        token.setExpiresAt(now.plusMinutes(OTP_EXPIRY_MINUTES));
        token.setAttempts(0);
        token.setUsed(false);
        token.setVerified(false);

        tokenRepository.save(token);

        emailService.sendPasswordResetOtp(email, otp);
    }

    public boolean verifyResetOtp(String email, String otp) {

        if (email == null || email.isBlank() || otp == null || otp.isBlank()) {
            throw new RuntimeException("Invalid or expired reset code");
        }

        PasswordResetToken token = tokenRepository.findTopByEmailOrderByIdDesc(email)
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset code"));

        if (token.isUsed() || LocalDateTime.now().isAfter(token.getExpiresAt())
                || token.getAttempts() >= MAX_ATTEMPTS) {
            throw new RuntimeException("Invalid or expired reset code");
        }

        if (!passwordEncoder.matches(otp, token.getOtp())) {

            token.setAttempts(token.getAttempts() + 1);
            tokenRepository.save(token);

            return false;
        }

        token.setVerified(true);
        tokenRepository.save(token);

        return true;
    }

    @Transactional
    public void resetPassword(String email, String newPassword) {

        if (email == null || email.isBlank() || newPassword == null || newPassword.isBlank()) {
            throw new RuntimeException("Password reset could not be completed");
        }

        PasswordResetToken token = tokenRepository.findTopByEmailOrderByIdDesc(email)
                .orElseThrow(() -> new RuntimeException("Password reset could not be completed"));

        if (token.isUsed() || !token.isVerified() || LocalDateTime.now().isAfter(token.getExpiresAt())) {
            throw new RuntimeException("Password reset could not be completed");
        }

        var user = appUserRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new RuntimeException("Password reset could not be completed"));

        user.setPassword(passwordEncoder.encode(newPassword));
        appUserRepository.save(user);

        token.setUsed(true);
        tokenRepository.save(token);
    }
}

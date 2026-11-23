package com.autocrm.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.model.EmailVerificationToken;
import com.autocrm.repository.EmailVerificationTokenRepository;

@Service
public class EmailVerificationService {

    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private final EmailVerificationTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private final SecureRandom secureRandom = new SecureRandom();

    public EmailVerificationService(EmailVerificationTokenRepository tokenRepository, EmailService emailService,
            PasswordEncoder passwordEncoder) {

        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void generateOtp(String email) {

        LocalDateTime now = LocalDateTime.now();

        tokenRepository.findTopByEmailOrderByIdDesc(email).ifPresent(previousToken -> {

            if (previousToken.getCreatedAt() != null
                    && previousToken.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(now)) {

                throw new RuntimeException("Please wait before requesting another verification code");
            }
        });

        tokenRepository.invalidatePreviousOtps(email);

        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));

        EmailVerificationToken token = new EmailVerificationToken();

        token.setEmail(email);
        token.setOtp(passwordEncoder.encode(otp));
        token.setCreatedAt(now);
        token.setExpiresAt(now.plusMinutes(OTP_EXPIRY_MINUTES));
        token.setAttempts(0);
        token.setUsed(false);

        tokenRepository.save(token);

        emailService.sendVerificationOtp(email, otp);
    }

    public boolean verifyOtp(String email, String otp) {

        if (email == null || email.isBlank() || otp == null || otp.isBlank()) {
            throw new RuntimeException("Invalid or expired verification code");
        }

        EmailVerificationToken token = tokenRepository.findTopByEmailOrderByIdDesc(email)
                .orElseThrow(() -> new RuntimeException("Invalid or expired verification code"));

        if (token.isUsed() || LocalDateTime.now().isAfter(token.getExpiresAt())
                || token.getAttempts() >= MAX_ATTEMPTS) {
            throw new RuntimeException("Invalid or expired verification code");
        }

        if (!passwordEncoder.matches(otp, token.getOtp())) {

            token.setAttempts(token.getAttempts() + 1);
            tokenRepository.save(token);

            return false;
        }

        token.setUsed(true);
        tokenRepository.save(token);

        return true;
    }
}

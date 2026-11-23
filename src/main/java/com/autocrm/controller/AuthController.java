package com.autocrm.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

import com.autocrm.dto.LoginRequest;
import com.autocrm.dto.EmailRequest;
import com.autocrm.dto.RegisterRequest;
import com.autocrm.dto.ResetPasswordRequest;
import com.autocrm.dto.VerifyOtpRequest;
import com.autocrm.service.AuthService;
import com.autocrm.service.EmailVerificationService;
import com.autocrm.service.PasswordResetService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, EmailVerificationService emailVerificationService,
            PasswordResetService passwordResetService) {

        this.authService = authService;
        this.emailVerificationService = emailVerificationService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/login")
    public String login(@RequestBody LoginRequest request) {
        return authService.login(request.getEmail(), request.getPassword());
    }

    @PostMapping("/register")
    public String register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return "Registration successful";
    }

    @PostMapping("/send-otp")
    public String sendOtp(@Valid @RequestBody EmailRequest request) {
        emailVerificationService.generateOtp(request.email());
        return "Verification code sent";
    }

    @PostMapping("/verify-otp")
    public String verifyOtp(@RequestBody VerifyOtpRequest request) {

        boolean verified = emailVerificationService.verifyOtp(request.getEmail(), request.getOtp());

        if (!verified) {
            throw new RuntimeException("Invalid verification code");
        }

        return "Email verified successfully";
    }

    @PostMapping("/forgot-password")
    public String forgotPassword(@Valid @RequestBody EmailRequest request) {

        passwordResetService.generateResetOtp(request.email());

        return "Password reset code sent";
    }

    @PostMapping("/verify-reset-otp")
    public String verifyResetOtp(@RequestBody VerifyOtpRequest request) {

        boolean verified = passwordResetService.verifyResetOtp(request.getEmail(), request.getOtp());

        if (!verified) {
            throw new RuntimeException("Invalid reset code");
        }

        return "Password reset code verified";
    }

    @PostMapping("/reset-password")
    public String resetPassword(@RequestBody ResetPasswordRequest request) {

        passwordResetService.resetPassword(request.getEmail(), request.getNewPassword());

        return "Password reset successful";
    }
}

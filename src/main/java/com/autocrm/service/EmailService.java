package com.autocrm.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationOtp(String email, String otp) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(email);
        message.setSubject("AutoCRM Email Verification");
        message.setText("Your AutoCRM verification code is: " + otp + "\n\nThis code is valid for 10 minutes."
                + "\n\nIf you did not request this code, please ignore this email.");

        mailSender.send(message);
    }

    public void sendPasswordResetOtp(String email, String otp) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(email);
        message.setSubject("AutoCRM Password Reset");
        message.setText("Your AutoCRM password reset code is: " + otp + "\n\nThis code is valid for 10 minutes."
                + "\n\nIf you did not request a password reset, please ignore this email.");

        mailSender.send(message);
    }
}
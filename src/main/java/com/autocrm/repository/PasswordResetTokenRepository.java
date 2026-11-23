package com.autocrm.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.autocrm.model.PasswordResetToken;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findTopByEmailOrderByIdDesc(String email);
}
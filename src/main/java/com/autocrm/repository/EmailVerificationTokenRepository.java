package com.autocrm.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.autocrm.model.EmailVerificationToken;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findTopByEmailOrderByIdDesc(String email);

    @Modifying
    @Query("UPDATE EmailVerificationToken e SET e.used = true WHERE e.email = :email AND e.used = false")
    void invalidatePreviousOtps(@Param("email") String email);
}
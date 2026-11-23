package com.autocrm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.autocrm.model.AppUser;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findByEmailIgnoreCase(String email);

    List<AppUser> findByTenantId(Long tenantId);

    Optional<AppUser> findByUserIdAndTenantId(Long userId, Long tenantId);

    @Query("select count(u) from AppUser u where upper(u.role) = upper(:role) and u.tenantId is not null")
    long countDealershipUsersByRole(@Param("role") String role);
}

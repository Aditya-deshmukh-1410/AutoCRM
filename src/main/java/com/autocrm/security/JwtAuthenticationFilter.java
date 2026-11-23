package com.autocrm.security;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.autocrm.model.AppUser;
import com.autocrm.repository.AppUserRepository;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final AppUserRepository users;

    public JwtAuthenticationFilter(JwtService jwtService, AppUserRepository users) {
        this.jwtService = jwtService;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        try {
            if (authHeader != null && authHeader.startsWith("Bearer ")
                    && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    Claims claims = jwtService.extractClaims(authHeader.substring(7));
                    Number userIdClaim = claims.get("userId", Number.class);
                    String emailClaim = claims.getSubject();
                    String roleClaim = claims.get("role", String.class);
                    Number tenantClaim = claims.get("tenantId", Number.class);

                    if (userIdClaim != null && emailClaim != null && roleClaim != null) {
                        Long userId = userIdClaim.longValue();
                        Long tenantId = tenantClaim == null ? null : tenantClaim.longValue();
                        AppUser user = users.findById(userId).orElse(null);
                        if (isCurrentToken(user, emailClaim, roleClaim, tenantId)) {
                            String currentRole = user.getRole().trim().toUpperCase(java.util.Locale.ROOT);
                            var authentication = new UsernamePasswordAuthenticationToken(user.getEmail(), null,
                                    List.of(new SimpleGrantedAuthority("ROLE_" + currentRole)));
                            SecurityContextHolder.getContext().setAuthentication(authentication);
                            TenantContext.setTenantId(user.getTenantId());
                        }
                    }
                } catch (Exception invalidOrUnverifiableToken) {
                    // A missing, expired, revoked, or uncheckable token must fail closed.
                    SecurityContextHolder.clearContext();
                    TenantContext.clear();
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private boolean isCurrentToken(AppUser user, String emailClaim, String roleClaim, Long tenantClaim) {
        if (user == null || user.getEmail() == null || user.getRole() == null
                || !user.getEmail().equalsIgnoreCase(emailClaim)
                || !user.getRole().equalsIgnoreCase(roleClaim)) {
            return false;
        }

        String role = user.getRole().trim().toUpperCase(java.util.Locale.ROOT);
        if ("PLATFORM_ADMIN".equals(role)) {
            return user.getTenantId() == null && tenantClaim == null;
        }
        return ("ADMIN".equals(role) || "SALES".equals(role))
                && user.getTenantId() != null && user.getTenantId().equals(tenantClaim);
    }
}

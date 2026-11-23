package com.autocrm.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Date;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import com.autocrm.model.AppUser;
import com.autocrm.repository.AppUserRepository;

import jakarta.servlet.FilterChain;

class JwtAuthenticationFilterTest {

    private static final String TEST_SECRET = "jwt-filter-test-secret-key-at-least-32-bytes";

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
        TenantContext.clear();
    }

    @Test
    void acceptsCurrentDealershipUserAndClearsTenantAfterRequest() throws Exception {
        AppUser user = user(73L, "sales@example.test", "SALES", 29L);
        Fixture fixture = fixture(user);
        AtomicReference<Authentication> requestAuthentication = new AtomicReference<>();
        AtomicReference<Long> requestTenant = new AtomicReference<>();

        fixture.filter.doFilter(request(fixture.token(user)), new MockHttpServletResponse(), (servletRequest, servletResponse) -> {
            requestAuthentication.set(SecurityContextHolder.getContext().getAuthentication());
            requestTenant.set(TenantContext.getTenantId());
        });

        assertEquals("sales@example.test", requestAuthentication.get().getName());
        assertEquals("ROLE_SALES", requestAuthentication.get().getAuthorities().iterator().next().getAuthority());
        assertEquals(29L, requestTenant.get());
        assertNull(TenantContext.getTenantId(), "Tenant context is cleared after the request");
    }

    @Test
    void rejectsDeletedUser() throws Exception {
        AppUser tokenUser = user(73L, "sales@example.test", "SALES", 29L);
        Fixture fixture = fixture(tokenUser);
        when(fixture.users.findById(73L)).thenReturn(Optional.empty());

        assertUnauthenticated(fixture, fixture.token(tokenUser));
    }

    @Test
    void rejectsChangedRole() throws Exception {
        AppUser tokenUser = user(73L, "sales@example.test", "SALES", 29L);
        Fixture fixture = fixture(tokenUser);
        when(fixture.users.findById(73L)).thenReturn(Optional.of(user(73L, tokenUser.getEmail(), "ADMIN", 29L)));

        assertUnauthenticated(fixture, fixture.token(tokenUser));
    }

    @Test
    void rejectsChangedTenant() throws Exception {
        AppUser tokenUser = user(73L, "sales@example.test", "SALES", 29L);
        Fixture fixture = fixture(tokenUser);
        when(fixture.users.findById(73L)).thenReturn(Optional.of(user(73L, tokenUser.getEmail(), "SALES", 30L)));

        assertUnauthenticated(fixture, fixture.token(tokenUser));
    }

    @Test
    void rejectsExpiredTokenBeforeLookingUpAccount() throws Exception {
        AppUser user = user(73L, "sales@example.test", "SALES", 29L);
        Fixture fixture = fixture(user);

        String expiredToken = fixture.jwt.generateToken(user, new Date(System.currentTimeMillis() - 1_000));
        assertUnauthenticated(fixture, expiredToken);
    }

    @Test
    void acceptsPlatformAdminWithoutDealershipTenant() throws Exception {
        AppUser user = user(8L, "platform@example.test", "PLATFORM_ADMIN", null);
        Fixture fixture = fixture(user);
        AtomicReference<Authentication> requestAuthentication = new AtomicReference<>();
        AtomicReference<Long> requestTenant = new AtomicReference<>(1L);

        fixture.filter.doFilter(request(fixture.token(user)), new MockHttpServletResponse(), (request, response) -> {
            requestAuthentication.set(SecurityContextHolder.getContext().getAuthentication());
            requestTenant.set(TenantContext.getTenantId());
        });

        assertNotNull(requestAuthentication.get());
        assertEquals("ROLE_PLATFORM_ADMIN", requestAuthentication.get().getAuthorities().iterator().next().getAuthority());
        assertNull(requestTenant.get());
    }

    private void assertUnauthenticated(Fixture fixture, String token) throws Exception {
        AtomicReference<Authentication> requestAuthentication = new AtomicReference<>();
        fixture.filter.doFilter(request(token), new MockHttpServletResponse(), (request, response) ->
                requestAuthentication.set(SecurityContextHolder.getContext().getAuthentication()));
        assertNull(requestAuthentication.get());
        assertNull(TenantContext.getTenantId());
    }

    private Fixture fixture(AppUser currentUser) {
        JwtService jwt = new JwtService();
        ReflectionTestUtils.setField(jwt, "secretKey", TEST_SECRET);
        AppUserRepository users = mock(AppUserRepository.class);
        when(users.findById(currentUser.getUserId())).thenReturn(Optional.of(currentUser));
        return new Fixture(jwt, users, new JwtAuthenticationFilter(jwt, users));
    }

    private MockHttpServletRequest request(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }

    private AppUser user(Long id, String email, String role, Long tenantId) {
        AppUser user = new AppUser();
        user.setUserId(id);
        user.setEmail(email);
        user.setRole(role);
        user.setTenantId(tenantId);
        return user;
    }

    private record Fixture(JwtService jwt, AppUserRepository users, JwtAuthenticationFilter filter) {
        String token(AppUser user) { return jwt.generateToken(user); }
    }
}

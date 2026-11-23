package com.autocrm.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthRateLimitFilterTest {
    @Test
    void throttlesLoginBySocketIpAndIgnoresClientForwardedIp() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter();
        AtomicInteger forwarded = new AtomicInteger();
        for (int i = 0; i < 10; i++) {
            MockHttpServletResponse response = request(filter, "/api/auth/login", "198.51.100." + i,
                    (request, result) -> forwarded.incrementAndGet());
            assertEquals(200, response.getStatus());
        }
        MockHttpServletResponse blocked = request(filter, "/api/auth/login", "203.0.113.1",
                (request, result) -> forwarded.incrementAndGet());
        assertEquals(429, blocked.getStatus());
        assertTrue(blocked.getContentAsString().contains("Too many requests"));
        assertEquals(10, forwarded.get());
    }

    @Test
    void throttlesOtpSendSeparatelyFromOtpVerification() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter();
        for (int i = 0; i < 3; i++) request(filter, "/api/auth/send-otp", "127.0.0.1", (a, b) -> {});
        assertEquals(429, request(filter, "/api/auth/send-otp", "127.0.0.1", (a, b) -> {}).getStatus());
        assertEquals(200, request(filter, "/api/auth/verify-otp", "127.0.0.1", (a, b) -> {}).getStatus());
    }

    @Test
    void appliesLimitsToPasswordResetAndOtpVerificationEndpoints() throws Exception {
        Map<String, Integer> limits = Map.of(
                "/api/auth/verify-otp", 10,
                "/api/auth/forgot-password", 3,
                "/api/auth/verify-reset-otp", 10,
                "/api/auth/reset-password", 5);
        for (var entry : limits.entrySet()) {
            AuthRateLimitFilter filter = new AuthRateLimitFilter();
            for (int i = 0; i < entry.getValue(); i++) {
                assertEquals(200, request(filter, entry.getKey(), "127.0.0.1", (a, b) -> {}).getStatus());
            }
            assertEquals(429, request(filter, entry.getKey(), "127.0.0.1", (a, b) -> {}).getStatus(), entry.getKey());
        }
    }

    private MockHttpServletResponse request(AuthRateLimitFilter filter, String path, String forwardedIp,
            jakarta.servlet.FilterChain chain) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setRemoteAddr("192.0.2.25");
        request.addHeader("X-Forwarded-For", forwardedIp);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        return response;
    }
}

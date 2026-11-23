package com.autocrm.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Per-process IP throttles for authentication and OTP endpoints. Uses the socket peer address only. */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private static final long WINDOW_MILLIS = Duration.ofMinutes(10).toMillis();
    private static final Map<String, Integer> LIMITS = Map.of(
            "login", 10,
            "send-otp", 3,
            "verify-otp", 10,
            "forgot-password", 3,
            "verify-reset-otp", 10,
            "reset-password", 5);
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !HttpMethod.POST.matches(request.getMethod()) || route(request.getRequestURI()) == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String route = route(request.getRequestURI());
        long now = System.currentTimeMillis();
        // Deliberately ignore forwarded headers; they are client controlled unless a trusted proxy is configured.
        String key = request.getRemoteAddr() + ":" + route;
        Window window = windows.computeIfAbsent(key, ignored -> new Window(now));
        if (!window.allow(now, LIMITS.get(route))) {
            response.setStatus(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests. Please try again later.\"}");
            return;
        }
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(entry -> now - entry.getValue().startedAt >= WINDOW_MILLIS);
        }
        chain.doFilter(request, response);
    }

    private String route(String uri) {
        if (uri == null || !uri.startsWith("/api/auth/")) return null;
        String route = uri.substring("/api/auth/".length());
        return LIMITS.containsKey(route) ? route : null;
    }

    private static final class Window {
        private long startedAt;
        private int count;
        private Window(long startedAt) { this.startedAt = startedAt; }
        private synchronized boolean allow(long now, int limit) {
            if (now - startedAt >= WINDOW_MILLIS) { startedAt = now; count = 0; }
            return ++count <= limit;
        }
    }
}

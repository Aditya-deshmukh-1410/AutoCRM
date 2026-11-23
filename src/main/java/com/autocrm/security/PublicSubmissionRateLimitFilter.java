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

@Component
public class PublicSubmissionRateLimitFilter extends OncePerRequestFilter {
    private static final int MAX_SUBMISSIONS = 5;
    private static final long WINDOW_MILLIS = Duration.ofMinutes(10).toMillis();
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !HttpMethod.POST.matches(request.getMethod()) || routeKey(request.getRequestURI()) == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long now = System.currentTimeMillis();
        String key = request.getRemoteAddr() + ":" + routeKey(request.getRequestURI());
        Window window = windows.computeIfAbsent(key, ignored -> new Window(now));
        if (!window.allow(now)) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests. Please try again later.\"}");
            return;
        }
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(entry -> now - entry.getValue().startedAt() >= WINDOW_MILLIS);
        }
        chain.doFilter(request, response);
    }

    private String routeKey(String uri) {
        if (uri.startsWith("/public/")) {
            String[] segments = uri.substring(1).split("/");
            return segments.length == 3 ? "public/" + segments[2] : null;
        }
        if (uri.startsWith("/api/public/vehicles/")
                && (uri.endsWith("/enquiries") || uri.endsWith("/test-drives"))) {
            return uri.endsWith("/enquiries") ? "vehicle-enquiry" : "vehicle-test-drive";
        }
        return null;
    }

    private static final class Window {
        private long startedAt;
        private int count;
        private Window(long startedAt) { this.startedAt = startedAt; }
        private synchronized boolean allow(long now) {
            if (now - startedAt >= WINDOW_MILLIS) { startedAt = now; count = 0; }
            return ++count <= MAX_SUBMISSIONS;
        }
        private long startedAt() { return startedAt; }
    }
}

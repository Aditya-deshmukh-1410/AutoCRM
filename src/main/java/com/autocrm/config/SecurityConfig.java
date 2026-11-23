package com.autocrm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.autocrm.security.JwtAuthenticationFilter;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final java.util.List<String> allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
            @Value("${autocrm.security.allowed-origins:http://localhost:5173}") String allowedOrigins) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.allowedOrigins = java.util.Arrays.stream(allowedOrigins.split(","))
                .map(String::trim).filter(origin -> !origin.isEmpty()).distinct().toList();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, exception) -> {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Access Denied\"}");
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(allowedOrigins);

        configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        configuration.setAllowedHeaders(java.util.List.of("Authorization", "Content-Type", "Accept", "X-Requested-With"));

        // The application authenticates with an explicit Bearer header, not browser cookies.
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        // CSRF is disabled because authentication is stateless and carried in an explicit Bearer header.
        http.csrf(csrf -> csrf.disable())

                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth

                        // The React app is served by Spring in a packaged build; APIs remain protected below.
                        .requestMatchers(HttpMethod.GET, "/", "/index.html", "/assets/**", "/showroom",
                                "/login", "/signup", "/reset-password", "/control-panel", "/dashboard",
                                "/customers", "/leads", "/sell-requests", "/notifications", "/vehicles/**",
                                "/test-drives", "/sales", "/finance", "/activities", "/users",
                                "/audit-history", "/dealership-profile", "/dealership-settings", "/website",
                                "/site/**", "/builder-preview/**").permitAll()

                        // Public authentication endpoints
                        .requestMatchers("/api/auth/login").permitAll().requestMatchers("/api/auth/register")
                        .permitAll().requestMatchers("/api/auth/send-otp").permitAll()
                        .requestMatchers("/api/auth/verify-otp").permitAll()

                        // Forgot password endpoints
                        .requestMatchers("/api/auth/forgot-password").permitAll()
                        .requestMatchers("/api/auth/verify-reset-otp").permitAll()
                        .requestMatchers("/api/auth/reset-password").permitAll()

                        // Platform administration
                        .requestMatchers("/api/tenants/**").hasRole("PLATFORM_ADMIN")

                        // Dealership website builder is ADMIN-only; published website endpoints are public.
                        // Assigned CRM staff can work seller requests and view their photos.
                        .requestMatchers("/api/website/sell-requests/**").hasAnyRole("ADMIN", "SALES")
                        // Website design and image settings remain dealership-admin only.
                        .requestMatchers("/api/website/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/public/site-images/*", "/public/*",
                                "/public/*/cars", "/public/*/cars/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/public/*/enquiry", "/public/*/test-drive",
                                "/public/*/sell-car").permitAll()

                        // Dealership administration
                        .requestMatchers("/api/users/**").hasRole("ADMIN")
                        .requestMatchers("/api/audit-logs/**").hasRole("ADMIN")

                        // Sales-only endpoint
                        .requestMatchers("/api/rbac/sales").hasRole("SALES")

                        // Public showroom listing, published images, and vehicle enquiries
                        .requestMatchers(HttpMethod.GET, "/api/public/vehicles").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/public/vehicles/*/enquiries").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/public/vehicles/*/test-drives").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/public/vehicles/*/images",
                                "/api/public/vehicles/*/images/*",
                                "/api/public/vehicles/*/dealership-logo").permitAll()

                        // Dealership ADMIN controls vehicle publication
                        .requestMatchers(HttpMethod.PUT, "/api/vehicles/*/publication").hasRole("ADMIN")

                        // Everything else requires authentication
                        .anyRequest().authenticated())

                .exceptionHandling(exception -> exception

                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))

                        .accessDeniedHandler(accessDeniedHandler()))

                .headers(headers -> headers
                        .frameOptions(frame -> frame.deny())
                        .contentTypeOptions(org.springframework.security.config.Customizer.withDefaults())
                        .referrerPolicy(referrer -> referrer.policy(
                                org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)))

                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}

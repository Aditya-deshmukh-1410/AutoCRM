package com.autocrm.security;

import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.autocrm.model.AppUser;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    private static final long EXPIRATION_TIME = 1000 * 60 * 60; // 1 hour

    private SecretKey getKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    public String generateToken(AppUser user) {
        return generateToken(user, new Date(System.currentTimeMillis() + EXPIRATION_TIME));
    }

    String generateToken(AppUser user, Date expiresAt) {
        return Jwts.builder().subject(user.getEmail()).claim("userId", user.getUserId()).claim("role", user.getRole())
                .claim("tenantId", user.getTenantId()).issuedAt(new Date())
                .expiration(expiresAt).signWith(getKey()).compact();
    }

    public Claims extractClaims(String token) {

        return Jwts.parser().verifyWith(getKey()).build().parseSignedClaims(token).getPayload();
    }
}

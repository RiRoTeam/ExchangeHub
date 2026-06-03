package com.temka.app.service;

import com.temka.app.entity.RefreshToken;
import com.temka.app.entity.User;
import com.temka.app.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository repository;

    @Value("${app.jwt.refresh-expiration-ms:2592000000}") // 30 days default
    private long refreshExpirationMs;

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        revokeAll(user);
        var token = RefreshToken.builder()
                .token(UUID.randomUUID().toString())
                .user(user)
                .expiresAt(Instant.now().plusMillis(refreshExpirationMs))
                .revoked(false)
                .build();
        return repository.save(token);
    }

    @Transactional(readOnly = true)
    public RefreshToken verifyAndGet(String rawToken) {
        var token = repository.findByToken(rawToken)
                .orElseThrow(() -> new IllegalArgumentException("Refresh token not found"));
        if (token.isRevoked()) {
            throw new IllegalArgumentException("Refresh token has been revoked");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Refresh token has expired");
        }
        return token;
    }

    @Transactional
    public void revokeAll(User user) {
        repository.revokeAllByUser(user);
    }
}

package com.temka.app.service;

import com.temka.app.entity.RefreshToken;
import com.temka.app.entity.User;
import com.temka.app.exception.InvalidTokenException;
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

    @Value("${app.jwt.refresh-expiration-ms:2592000000}")
    private long refreshExpirationMs;

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        repository.revokeAllByUser(user);
        var token = RefreshToken.builder()
                .token(UUID.randomUUID().toString())
                .user(user)
                .expiresAt(Instant.now().plusMillis(refreshExpirationMs))
                .revoked(false)
                .build();
        return repository.save(token);
    }

    /**
     * Acquires a pessimistic row-level lock (SELECT FOR UPDATE) so that two
     * concurrent refresh requests for the same token are serialised.
     */
    @Transactional
    public RefreshToken verifyAndGet(String rawToken) {
        var token = repository.findByTokenForUpdate(rawToken)
                .orElseThrow(() -> new InvalidTokenException("Refresh token not found"));
        if (token.isRevoked()) {
            throw new InvalidTokenException("Refresh token has been revoked");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidTokenException("Refresh token has expired");
        }
        return token;
    }

    @Transactional
    public void revokeAllByUser(User user) {
        repository.revokeAllByUser(user);
    }

    @Transactional
    public void revoke(String rawToken) {
        repository.revokeByToken(rawToken);
    }
}

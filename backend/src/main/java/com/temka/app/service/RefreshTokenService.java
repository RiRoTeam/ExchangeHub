package com.temka.app.service;

import com.temka.app.entity.RefreshToken;
import com.temka.app.entity.User;
import com.temka.app.exception.InvalidTokenException;
import com.temka.app.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RefreshTokenRepository repository;

    @Value("${app.jwt.refresh-expiration-ms:2592000000}")
    private long refreshExpirationMs;

    @Transactional
    public String createRefreshToken(User user) {
        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        var token = RefreshToken.builder()
                .tokenHash(hash(rawToken))
                .user(user)
                .expiresAt(Instant.now().plusMillis(refreshExpirationMs))
                .revoked(false)
                .build();
        repository.save(token);
        return rawToken;
    }

    @Transactional(readOnly = true)
    public Long findUserId(String rawToken) {
        return repository.findActiveUserIdByTokenHash(hash(rawToken), Instant.now())
                .orElseThrow(() -> new InvalidTokenException("Refresh token not found"));
    }

    /**
     * Acquires a pessimistic row-level lock (SELECT FOR UPDATE) so that two
     * concurrent refresh requests for the same token are serialised.
     */
    @Transactional
    public RefreshToken verifyAndGet(String rawToken) {
        var token = repository.findByTokenHashForUpdate(hash(rawToken))
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
        repository.revokeByTokenHash(hash(rawToken));
    }

    @Transactional
    public int deleteExpiredOrRevoked() {
        return repository.deleteExpiredOrRevoked(Instant.now());
    }

    static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}

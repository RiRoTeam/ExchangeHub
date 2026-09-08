package com.temka.app.repository;

import com.temka.app.entity.RefreshToken;
import com.temka.app.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.time.Instant;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    @Query("""
            SELECT t.user.id FROM RefreshToken t
            WHERE t.tokenHash = :tokenHash
              AND t.revoked = false
              AND t.expiresAt > :now
            """)
    Optional<Long> findActiveUserIdByTokenHash(String tokenHash, Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM RefreshToken t WHERE t.tokenHash = :tokenHash")
    Optional<RefreshToken> findByTokenHashForUpdate(String tokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken t SET t.revoked = true WHERE t.user = :user AND t.revoked = false")
    void revokeAllByUser(User user);

    @Modifying(flushAutomatically = true)
    @Query("UPDATE RefreshToken t SET t.revoked = true WHERE t.tokenHash = :tokenHash AND t.revoked = false")
    int revokeByTokenHash(String tokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM RefreshToken t WHERE t.revoked = true OR t.expiresAt < :now")
    int deleteExpiredOrRevoked(Instant now);
}

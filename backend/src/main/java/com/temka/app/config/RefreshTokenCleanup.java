package com.temka.app.config;

import com.temka.app.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Component
@ConditionalOnProperty(
        prefix = "app.refresh-token-cleanup",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true
)
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenCleanup {

    private final RefreshTokenService refreshTokenService;

    @Scheduled(
            fixedDelayString = "${app.refresh-token-cleanup.fixed-delay-ms:3600000}",
            initialDelayString = "${app.refresh-token-cleanup.initial-delay-ms:60000}"
    )
    public void removeExpiredOrRevokedTokens() {
        int deleted = refreshTokenService.deleteExpiredOrRevoked();
        if (deleted > 0) {
            log.info("Removed {} expired or revoked refresh tokens", deleted);
        }
    }
}

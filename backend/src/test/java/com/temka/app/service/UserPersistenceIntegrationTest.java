package com.temka.app.service;

import com.temka.app.AbstractIntegrationTest;
import com.temka.app.dto.RefreshRequest;
import com.temka.app.dto.UpdateProfileRequest;
import com.temka.app.entity.RefreshToken;
import com.temka.app.entity.Role;
import com.temka.app.entity.User;
import com.temka.app.exception.InvalidTokenException;
import com.temka.app.repository.RefreshTokenRepository;
import com.temka.app.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserPersistenceIntegrationTest extends AbstractIntegrationTest {

    private static final String EMAIL_PATTERN = "persistence-test-%@example.com";

    @Autowired
    UserService userService;

    @Autowired
    AuthService authService;

    @Autowired
    RefreshTokenService refreshTokenService;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RefreshTokenRepository refreshTokenRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    TransactionTemplate transactionTemplate;

    @AfterEach
    void removeTestUsers() {
        jdbcTemplate.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PATTERN);
    }

    @Test
    void changeRolePersistsBeforeRefreshTokenBulkUpdateClearsContext() {
        saveUser("persistence-test-admin@example.com", Role.ADMIN, "AdminPassword123!");
        var target = saveUser("persistence-test-role@example.com", Role.USER, "UserPassword123!");
        var refreshToken = saveRefreshToken(target, "role-change-token");

        var response = userService.changeRole(target.getId(), Role.ADMIN);

        assertThat(response.role()).isEqualTo(Role.ADMIN);
        assertThat(roleInDatabase(target.getId())).isEqualTo("ADMIN");
        assertThat(tokenRevokedInDatabase(refreshToken.getId())).isTrue();
    }

    @Test
    void demotionAlsoPersistsAndRevokesRefreshTokens() {
        saveUser("persistence-test-remaining-admin@example.com", Role.ADMIN, "AdminPassword123!");
        var target = saveUser("persistence-test-demoted-admin@example.com", Role.ADMIN, "AdminPassword123!");
        var refreshToken = saveRefreshToken(target, "role-demotion-token");

        userService.changeRole(target.getId(), Role.USER);

        assertThat(roleInDatabase(target.getId())).isEqualTo("USER");
        assertThat(tokenRevokedInDatabase(refreshToken.getId())).isTrue();
    }

    @Test
    void passwordChangePersistsAndRevokesExistingRefreshTokens() {
        var user = saveUser("persistence-test-password@example.com", Role.USER, "OldPassword123!");
        var refreshToken = saveRefreshToken(user, "password-change-token");

        userService.updateProfile(
                user,
                new UpdateProfileRequest("Updated Name", "OldPassword123!", "NewPassword123!")
        );

        assertThat(jdbcTemplate.queryForObject(
                "SELECT name FROM users WHERE id = ?",
                String.class,
                user.getId()
        )).isEqualTo("Updated Name");
        String storedPassword = jdbcTemplate.queryForObject(
                "SELECT password FROM users WHERE id = ?",
                String.class,
                user.getId()
        );
        assertThat(passwordEncoder.matches("NewPassword123!", storedPassword)).isTrue();
        assertThat(passwordEncoder.matches("OldPassword123!", storedPassword)).isFalse();
        assertThat(tokenRevokedInDatabase(refreshToken.getId())).isTrue();
        assertThatThrownBy(() -> refreshTokenService.verifyAndGet("password-change-token"))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessage("Refresh token has been revoked");
    }

    @Test
    void nameOnlyChangeUsesFreshRoleAndKeepsPasswordAndRefreshToken() {
        var persistedUser = saveUser("persistence-test-profile@example.com", Role.USER, "ProfilePassword123!");
        var refreshToken = saveRefreshToken(persistedUser, "profile-name-token");
        var stalePrincipal = User.builder()
                .id(persistedUser.getId())
                .email(persistedUser.getEmail())
                .name("Stale Name")
                .password("stale-password")
                .role(Role.ADMIN)
                .build();

        var response = userService.updateProfile(
                stalePrincipal,
                new UpdateProfileRequest("Fresh Name", null, null)
        );

        assertThat(response.role()).isEqualTo(Role.USER);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT name FROM users WHERE id = ?",
                String.class,
                persistedUser.getId()
        )).isEqualTo("Fresh Name");
        String storedPassword = jdbcTemplate.queryForObject(
                "SELECT password FROM users WHERE id = ?",
                String.class,
                persistedUser.getId()
        );
        assertThat(passwordEncoder.matches("ProfilePassword123!", storedPassword)).isTrue();
        assertThat(tokenRevokedInDatabase(refreshToken.getId())).isFalse();
    }

    @Test
    void concurrentRefreshCannotEscapePasswordChangeRevocation() throws Exception {
        var user = saveUser("persistence-test-concurrent-refresh@example.com", Role.USER,
                "OldPassword123!");
        String rawRefreshToken = refreshTokenService.createRefreshToken(user);
        var userLocked = new CountDownLatch(1);
        var finishPasswordChange = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            var passwordChange = executor.submit(() -> transactionTemplate.executeWithoutResult(status -> {
                userRepository.findByIdForUpdate(user.getId()).orElseThrow();
                userLocked.countDown();
                await(finishPasswordChange);
                userService.updateProfile(
                        user,
                        new UpdateProfileRequest(null, "OldPassword123!", "NewPassword123!")
                );
            }));

            assertThat(userLocked.await(10, TimeUnit.SECONDS)).isTrue();
            var refresh = executor.submit(() ->
                    authService.refresh(new RefreshRequest(rawRefreshToken)));

            try {
                awaitDatabaseLockWait();
                assertThat(refresh.isDone()).isFalse();
            } finally {
                finishPasswordChange.countDown();
            }

            passwordChange.get(10, TimeUnit.SECONDS);
            assertThatThrownBy(() -> refresh.get(10, TimeUnit.SECONDS))
                    .isInstanceOf(ExecutionException.class)
                    .hasCauseInstanceOf(InvalidTokenException.class);
        }

        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND revoked = false",
                Long.class,
                user.getId()
        )).isZero();
    }

    private void awaitDatabaseLockWait() throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (System.nanoTime() < deadline) {
            Integer waitingSessions = jdbcTemplate.queryForObject("""
                    SELECT COUNT(*)
                    FROM pg_stat_activity
                    WHERE datname = current_database()
                      AND wait_event_type = 'Lock'
                    """, Integer.class);
            if (waitingSessions != null && waitingSessions > 0) {
                return;
            }
            Thread.sleep(50);
        }
        throw new AssertionError("Refresh transaction never waited for the locked user row");
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Concurrent test latch timed out");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Concurrent test interrupted", exception);
        }
    }

    private User saveUser(String email, Role role, String rawPassword) {
        return userRepository.save(User.builder()
                .email(email)
                .name("Persistence Test")
                .password(passwordEncoder.encode(rawPassword))
                .role(role)
                .build());
    }

    private RefreshToken saveRefreshToken(User user, String token) {
        return refreshTokenRepository.save(RefreshToken.builder()
                .tokenHash(RefreshTokenService.hash(token))
                .user(user)
                .expiresAt(Instant.now().plusSeconds(3_600))
                .revoked(false)
                .build());
    }

    private String roleInDatabase(Long userId) {
        return jdbcTemplate.queryForObject(
                "SELECT role FROM users WHERE id = ?",
                String.class,
                userId
        );
    }

    private boolean tokenRevokedInDatabase(Long tokenId) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT revoked FROM refresh_tokens WHERE id = ?",
                Boolean.class,
                tokenId
        ));
    }
}

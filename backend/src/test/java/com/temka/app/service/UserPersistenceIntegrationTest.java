package com.temka.app.service;

import com.temka.app.AbstractIntegrationTest;
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

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserPersistenceIntegrationTest extends AbstractIntegrationTest {

    private static final String EMAIL_PATTERN = "persistence-test-%@example.com";

    @Autowired
    UserService userService;

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
                .token(token)
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

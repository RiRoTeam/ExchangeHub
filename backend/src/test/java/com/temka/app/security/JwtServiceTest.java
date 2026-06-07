package com.temka.app.security;

import com.temka.app.entity.Role;
import com.temka.app.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;
    private User user;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(
                "test-secret-key-must-be-at-least-32-chars-long",
                900_000L
        );
        user = User.builder()
                .id(1L)
                .email("user@test.com")
                .name("Test User")
                .password("hashed")
                .role(Role.USER)
                .build();
    }

    @Test
    void generateAccessToken_subjectIsEmail() {
        String token = jwtService.generateAccessToken(user);
        assertThat(jwtService.extractUsername(token)).isEqualTo("user@test.com");
    }

    @Test
    void generateAccessToken_isValidForSameUser() {
        String token = jwtService.generateAccessToken(user);
        assertThat(jwtService.isValid(token, user)).isTrue();
    }

    @Test
    void isValid_returnsFalse_forDifferentUser() {
        String token = jwtService.generateAccessToken(user);

        User other = User.builder()
                .email("other@test.com")
                .name("Other")
                .password("hashed")
                .role(Role.USER)
                .build();

        assertThat(jwtService.isValid(token, other)).isFalse();
    }

    @Test
    void generateAccessToken_expiredToken_isNotValid() {
        JwtService shortLived = new JwtService(
                "test-secret-key-must-be-at-least-32-chars-long",
                -1L
        );
        String token = shortLived.generateAccessToken(user);
        assertThat(shortLived.isValid(token, user)).isFalse();
    }

    @Test
    void adminUser_tokenContainsAdminRole() {
        User admin = User.builder()
                .email("admin@test.com")
                .name("Admin")
                .password("hashed")
                .role(Role.ADMIN)
                .build();

        String token = jwtService.generateAccessToken(admin);
        assertThat(jwtService.isValid(token, admin)).isTrue();
        assertThat(jwtService.extractUsername(token)).isEqualTo("admin@test.com");
    }
}

package com.temka.app.config;

import com.temka.app.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@Import(AdminBootstrapPersistenceIntegrationTest.ExistingUserConfiguration.class)
@TestPropertySource(properties = {
        "app.bootstrap-admin.email=bootstrap-persistence@example.com",
        "app.bootstrap-admin.name=Bootstrap Admin",
        "app.bootstrap-admin.password=BootstrapPassword123!"
})
class AdminBootstrapPersistenceIntegrationTest extends AbstractIntegrationTest {

    private static final String EMAIL = "bootstrap-persistence@example.com";
    private static final String TOKEN = "bootstrap-persistence-token";

    @Autowired
    JdbcTemplate jdbcTemplate;

    @AfterEach
    void removeBootstrapUser() {
        jdbcTemplate.update("DELETE FROM users WHERE email = ?", EMAIL);
    }

    @Test
    void promotionPersistsBeforeRefreshTokenBulkUpdateClearsContext() {
        assertThat(jdbcTemplate.queryForObject(
                "SELECT role FROM users WHERE email = ?",
                String.class,
                EMAIL
        )).isEqualTo("ADMIN");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT revoked FROM refresh_tokens WHERE token = ?",
                Boolean.class,
                TOKEN
        )).isTrue();
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class ExistingUserConfiguration {

        @Bean
        @Order(Ordered.HIGHEST_PRECEDENCE)
        ApplicationRunner existingBootstrapUser(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder) {
            return args -> {
                jdbcTemplate.update("DELETE FROM users");
                jdbcTemplate.update(
                        """
                        INSERT INTO users (email, name, password, role, created_at)
                        VALUES (?, ?, ?, 'USER', CURRENT_TIMESTAMP)
                        """,
                        EMAIL,
                        "Existing User",
                        passwordEncoder.encode("ExistingPassword123!")
                );
                jdbcTemplate.update(
                        """
                        INSERT INTO refresh_tokens (token, user_id, expires_at, revoked)
                        SELECT ?, id, CURRENT_TIMESTAMP + INTERVAL '1 hour', false
                        FROM users
                        WHERE email = ?
                        """,
                        TOKEN,
                        EMAIL
                );
            };
        }
    }
}

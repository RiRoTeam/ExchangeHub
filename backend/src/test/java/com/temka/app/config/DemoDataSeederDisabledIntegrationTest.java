package com.temka.app.config;

import com.temka.app.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles({"test", "demo"})
@TestPropertySource(properties = "app.demo-data.enabled=false")
class DemoDataSeederDisabledIntegrationTest extends AbstractIntegrationTest {

    private static final String DEV_URL_PATTERN = "https://dev.exchangehub.local/programs/%";

    @Autowired
    ApplicationContext applicationContext;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @AfterEach
    void removeDevRows() {
        jdbcTemplate.update("DELETE FROM programs WHERE url LIKE ?", DEV_URL_PATTERN);
    }

    @Test
    void doesNotExposeKnownAccountsWhenDemoDataIsDisabled() {
        assertThat(applicationContext.getBeansOfType(DemoDataSeeder.class)).isEmpty();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email LIKE ?",
                Long.class,
                "%@demo.exchangehub.local"
        )).isZero();
    }
}

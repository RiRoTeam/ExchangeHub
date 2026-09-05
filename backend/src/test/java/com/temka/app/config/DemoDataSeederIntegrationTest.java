package com.temka.app.config;

import com.temka.app.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles({"test", "demo"})
@TestPropertySource(properties = "app.demo-data.enabled=true")
class DemoDataSeederIntegrationTest extends AbstractIntegrationTest {

    private static final String DEMO_URL_PATTERN = "https://example.com/?exchangehub-demo=%";
    private static final String DEV_URL_PATTERN = "https://dev.exchangehub.local/programs/%";

    @Autowired
    DemoDataSeeder demoDataSeeder;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    PasswordEncoder passwordEncoder;

    @AfterEach
    void removeDemoRows() {
        jdbcTemplate.update("DELETE FROM users WHERE email LIKE ?", "%@demo.exchangehub.local");
        jdbcTemplate.update("DELETE FROM programs WHERE url LIKE ?", DEMO_URL_PATTERN);
        jdbcTemplate.update("DELETE FROM programs WHERE url LIKE ?", DEV_URL_PATTERN);
    }

    @Test
    void createsCompleteIdempotentDemoDatasetWithoutOverwritingChanges() {
        assertThat(count("SELECT COUNT(*) FROM users WHERE email LIKE ?", "%@demo.exchangehub.local"))
                .isEqualTo(3);
        assertThat(count("SELECT COUNT(*) FROM programs WHERE url LIKE ? OR url LIKE ?", DEMO_URL_PATTERN, DEV_URL_PATTERN))
                .isEqualTo(13);
        assertThat(count("SELECT COUNT(*) FROM programs WHERE (url LIKE ? OR url LIKE ?) AND status = 'ACTIVE'", DEMO_URL_PATTERN, DEV_URL_PATTERN))
                .isEqualTo(11);
        assertThat(count("SELECT COUNT(*) FROM programs WHERE url LIKE ? AND status = 'INACTIVE'", DEMO_URL_PATTERN))
                .isEqualTo(1);
        assertThat(count("SELECT COUNT(*) FROM programs WHERE url LIKE ? AND status = 'DRAFT'", DEMO_URL_PATTERN))
                .isEqualTo(1);
        assertThat(count("SELECT COUNT(*) FROM submissions WHERE url LIKE ?", DEMO_URL_PATTERN))
                .isEqualTo(5);
        assertThat(count("SELECT COUNT(*) FROM user_favorites f JOIN users u ON u.id = f.user_id WHERE u.email LIKE ?", "%@demo.exchangehub.local"))
                .isEqualTo(7);
        assertThat(count("SELECT COUNT(*) FROM program_analytics a JOIN programs p ON p.id = a.program_id WHERE p.url LIKE ?", DEMO_URL_PATTERN))
                .isEqualTo(8);
        assertThat(count("SELECT COUNT(*) FROM program_analytics_daily d JOIN programs p ON p.id = d.program_id WHERE p.url LIKE ?", DEMO_URL_PATTERN))
                .isEqualTo(40);

        String adminHash = jdbcTemplate.queryForObject(
                "SELECT password FROM users WHERE email = ?",
                String.class,
                DemoDataSeeder.ADMIN_EMAIL
        );
        String userHash = jdbcTemplate.queryForObject(
                "SELECT password FROM users WHERE email = ?",
                String.class,
                DemoDataSeeder.USER_EMAIL
        );
        assertThat(passwordEncoder.matches(DemoDataSeeder.ADMIN_PASSWORD, adminHash)).isTrue();
        assertThat(passwordEncoder.matches(DemoDataSeeder.USER_PASSWORD, userHash)).isTrue();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT role FROM users WHERE email = ?",
                String.class,
                DemoDataSeeder.ADMIN_EMAIL
        )).isEqualTo("ADMIN");

        assertThat(count("SELECT COUNT(*) FROM programs p JOIN submissions s ON s.url = p.url WHERE s.status = 'APPROVED' AND s.url LIKE ?", DEMO_URL_PATTERN))
                .isEqualTo(1);

        String markerUrl = "https://example.com/?exchangehub-demo=tallinn-digital-society";
        jdbcTemplate.update("UPDATE programs SET title = ? WHERE url = ?", "Locally edited title", markerUrl);
        jdbcTemplate.update("""
                DELETE FROM program_analytics_daily
                WHERE (program_id, event_date) = (
                    SELECT d.program_id, d.event_date
                    FROM program_analytics_daily d
                    JOIN programs p ON p.id = d.program_id
                    WHERE p.url = ?
                    ORDER BY d.event_date
                    LIMIT 1
                )
                """, markerUrl);

        demoDataSeeder.run(new DefaultApplicationArguments(new String[0]));

        assertThat(count("SELECT COUNT(*) FROM users WHERE email LIKE ?", "%@demo.exchangehub.local"))
                .isEqualTo(3);
        assertThat(count("SELECT COUNT(*) FROM programs WHERE url LIKE ? OR url LIKE ?", DEMO_URL_PATTERN, DEV_URL_PATTERN))
                .isEqualTo(13);
        assertThat(count("SELECT COUNT(*) FROM submissions WHERE url LIKE ?", DEMO_URL_PATTERN))
                .isEqualTo(5);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT title FROM programs WHERE url = ?",
                String.class,
                markerUrl
        )).isEqualTo("Locally edited title");
        assertThat(count("SELECT COUNT(*) FROM program_analytics_daily d JOIN programs p ON p.id = d.program_id WHERE p.url LIKE ?", DEMO_URL_PATTERN))
                .isEqualTo(39);
    }

    private long count(String sql, Object... parameters) {
        Long result = jdbcTemplate.queryForObject(sql, Long.class, parameters);
        return result == null ? 0 : result;
    }
}

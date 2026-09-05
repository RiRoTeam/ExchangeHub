package com.temka.app.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Adds a small representative catalog when the {@code dev} profile is active.
 * Stable marker URLs make repeated local starts idempotent without changing
 * data that a developer may have edited after the initial seed.
 */
@Slf4j
@Component
@Profile({"dev", "demo"})
@Order(10)
@RequiredArgsConstructor
public class DevDataSeeder implements ApplicationRunner {

    private static final String INSERT_IF_MISSING = """
            INSERT INTO programs
                (title, description, country, type, deadline, url, status, created_at)
            SELECT ?, ?, ?, ?, ?, ?, 'ACTIVE', ?
            WHERE NOT EXISTS (SELECT 1 FROM programs WHERE url = ?)
            """;

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        LocalDate today = LocalDate.now();
        Instant now = Instant.now();

        int inserted = 0;
        inserted += insert(
                "Dev: Arctic Field Internship",
                "Expired-deadline sample for checking catalog states and historical entries.",
                "Norway",
                "INTERNSHIP",
                today.minusDays(14),
                "https://dev.exchangehub.local/programs/expired",
                now.minusSeconds(180L * 24 * 60 * 60)
        );
        inserted += insert(
                "Dev: Community Exchange Lab",
                "Deadline-today sample: applications remain valid through the current date.",
                "Estonia",
                "EXCHANGE",
                today,
                "https://dev.exchangehub.local/programs/today",
                now.minusSeconds(30L * 24 * 60 * 60)
        );
        inserted += insert(
                "Dev: Emerging Researchers Grant",
                "Future-deadline sample for the default active opportunity flow.",
                "Finland",
                "SCHOLARSHIP",
                today.plusDays(45),
                "https://dev.exchangehub.local/programs/future",
                now.minusSeconds(2L * 24 * 60 * 60)
        );

        log.info("Dev catalog seed complete: {} representative program(s) inserted", inserted);
    }

    private int insert(
            String title,
            String description,
            String country,
            String type,
            LocalDate deadline,
            String markerUrl,
            Instant createdAt
    ) {
        return jdbcTemplate.update(
                INSERT_IF_MISSING,
                title,
                description,
                country,
                type,
                Date.valueOf(deadline),
                markerUrl,
                Timestamp.from(createdAt),
                markerUrl
        );
    }
}

package com.temka.app.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Creates a deterministic, idempotent dataset for the isolated local demo stack.
 * Existing rows are never overwritten, so manual testing survives a restart.
 */
@Slf4j
@Component
@Profile("demo")
@Order(20)
@ConditionalOnProperty(prefix = "app.demo-data", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    public static final String ADMIN_EMAIL = "admin@demo.exchangehub.local";
    public static final String ADMIN_PASSWORD = "DemoAdmin123!";
    public static final String USER_EMAIL = "student@demo.exchangehub.local";
    public static final String USER_PASSWORD = "DemoUser123!";
    public static final String CONTRIBUTOR_EMAIL = "contributor@demo.exchangehub.local";
    public static final String CONTRIBUTOR_PASSWORD = "DemoContributor123!";

    private static final String URL_PREFIX = "https://example.com/?exchangehub-demo=";
    private static final String DEV_URL_PREFIX = "https://dev.exchangehub.local/programs/";

    private static final String INSERT_USER = """
            INSERT INTO users (email, name, password, role, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (email) DO NOTHING
            """;

    private static final String INSERT_PROGRAM = """
            INSERT INTO programs
                (title, description, country, type, deadline, url, status, created_at)
            SELECT ?, ?, ?, ?, ?, ?, ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM programs WHERE url = ?)
            """;

    private static final String INSERT_SUBMISSION = """
            INSERT INTO submissions
                (user_id, title, description, country, type, deadline, url,
                 status, admin_comment, created_at, reviewed_at)
            SELECT u.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            FROM users u
            WHERE u.email = ?
              AND NOT EXISTS (SELECT 1 FROM submissions WHERE url = ?)
            """;

    private static final String INSERT_FAVORITE = """
            INSERT INTO user_favorites (user_id, program_id, created_at)
            SELECT u.id, p.id, ?
            FROM users u
            CROSS JOIN programs p
            WHERE u.email = ? AND p.url = ?
            ON CONFLICT (user_id, program_id) DO NOTHING
            """;

    private static final String INSERT_ANALYTICS = """
            INSERT INTO program_analytics (program_id, view_count, click_count, updated_at)
            SELECT p.id, ?, ?, CURRENT_TIMESTAMP
            FROM programs p
            WHERE p.url = ?
            ON CONFLICT (program_id) DO NOTHING
            """;

    private static final String INSERT_DAILY_ANALYTICS = """
            INSERT INTO program_analytics_daily
                (program_id, event_date, view_count, click_count, updated_at)
            SELECT p.id, ?, ?, ?, CURRENT_TIMESTAMP
            FROM programs p
            WHERE p.url = ?
            ON CONFLICT (program_id, event_date) DO NOTHING
            """;

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        LocalDate today = LocalDate.now();
        Instant now = Instant.now();

        int insertedUsers = seedUsers(now);
        int insertedPrograms = seedPrograms(today, now);
        int insertedSubmissions = seedSubmissions(today, now);
        int insertedFavorites = seedFavorites(now);
        int insertedAnalyticsRows = seedAnalytics(today);

        log.info(
                "Demo data ready: users={}, programs={}, submissions={}, favorites={}, analytics rows={}",
                insertedUsers,
                insertedPrograms,
                insertedSubmissions,
                insertedFavorites,
                insertedAnalyticsRows
        );
    }

    private int seedUsers(Instant now) {
        int inserted = 0;
        inserted += insertUser(ADMIN_EMAIL, "Demo Administrator", ADMIN_PASSWORD, "ADMIN", now.minusSeconds(90L * 86_400));
        inserted += insertUser(USER_EMAIL, "Maya Student", USER_PASSWORD, "USER", now.minusSeconds(45L * 86_400));
        inserted += insertUser(CONTRIBUTOR_EMAIL, "Alex Contributor", CONTRIBUTOR_PASSWORD, "USER", now.minusSeconds(20L * 86_400));
        return inserted;
    }

    private int insertUser(String email, String name, String password, String role, Instant createdAt) {
        return jdbcTemplate.update(
                INSERT_USER,
                email,
                name,
                passwordEncoder.encode(password),
                role,
                Timestamp.from(createdAt)
        );
    }

    private int seedPrograms(LocalDate today, Instant now) {
        List<ProgramSeed> programs = List.of(
                new ProgramSeed("Tallinn Digital Society Fellowship", "Work with public-interest teams on accessible digital services and open government tools.", "Estonia", "SCHOLARSHIP", today.plusDays(45), "tallinn-digital-society", "ACTIVE", now.minusSeconds(60L * 86_400)),
                new ProgramSeed("Nordic Climate Field Lab", "A hands-on climate adaptation internship combining field research and community workshops.", "Norway", "INTERNSHIP", today.plusDays(14), "nordic-climate-field-lab", "ACTIVE", now.minusSeconds(35L * 86_400)),
                new ProgramSeed("Kyoto Community Design Exchange", "Collaborate with local organisations on inclusive neighbourhood and service design.", "Japan", "EXCHANGE", today, "kyoto-community-design", "ACTIVE", now.minusSeconds(28L * 86_400)),
                new ProgramSeed("Open Source Accessibility Residency", "Build practical accessibility improvements with maintainers of small open-source projects.", "Germany", "OTHER", today.plusDays(75), "open-source-accessibility", "ACTIVE", now.minusSeconds(15L * 86_400)),
                new ProgramSeed("Tbilisi Civic Tech Internship", "Prototype civic participation tools with a multidisciplinary social-impact studio.", "Georgia", "INTERNSHIP", today.plusDays(30), "tbilisi-civic-tech", "ACTIVE", now.minusSeconds(10L * 86_400)),
                new ProgramSeed("Baltic Blue Economy Grant", "A small research grant for early-career projects supporting healthy coastal communities.", "Latvia", "SCHOLARSHIP", today.plusDays(90), "baltic-blue-economy", "ACTIVE", now.minusSeconds(7L * 86_400)),
                new ProgramSeed("Youth Climate Negotiation Academy", "Training for young facilitators preparing for local climate negotiations.", "Belgium", "SCHOLARSHIP", today.plusDays(70), "submission-climate-academy", "ACTIVE", now.minusSeconds(15L * 86_400)),
                new ProgramSeed("Rural Makers Residency", "A short residency for makers creating repairable tools with rural communities.", "Spain", "OTHER", today.plusDays(5), "rural-makers-residency", "ACTIVE", now.minusSeconds(86_400)),
                new ProgramSeed("Circular Cities Pilot", "Archived pilot retained in the demo database to test inactive records.", "Netherlands", "OTHER", today.minusDays(30), "circular-cities-pilot", "INACTIVE", now.minusSeconds(120L * 86_400)),
                new ProgramSeed("Community Radio Fellowship", "Draft opportunity used to demonstrate non-public program states.", "Ireland", "SCHOLARSHIP", today.plusDays(120), "community-radio-fellowship", "DRAFT", now.minusSeconds(3_600))
        );

        int inserted = 0;
        for (ProgramSeed program : programs) {
            String url = demoUrl(program.slug());
            inserted += jdbcTemplate.update(
                    INSERT_PROGRAM,
                    program.title(),
                    program.description(),
                    program.country(),
                    program.type(),
                    Date.valueOf(program.deadline()),
                    url,
                    program.status(),
                    Timestamp.from(program.createdAt()),
                    url
            );
        }
        return inserted;
    }

    private int seedSubmissions(LocalDate today, Instant now) {
        List<SubmissionSeed> submissions = List.of(
                new SubmissionSeed(USER_EMAIL, "Open Data Storytelling Lab", "A workshop series for turning public datasets into clear community stories.", "Czechia", "OTHER", today.plusDays(35), "submission-open-data-storytelling", "PENDING", null, now.minusSeconds(2L * 86_400), null),
                new SubmissionSeed(USER_EMAIL, "Youth Climate Negotiation Academy", "Training for young facilitators preparing for local climate negotiations.", "Belgium", "SCHOLARSHIP", today.plusDays(70), "submission-climate-academy", "APPROVED", "Strong fit for the catalog.", now.minusSeconds(18L * 86_400), now.minusSeconds(15L * 86_400)),
                new SubmissionSeed(USER_EMAIL, "Global Explorer Giveaway", "A deliberately low-detail demo submission used to show a rejected state.", "Worldwide", "OTHER", today.plusDays(20), "submission-explorer-giveaway", "REJECTED", "The source could not be verified.", now.minusSeconds(12L * 86_400), now.minusSeconds(10L * 86_400)),
                new SubmissionSeed(CONTRIBUTOR_EMAIL, "Alpine Biodiversity Field School", "Field school proposal focused on community biodiversity monitoring.", "Switzerland", "INTERNSHIP", today.plusDays(50), "submission-alpine-biodiversity", "PENDING", null, now.minusSeconds(30L * 3_600), null),
                new SubmissionSeed(CONTRIBUTOR_EMAIL, "Community Archives Exchange", "Peer exchange for small museums and volunteer-run archives.", "Lithuania", "EXCHANGE", today.plusDays(80), "submission-community-archives", "PENDING", null, now.minusSeconds(8L * 3_600), null)
        );

        int inserted = 0;
        for (SubmissionSeed submission : submissions) {
            String url = demoUrl(submission.slug());
            inserted += jdbcTemplate.update(
                    INSERT_SUBMISSION,
                    submission.title(),
                    submission.description(),
                    submission.country(),
                    submission.type(),
                    Date.valueOf(submission.deadline()),
                    url,
                    submission.status(),
                    submission.adminComment(),
                    Timestamp.from(submission.createdAt()),
                    timestamp(submission.reviewedAt()),
                    submission.email(),
                    url
            );
        }
        return inserted;
    }

    private int seedFavorites(Instant now) {
        List<FavoriteSeed> favorites = List.of(
                new FavoriteSeed(USER_EMAIL, "tallinn-digital-society", now.minusSeconds(5L * 86_400)),
                new FavoriteSeed(USER_EMAIL, "kyoto-community-design", now.minusSeconds(4L * 86_400)),
                new FavoriteSeed(USER_EMAIL, "open-source-accessibility", now.minusSeconds(3L * 86_400)),
                new FavoriteSeed(USER_EMAIL, "expired", now.minusSeconds(2L * 86_400)),
                new FavoriteSeed(CONTRIBUTOR_EMAIL, "nordic-climate-field-lab", now.minusSeconds(3L * 86_400)),
                new FavoriteSeed(CONTRIBUTOR_EMAIL, "tbilisi-civic-tech", now.minusSeconds(2L * 86_400)),
                new FavoriteSeed(CONTRIBUTOR_EMAIL, "rural-makers-residency", now.minusSeconds(86_400))
        );

        int inserted = 0;
        for (FavoriteSeed favorite : favorites) {
            inserted += jdbcTemplate.update(
                    INSERT_FAVORITE,
                    Timestamp.from(favorite.createdAt()),
                    favorite.email(),
                    programUrl(favorite.programSlug())
            );
        }
        return inserted;
    }

    private int seedAnalytics(LocalDate today) {
        List<AnalyticsSeed> analytics = List.of(
                new AnalyticsSeed("tallinn-digital-society", 148, 42),
                new AnalyticsSeed("nordic-climate-field-lab", 116, 31),
                new AnalyticsSeed("kyoto-community-design", 94, 24),
                new AnalyticsSeed("open-source-accessibility", 82, 19),
                new AnalyticsSeed("tbilisi-civic-tech", 73, 16),
                new AnalyticsSeed("baltic-blue-economy", 61, 14),
                new AnalyticsSeed("submission-climate-academy", 54, 12),
                new AnalyticsSeed("rural-makers-residency", 39, 8)
        );

        int inserted = 0;
        for (AnalyticsSeed seed : analytics) {
            String url = demoUrl(seed.programSlug());
            int insertedBaseline = jdbcTemplate.update(INSERT_ANALYTICS, seed.views(), seed.clicks(), url);
            inserted += insertedBaseline;
            if (insertedBaseline == 0) {
                continue;
            }
            for (int day = 4; day >= 0; day--) {
                int bucket = 4 - day;
                inserted += jdbcTemplate.update(
                        INSERT_DAILY_ANALYTICS,
                        Date.valueOf(today.minusDays(day)),
                        split(seed.views(), bucket),
                        split(seed.clicks(), bucket),
                        url
                );
            }
        }
        return inserted;
    }

    private int split(int total, int bucket) {
        return total / 5 + (bucket < total % 5 ? 1 : 0);
    }

    private Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    private String demoUrl(String slug) {
        return URL_PREFIX + slug;
    }

    private String programUrl(String slug) {
        return "expired".equals(slug) ? DEV_URL_PREFIX + slug : demoUrl(slug);
    }

    private record ProgramSeed(
            String title,
            String description,
            String country,
            String type,
            LocalDate deadline,
            String slug,
            String status,
            Instant createdAt
    ) {
    }

    private record SubmissionSeed(
            String email,
            String title,
            String description,
            String country,
            String type,
            LocalDate deadline,
            String slug,
            String status,
            String adminComment,
            Instant createdAt,
            Instant reviewedAt
    ) {
    }

    private record FavoriteSeed(String email, String programSlug, Instant createdAt) {
    }

    private record AnalyticsSeed(String programSlug, int views, int clicks) {
    }
}

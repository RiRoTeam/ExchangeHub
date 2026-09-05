package com.temka.app.repository;

import com.temka.app.entity.ProgramAnalytics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDate;

public interface ProgramAnalyticsRepository extends JpaRepository<ProgramAnalytics, Long> {

    @Modifying
    @Query(value = """
            INSERT INTO program_analytics (program_id, view_count, click_count, updated_at)
            SELECT id, 1, 0, CURRENT_TIMESTAMP
            FROM programs
            WHERE id = :programId
            ON CONFLICT (program_id) DO UPDATE
            SET view_count = program_analytics.view_count + 1,
                updated_at = CURRENT_TIMESTAMP
            """, nativeQuery = true)
    int incrementViews(long programId);

    @Modifying
    @Query(value = """
            INSERT INTO program_analytics (program_id, view_count, click_count, updated_at)
            SELECT id, 0, 1, CURRENT_TIMESTAMP
            FROM programs
            WHERE id = :programId
            ON CONFLICT (program_id) DO UPDATE
            SET click_count = program_analytics.click_count + 1,
                updated_at = CURRENT_TIMESTAMP
            """, nativeQuery = true)
    int incrementClicks(long programId);

    @Modifying
    @Query(value = """
            INSERT INTO program_analytics_daily
                (program_id, event_date, view_count, click_count, updated_at)
            SELECT id, CURRENT_DATE, 1, 0, CURRENT_TIMESTAMP
            FROM programs
            WHERE id = :programId
            ON CONFLICT (program_id, event_date) DO UPDATE
            SET view_count = program_analytics_daily.view_count + 1,
                updated_at = CURRENT_TIMESTAMP
            """, nativeQuery = true)
    int incrementDailyViews(long programId);

    @Modifying
    @Query(value = """
            INSERT INTO program_analytics_daily
                (program_id, event_date, view_count, click_count, updated_at)
            SELECT id, CURRENT_DATE, 0, 1, CURRENT_TIMESTAMP
            FROM programs
            WHERE id = :programId
            ON CONFLICT (program_id, event_date) DO UPDATE
            SET click_count = program_analytics_daily.click_count + 1,
                updated_at = CURRENT_TIMESTAMP
            """, nativeQuery = true)
    int incrementDailyClicks(long programId);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM program_analytics_daily", nativeQuery = true)
    void deleteDailyAnalytics();

    @Query(value = """
            SELECT
                (SELECT COUNT(*) FROM users) AS users,
                (SELECT COUNT(*) FROM programs) AS programs,
                (SELECT COUNT(*) FROM submissions) AS submissions,
                (SELECT COUNT(*) FROM user_favorites) AS favorites,
                COALESCE((SELECT SUM(view_count) FROM program_analytics), 0) AS views,
                COALESCE((SELECT SUM(click_count) FROM program_analytics), 0) AS clicks
            """, nativeQuery = true)
    AnalyticsTotalsProjection findAnalyticsTotals();

    @Query(value = """
            SELECT p.id AS id,
                   p.title AS title,
                   COALESCE(a.view_count, 0) AS views,
                   COALESCE(a.click_count, 0) AS clicks,
                   COALESCE(f.favorite_count, 0) AS favorites,
                   COALESCE(a.view_count, 0) + COALESCE(a.click_count, 0)
                       + COALESCE(f.favorite_count, 0) AS totalEngagement
            FROM programs p
            LEFT JOIN program_analytics a ON a.program_id = p.id
            LEFT JOIN (
                SELECT program_id, COUNT(*) AS favorite_count
                FROM user_favorites
                GROUP BY program_id
            ) f ON f.program_id = p.id
            ORDER BY totalEngagement DESC, views DESC, clicks DESC, p.id ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<TopProgramProjection> findTopPrograms(int limit);

    @Query(value = """
            SELECT series.day::date AS eventDate,
                   COALESCE(SUM(d.view_count), 0) AS views,
                   COALESCE(SUM(d.click_count), 0) AS clicks
            FROM generate_series(
                CURRENT_DATE - 29,
                CURRENT_DATE,
                INTERVAL '1 day'
            ) AS series(day)
            LEFT JOIN program_analytics_daily d
                ON d.event_date = series.day::date
            GROUP BY series.day
            ORDER BY series.day
            """, nativeQuery = true)
    List<DailyEngagementProjection> findDailyEngagement();

    interface AnalyticsTotalsProjection {
        long getUsers();

        long getPrograms();

        long getSubmissions();

        long getFavorites();

        long getViews();

        long getClicks();
    }

    interface TopProgramProjection {
        Long getId();

        String getTitle();

        long getViews();

        long getClicks();

        long getFavorites();

        long getTotalEngagement();
    }

    interface DailyEngagementProjection {
        LocalDate getEventDate();

        long getViews();

        long getClicks();
    }
}

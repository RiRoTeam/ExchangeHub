package com.temka.app.repository;

import com.temka.app.AbstractIntegrationTest;
import com.temka.app.entity.Program;
import com.temka.app.entity.ProgramAnalyticsEventType;
import com.temka.app.entity.ProgramType;
import com.temka.app.entity.Role;
import com.temka.app.entity.User;
import com.temka.app.entity.UserFavorite;
import com.temka.app.entity.UserFavoriteId;
import com.temka.app.service.ProgramAnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

class ProgramAnalyticsRepositoryIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    ProgramRepository programRepository;

    @Autowired
    ProgramAnalyticsRepository analyticsRepository;

    @Autowired
    ProgramAnalyticsService analyticsService;

    @Autowired
    UserRepository userRepository;

    @Autowired
    UserFavoriteRepository favoriteRepository;

    @BeforeEach
    void clearAnalytics() {
        analyticsRepository.deleteAll();
    }

    @Test
    void concurrentEventsAreRecordedWithoutLostUpdates() throws Exception {
        var program = programRepository.save(Program.builder()
                .title("Concurrent analytics program")
                .description("Atomic counter test")
                .country("Estonia")
                .type(ProgramType.EXCHANGE)
                .build());
        int eventCount = 40;
        var tasks = new ArrayList<java.util.concurrent.Callable<Void>>(eventCount);
        for (int i = 0; i < eventCount; i++) {
            tasks.add(() -> {
                analyticsService.record(program.getId(), ProgramAnalyticsEventType.VIEW);
                return null;
            });
        }

        try (var executor = Executors.newFixedThreadPool(8)) {
            for (var future : executor.invokeAll(tasks)) {
                future.get();
            }
        }

        var analytics = analyticsRepository.findById(program.getId()).orElseThrow();
        assertThat(analytics.getViewCount()).isEqualTo(eventCount);
        assertThat(analytics.getClickCount()).isZero();
    }

    @Test
    void topProgramsQueryIsBoundedAndContainsPersistedCounters() {
        var program = programRepository.save(Program.builder()
                .title("Ranked analytics program")
                .description("Top list test")
                .country("Germany")
                .type(ProgramType.INTERNSHIP)
                .build());
        analyticsService.record(program.getId(), ProgramAnalyticsEventType.VIEW);
        analyticsService.record(program.getId(), ProgramAnalyticsEventType.CLICK);

        var topPrograms = analyticsRepository.findTopPrograms(10);

        assertThat(topPrograms).hasSizeLessThanOrEqualTo(10);
        assertThat(topPrograms)
                .filteredOn(top -> top.getId().equals(program.getId()))
                .singleElement()
                .satisfies(top -> {
                    assertThat(top.getViews()).isEqualTo(1);
                    assertThat(top.getClicks()).isEqualTo(1);
                    assertThat(top.getTotalEngagement()).isGreaterThanOrEqualTo(2);
        });
    }

    @Test
    void totalsAndTopProgramsIncludeCountersAndFavorites() {
        var before = analyticsRepository.findAnalyticsTotals();
        long usersBefore = before.getUsers();
        long programsBefore = before.getPrograms();
        long favoritesBefore = before.getFavorites();

        var user = userRepository.save(User.builder()
                .email("analytics-" + System.nanoTime() + "@test.example")
                .name("Analytics User")
                .password("not-used")
                .role(Role.USER)
                .build());
        var program = programRepository.save(Program.builder()
                .title("Aggregate analytics program")
                .description("Aggregate query test")
                .country("Finland")
                .type(ProgramType.SCHOLARSHIP)
                .build());
        favoriteRepository.save(UserFavorite.builder()
                .id(new UserFavoriteId(user.getId(), program.getId()))
                .user(user)
                .program(program)
                .build());
        analyticsService.record(program.getId(), ProgramAnalyticsEventType.VIEW);
        analyticsService.record(program.getId(), ProgramAnalyticsEventType.CLICK);

        var totals = analyticsRepository.findAnalyticsTotals();
        var topPrograms = analyticsRepository.findTopPrograms(10);

        assertThat(totals.getUsers()).isEqualTo(usersBefore + 1);
        assertThat(totals.getPrograms()).isEqualTo(programsBefore + 1);
        assertThat(totals.getFavorites()).isEqualTo(favoritesBefore + 1);
        assertThat(totals.getViews()).isEqualTo(1);
        assertThat(totals.getClicks()).isEqualTo(1);
        assertThat(topPrograms)
                .filteredOn(top -> top.getId().equals(program.getId()))
                .singleElement()
                .satisfies(top -> {
                    assertThat(top.getViews()).isEqualTo(1);
                    assertThat(top.getClicks()).isEqualTo(1);
                    assertThat(top.getFavorites()).isEqualTo(1);
                    assertThat(top.getTotalEngagement()).isEqualTo(3);
                });
    }
}

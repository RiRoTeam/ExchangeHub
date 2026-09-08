package com.temka.app.service;

import com.temka.app.AbstractIntegrationTest;
import com.temka.app.dto.ReviewSubmissionRequest;
import com.temka.app.entity.ProgramType;
import com.temka.app.entity.Role;
import com.temka.app.entity.Submission;
import com.temka.app.entity.SubmissionStatus;
import com.temka.app.entity.User;
import com.temka.app.repository.SubmissionRepository;
import com.temka.app.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class SubmissionReviewConcurrencyIntegrationTest extends AbstractIntegrationTest {

    private static final String EMAIL = "concurrent-review@example.com";
    private static final String URL = "https://example.com/concurrent-review";

    @Autowired
    SubmissionService submissionService;

    @Autowired
    SubmissionRepository submissionRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @AfterEach
    void cleanUp() {
        jdbcTemplate.update("DELETE FROM programs WHERE url = ?", URL);
        jdbcTemplate.update("DELETE FROM users WHERE email = ?", EMAIL);
    }

    @Test
    void concurrentApprovalCreatesExactlyOneProgramAndConflictsTheSecondReview() throws Exception {
        var user = userRepository.save(User.builder()
                .email(EMAIL)
                .name("Concurrent Reviewer")
                .password("not-used")
                .role(Role.USER)
                .build());
        var submission = submissionRepository.save(Submission.builder()
                .submittedBy(user)
                .title("Concurrent review program")
                .description("Must only be published once")
                .country("Estonia")
                .type(ProgramType.EXCHANGE)
                .url(URL)
                .build());

        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        var review = new ReviewSubmissionRequest(SubmissionStatus.APPROVED, " Approved ");

        try (var executor = Executors.newFixedThreadPool(2)) {
            List<Callable<Boolean>> tasks = List.of(
                    () -> reviewAfterBarrier(submission.getId(), review, ready, start),
                    () -> reviewAfterBarrier(submission.getId(), review, ready, start)
            );
            var futures = tasks.stream().map(executor::submit).toList();
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            assertThat(futures)
                    .extracting(future -> future.get(20, TimeUnit.SECONDS))
                    .containsExactlyInAnyOrder(true, false);
        }

        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM programs WHERE url = ?",
                Long.class,
                URL
        )).isEqualTo(1L);
        assertThat(submissionRepository.findById(submission.getId()).orElseThrow().getStatus())
                .isEqualTo(SubmissionStatus.APPROVED);
    }

    private boolean reviewAfterBarrier(
            Long submissionId,
            ReviewSubmissionRequest request,
            CountDownLatch ready,
            CountDownLatch start
    ) throws InterruptedException {
        ready.countDown();
        if (!start.await(10, TimeUnit.SECONDS)) {
            throw new IllegalStateException("Review start barrier timed out");
        }
        try {
            submissionService.review(submissionId, request);
            return true;
        } catch (IllegalStateException expectedConflict) {
            return false;
        }
    }
}

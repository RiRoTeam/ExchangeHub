package com.temka.app.service;

import com.temka.app.dto.ReviewSubmissionRequest;
import com.temka.app.dto.SubmissionRequest;
import com.temka.app.entity.*;
import com.temka.app.repository.ProgramRepository;
import com.temka.app.repository.SubmissionRepository;
import com.temka.app.exception.BadRequestException;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionServiceTest {

    @Mock
    SubmissionRepository submissionRepository;

    @Mock
    ProgramRepository programRepository;

    @InjectMocks
    SubmissionService submissionService;

    private User user() {
        return User.builder().id(1L).email("u@x.com").name("User").password("p").role(Role.USER).build();
    }

    private Submission pendingSubmission(User u) {
        return Submission.builder()
                .id(1L)
                .submittedBy(u)
                .title("Sub")
                .description("Desc")
                .country("USA")
                .type(ProgramType.SCHOLARSHIP)
                .status(SubmissionStatus.PENDING)
                .createdAt(Instant.now())
                .build();
    }

    @Test
    void submit_savesAndReturnsDto() {
        var user = user();
        var request = new SubmissionRequest("Sub", "Desc", "USA", ProgramType.SCHOLARSHIP, null, null);
        when(submissionRepository.save(any())).thenAnswer(inv -> {
            Submission s = inv.getArgument(0);
            s = Submission.builder()
                    .id(10L).submittedBy(user).title(s.getTitle()).description(s.getDescription())
                    .country(s.getCountry()).type(s.getType()).status(SubmissionStatus.PENDING)
                    .createdAt(Instant.now()).build();
            return s;
        });

        var dto = submissionService.submit(request, user);

        assertThat(dto.id()).isEqualTo(10L);
        assertThat(dto.status()).isEqualTo(SubmissionStatus.PENDING);
    }

    @Test
    void getPending_returnsPendingList() {
        var user = user();
        when(submissionRepository.findByStatusOrderByCreatedAtDesc(SubmissionStatus.PENDING))
                .thenReturn(List.of(pendingSubmission(user)));

        var result = submissionService.getPending();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).status()).isEqualTo(SubmissionStatus.PENDING);
    }

    @Test
    void review_approvesSubmission() {
        var user = user();
        var submission = pendingSubmission(user);
        when(submissionRepository.findById(1L)).thenReturn(Optional.of(submission));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var dto = submissionService.review(1L, new ReviewSubmissionRequest(SubmissionStatus.APPROVED, "Good one"));

        assertThat(dto.status()).isEqualTo(SubmissionStatus.APPROVED);
        assertThat(dto.adminComment()).isEqualTo("Good one");
    }

    @Test
    void review_approved_createsProgram() {
        var user = user();
        var submission = pendingSubmission(user);
        when(submissionRepository.findById(1L)).thenReturn(Optional.of(submission));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        submissionService.review(1L, new ReviewSubmissionRequest(SubmissionStatus.APPROVED, "OK"));

        verify(programRepository, times(1)).save(any(Program.class));
    }

    @Test
    void review_rejected_doesNotCreateProgram() {
        var user = user();
        var submission = pendingSubmission(user);
        when(submissionRepository.findById(1L)).thenReturn(Optional.of(submission));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        submissionService.review(1L, new ReviewSubmissionRequest(SubmissionStatus.REJECTED, "Not suitable"));

        verify(programRepository, never()).save(any(Program.class));
    }

    @Test
    void review_throwsConflict_whenAlreadyReviewed() {
        var user = user();
        var submission = pendingSubmission(user);
        submission.setStatus(SubmissionStatus.APPROVED);
        when(submissionRepository.findById(1L)).thenReturn(Optional.of(submission));

        assertThatThrownBy(() -> submissionService.review(1L, new ReviewSubmissionRequest(SubmissionStatus.REJECTED, null)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void review_throwsNotFound_whenMissing() {
        when(submissionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> submissionService.review(99L, new ReviewSubmissionRequest(SubmissionStatus.APPROVED, null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void review_rejectsPendingAsAReviewDecision() {
        assertThatThrownBy(() -> submissionService.review(
                1L,
                new ReviewSubmissionRequest(SubmissionStatus.PENDING, null)
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Review status must be APPROVED or REJECTED");

        verifyNoInteractions(submissionRepository, programRepository);
    }
}

package com.temka.app.service;

import com.temka.app.dto.ReviewSubmissionRequest;
import com.temka.app.dto.SubmissionDto;
import com.temka.app.dto.SubmissionRequest;
import com.temka.app.entity.Submission;
import com.temka.app.entity.SubmissionStatus;
import com.temka.app.entity.User;
import com.temka.app.repository.SubmissionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final SubmissionRepository submissionRepository;

    @Transactional
    public SubmissionDto submit(SubmissionRequest request, User user) {
        var submission = Submission.builder()
                .submittedBy(user)
                .title(request.title())
                .description(request.description())
                .country(request.country())
                .type(request.type())
                .deadline(request.deadline())
                .url(request.url())
                .build();
        return toDto(submissionRepository.save(submission));
    }

    @Transactional(readOnly = true)
    public List<SubmissionDto> getPending() {
        return submissionRepository
                .findByStatusOrderByCreatedAtDesc(SubmissionStatus.PENDING)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubmissionDto> getMySubmissions(Long userId) {
        return submissionRepository
                .findBySubmittedByIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public SubmissionDto review(Long id, ReviewSubmissionRequest request) {
        var submission = findOrThrow(id);
        if (submission.getStatus() != SubmissionStatus.PENDING) {
            throw new IllegalStateException("Submission already reviewed");
        }
        submission.setStatus(request.status());
        submission.setAdminComment(request.comment());
        submission.setReviewedAt(Instant.now());
        return toDto(submissionRepository.save(submission));
    }

    private Submission findOrThrow(Long id) {
        return submissionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Submission not found: " + id));
    }

    public SubmissionDto toDto(Submission s) {
        return new SubmissionDto(
                s.getId(),
                s.getSubmittedBy().getId(),
                s.getSubmittedBy().getName(),
                s.getTitle(),
                s.getDescription(),
                s.getCountry(),
                s.getType(),
                s.getDeadline(),
                s.getUrl(),
                s.getStatus(),
                s.getAdminComment(),
                s.getCreatedAt(),
                s.getReviewedAt()
        );
    }
}

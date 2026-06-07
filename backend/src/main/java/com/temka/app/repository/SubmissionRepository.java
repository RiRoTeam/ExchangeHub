package com.temka.app.repository;

import com.temka.app.entity.Submission;
import com.temka.app.entity.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    List<Submission> findByStatusOrderByCreatedAtDesc(SubmissionStatus status);

    List<Submission> findBySubmittedByIdOrderByCreatedAtDesc(Long userId);
}

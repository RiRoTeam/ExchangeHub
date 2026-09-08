package com.temka.app.repository;

import com.temka.app.entity.Submission;
import com.temka.app.entity.SubmissionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    List<Submission> findByStatusOrderByCreatedAtDesc(SubmissionStatus status);

    List<Submission> findBySubmittedByIdOrderByCreatedAtDesc(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Submission s WHERE s.id = :id")
    Optional<Submission> findByIdForUpdate(Long id);
}

package com.temka.app.dto;

import com.temka.app.entity.ProgramType;
import com.temka.app.entity.SubmissionStatus;

import java.time.Instant;
import java.time.LocalDate;

public record SubmissionDto(
        Long id,
        Long userId,
        String userName,
        String title,
        String description,
        String country,
        ProgramType type,
        LocalDate deadline,
        String url,
        SubmissionStatus status,
        String adminComment,
        Instant createdAt,
        Instant reviewedAt
) {}

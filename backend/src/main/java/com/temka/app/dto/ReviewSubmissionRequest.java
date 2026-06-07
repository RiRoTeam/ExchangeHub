package com.temka.app.dto;

import com.temka.app.entity.SubmissionStatus;
import jakarta.validation.constraints.NotNull;

public record ReviewSubmissionRequest(
        @NotNull SubmissionStatus status,
        String comment
) {}

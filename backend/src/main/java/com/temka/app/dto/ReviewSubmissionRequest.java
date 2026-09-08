package com.temka.app.dto;

import com.temka.app.entity.SubmissionStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewSubmissionRequest(
        @NotNull SubmissionStatus status,
        @Size(max = 2000) String comment
) {}

package com.temka.app.dto;

import com.temka.app.entity.ProgramType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

import java.time.LocalDate;

public record SubmissionRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 5000) String description,
        @NotBlank String country,
        @NotNull ProgramType type,
        @Future LocalDate deadline,
        @URL String url
) {}

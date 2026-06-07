package com.temka.app.dto;

import com.temka.app.entity.ProgramType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ProgramRequest(
        @NotBlank String title,
        @NotBlank String description,
        @NotBlank String country,
        @NotNull  ProgramType type,
        LocalDate deadline,
        String url
) {}

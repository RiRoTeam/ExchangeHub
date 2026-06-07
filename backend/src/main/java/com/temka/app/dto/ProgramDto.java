package com.temka.app.dto;

import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;

import java.time.Instant;
import java.time.LocalDate;

public record ProgramDto(
        Long id,
        String title,
        String description,
        String country,
        ProgramType type,
        LocalDate deadline,
        String url,
        ProgramStatus status,
        Instant createdAt
) {}

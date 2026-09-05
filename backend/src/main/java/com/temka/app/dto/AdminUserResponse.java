package com.temka.app.dto;

import com.temka.app.entity.Role;

import java.time.Instant;

public record AdminUserResponse(
        Long id,
        String email,
        String name,
        Role role,
        Instant createdAt
) {}

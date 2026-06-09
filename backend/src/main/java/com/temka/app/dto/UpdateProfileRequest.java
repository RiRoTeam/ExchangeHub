package com.temka.app.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(min = 2, max = 100) String name,
    String currentPassword,
    @Size(min = 6) String newPassword
) {}

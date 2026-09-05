package com.temka.app.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(min = 2, max = 100) String name,
    @Size(max = 72) String currentPassword,
    @Size(min = 6, max = 72) String newPassword
) {}

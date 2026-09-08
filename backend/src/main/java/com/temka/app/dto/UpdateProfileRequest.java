package com.temka.app.dto;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

public record UpdateProfileRequest(
    @Size(min = 2, max = 100) @Pattern(regexp = "(?s).*\\S.*", message = "must not be blank") String name,
    @Size(max = 72) @Pattern(regexp = "(?s).*\\S.*", message = "must not be blank") String currentPassword,
    @Size(min = 6, max = 72) @Pattern(regexp = "(?s).*\\S.*", message = "must not be blank") String newPassword
) {}

package com.temka.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @Email @NotBlank @Size(max = 255) String email,
        @NotBlank @Size(max = 72) String password
) {}

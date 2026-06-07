package com.temka.app.dto;

import com.temka.app.entity.Role;

public record UserMeResponse(Long id, String email, String name, Role role) {}

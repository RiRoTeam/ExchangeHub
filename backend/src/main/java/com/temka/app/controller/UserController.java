package com.temka.app.controller;

import com.temka.app.dto.UpdateProfileRequest;
import com.temka.app.dto.UserMeResponse;
import com.temka.app.entity.User;
import com.temka.app.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User profile management")
public class UserController {

    private final UserService userService;

    @PatchMapping("/me")
    @Operation(summary = "Update current user's name and/or password")
    @SecurityRequirement(name = "bearerAuth")
    public UserMeResponse updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal User user) {
        return userService.updateProfile(user, request);
    }
}

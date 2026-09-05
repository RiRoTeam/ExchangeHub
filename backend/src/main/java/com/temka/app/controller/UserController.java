package com.temka.app.controller;

import com.temka.app.dto.ProgramDto;
import com.temka.app.dto.UpdateProfileRequest;
import com.temka.app.dto.UserMeResponse;
import com.temka.app.entity.User;
import com.temka.app.service.UserFavoriteService;
import com.temka.app.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User profile management")
public class UserController {

    private final UserService userService;
    private final UserFavoriteService favoriteService;

    @PatchMapping("/me")
    @Operation(summary = "Update current user's name and/or password")
    @SecurityRequirement(name = "bearerAuth")
    public UserMeResponse updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal User user) {
        return userService.updateProfile(user, request);
    }

    @GetMapping("/me/favorites")
    @Operation(summary = "List the current user's favorite programs")
    @SecurityRequirement(name = "bearerAuth")
    public List<ProgramDto> listFavorites(@AuthenticationPrincipal User user) {
        return favoriteService.list(user);
    }

    @PostMapping("/me/favorites/{programId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Add a program to the current user's favorites")
    @SecurityRequirement(name = "bearerAuth")
    public void addFavorite(
            @PathVariable Long programId,
            @AuthenticationPrincipal User user) {
        favoriteService.add(user, programId);
    }

    @DeleteMapping("/me/favorites/{programId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove a program from the current user's favorites")
    @SecurityRequirement(name = "bearerAuth")
    public void removeFavorite(
            @PathVariable Long programId,
            @AuthenticationPrincipal User user) {
        favoriteService.remove(user, programId);
    }
}

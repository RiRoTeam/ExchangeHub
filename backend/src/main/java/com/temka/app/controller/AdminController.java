package com.temka.app.controller;

import com.temka.app.dto.AdminUserResponse;
import com.temka.app.dto.AdminAnalyticsResponse;
import com.temka.app.dto.ProgramDto;
import com.temka.app.dto.ProgramRequest;
import com.temka.app.dto.ReviewSubmissionRequest;
import com.temka.app.dto.SubmissionDto;
import com.temka.app.dto.UpdateUserRoleRequest;
import com.temka.app.service.ProgramService;
import com.temka.app.service.ProgramAnalyticsService;
import com.temka.app.service.SubmissionService;
import com.temka.app.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Admin-only endpoints (requires ROLE_ADMIN)")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final ProgramService programService;
    private final ProgramAnalyticsService programAnalyticsService;
    private final SubmissionService submissionService;
    private final UserService userService;

    // ── Users ──────────────────────────────────────────────────────────────────

    @GetMapping("/users")
    @Operation(summary = "List all users and their roles")
    public List<AdminUserResponse> getUsers() {
        return userService.getAllUsers();
    }

    @PatchMapping("/users/{id}/role")
    @Operation(summary = "Change a user's role")
    public AdminUserResponse changeUserRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        return userService.changeRole(id, request.role());
    }

    // ── Submissions ────────────────────────────────────────────────────────────

    @GetMapping("/submissions")
    @Operation(summary = "Get pending submission queue")
    public List<SubmissionDto> getSubmissions() {
        return submissionService.getPending();
    }

    @PatchMapping("/submissions/{id}")
    @Operation(summary = "Approve or reject a submission")
    public SubmissionDto reviewSubmission(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ReviewSubmissionRequest request
    ) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        return submissionService.review(id, request);
    }

    @GetMapping("/analytics")
    @Operation(summary = "View platform and program engagement analytics")
    public AdminAnalyticsResponse getAnalytics() {
        return programAnalyticsService.getAdminAnalytics();
    }

    // ── Programs ───────────────────────────────────────────────────────────────

    @PostMapping("/programs")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new program manually")
    public ProgramDto createProgram(@Valid @RequestBody ProgramRequest request) {
        return programService.create(request);
    }

    @PutMapping("/programs/{id}")
    @Operation(summary = "Edit an existing program")
    public ProgramDto updateProgram(
            @PathVariable Long id,
            @Valid @RequestBody ProgramRequest request
    ) {
        return programService.update(id, request);
    }

    @DeleteMapping("/programs/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a program")
    public void deleteProgram(@PathVariable Long id) {
        programService.delete(id);
    }
}

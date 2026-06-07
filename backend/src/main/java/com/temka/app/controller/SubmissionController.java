package com.temka.app.controller;

import com.temka.app.dto.SubmissionDto;
import com.temka.app.dto.SubmissionRequest;
import com.temka.app.entity.User;
import com.temka.app.service.SubmissionService;
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
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
@Tag(name = "Submissions", description = "User-submitted programs awaiting admin review")
@SecurityRequirement(name = "bearerAuth")
public class SubmissionController {

    private final SubmissionService submissionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Submit a new program for review")
    public SubmissionDto submit(
            @Valid @RequestBody SubmissionRequest request,
            @AuthenticationPrincipal User user
    ) {
        return submissionService.submit(request, user);
    }

    @GetMapping("/my")
    @Operation(summary = "Get current user's submissions")
    public List<SubmissionDto> mySubmissions(@AuthenticationPrincipal User user) {
        return submissionService.getMySubmissions(user.getId());
    }
}

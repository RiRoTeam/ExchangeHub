package com.temka.app.controller;

import com.temka.app.dto.ProgramDto;
import com.temka.app.dto.ProgramRequest;
import com.temka.app.dto.ReviewSubmissionRequest;
import com.temka.app.dto.SubmissionDto;
import com.temka.app.service.ProgramService;
import com.temka.app.service.SubmissionService;
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
    private final SubmissionService submissionService;

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
            @Valid @RequestBody ReviewSubmissionRequest request
    ) {
        return submissionService.review(id, request);
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

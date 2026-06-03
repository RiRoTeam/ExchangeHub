package com.temka.app.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin", description = "Admin-only endpoints (requires ROLE_ADMIN)")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    @GetMapping("/submissions")
    @Operation(summary = "A-01 — Get submission moderation queue")
    public ResponseEntity<Map<String, String>> getSubmissions() {
        return ResponseEntity.ok(Map.of("message", "Submission queue — coming soon"));
    }

    @PatchMapping("/submissions/{id}")
    @Operation(summary = "A-01 — Approve or reject a submission")
    public ResponseEntity<Map<String, String>> reviewSubmission(@PathVariable String id) {
        return ResponseEntity.ok(Map.of("message", "Review submission " + id + " — coming soon"));
    }

    @PostMapping("/programs")
    @Operation(summary = "A-02 — Create a new program manually")
    public ResponseEntity<Map<String, String>> createProgram() {
        return ResponseEntity.ok(Map.of("message", "Create program — coming soon"));
    }

    @PutMapping("/programs/{id}")
    @Operation(summary = "A-02 — Edit an existing program")
    public ResponseEntity<Map<String, String>> updateProgram(@PathVariable String id) {
        return ResponseEntity.ok(Map.of("message", "Update program " + id + " — coming soon"));
    }

    @GetMapping("/analytics")
    @Operation(summary = "A-03 — View views, clicks, and interest statistics")
    public ResponseEntity<Map<String, String>> getAnalytics() {
        return ResponseEntity.ok(Map.of("message", "Analytics — coming soon"));
    }
}

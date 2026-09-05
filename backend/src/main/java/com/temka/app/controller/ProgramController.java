package com.temka.app.controller;

import com.temka.app.dto.ProgramDto;
import com.temka.app.dto.ProgramAnalyticsEventRequest;
import com.temka.app.entity.ProgramType;
import com.temka.app.service.ProgramAnalyticsService;
import com.temka.app.service.ProgramService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/programs")
@RequiredArgsConstructor
@Tag(name = "Programs", description = "Public catalog of exchange and internship programs")
public class ProgramController {

    private final ProgramService programService;
    private final ProgramAnalyticsService programAnalyticsService;

    @GetMapping
    @Operation(summary = "List active programs with optional filters")
    public Page<ProgramDto> list(
            @Parameter(description = "Filter by program type") @RequestParam(required = false) ProgramType type,
            @Parameter(description = "Filter by country (partial match)") @RequestParam(required = false) String country,
            @Parameter(description = "Full-text search in title and description") @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort as field,direction")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        return programService.list(type, country, q, page, size, sort);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a program by ID")
    public ProgramDto getById(@PathVariable Long id) {
        return programService.getById(id);
    }

    @PostMapping("/{id}/events")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Record a program view or outbound-link click")
    public void recordEvent(
            @PathVariable long id,
            @Valid @RequestBody ProgramAnalyticsEventRequest request
    ) {
        programAnalyticsService.record(id, request.type());
    }
}

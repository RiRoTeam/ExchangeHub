package com.temka.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.temka.app.dto.AdminAnalyticsResponse;
import com.temka.app.dto.AdminUserResponse;
import com.temka.app.dto.ProgramDto;
import com.temka.app.dto.ProgramRequest;
import com.temka.app.dto.ReviewSubmissionRequest;
import com.temka.app.dto.SubmissionDto;
import com.temka.app.dto.TopProgramAnalyticsResponse;
import com.temka.app.entity.Role;
import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;
import com.temka.app.entity.SubmissionStatus;
import com.temka.app.security.JwtAuthFilter;
import com.temka.app.security.JwtService;
import com.temka.app.security.UserDetailsServiceImpl;
import com.temka.app.service.ProgramService;
import com.temka.app.service.ProgramAnalyticsService;
import com.temka.app.service.SubmissionService;
import com.temka.app.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    ProgramService programService;

    @MockBean
    ProgramAnalyticsService programAnalyticsService;

    @MockBean
    SubmissionService submissionService;

    @MockBean
    UserService userService;

    @MockBean
    JwtService jwtService;

    @MockBean
    JwtAuthFilter jwtAuthFilter;

    @MockBean
    UserDetailsServiceImpl userDetailsService;

    private ProgramDto programDto() {
        return new ProgramDto(1L, "P", "D", "UK", ProgramType.EXCHANGE,
                null, null, ProgramStatus.ACTIVE, Instant.now());
    }

    private SubmissionDto submissionDto(SubmissionStatus status) {
        return new SubmissionDto(1L, 2L, "User", "Sub", "Desc", "US",
                ProgramType.SCHOLARSHIP, null, null, status, null, Instant.now(), null);
    }

    @Test
    void getUsers_returns200WithRoles() throws Exception {
        when(userService.getAllUsers()).thenReturn(List.of(
                new AdminUserResponse(7L, "admin@example.com", "Admin", Role.ADMIN, Instant.parse("2026-01-01T00:00:00Z"))
        ));

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(7))
                .andExpect(jsonPath("$[0].email").value("admin@example.com"))
                .andExpect(jsonPath("$[0].role").value("ADMIN"));
    }

    @Test
    void changeUserRole_returnsUpdatedUser() throws Exception {
        when(userService.changeRole(7L, Role.ADMIN)).thenReturn(
                new AdminUserResponse(7L, "user@example.com", "User", Role.ADMIN, Instant.parse("2026-01-01T00:00:00Z"))
        );

        mockMvc.perform(patch("/api/admin/users/7/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.role").value("ADMIN"));

        verify(userService).changeRole(7L, Role.ADMIN);
    }

    @Test
    void changeUserRole_missingRole_returns400() throws Exception {
        mockMvc.perform(patch("/api/admin/users/7/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.role").exists());

        verify(userService, never()).changeRole(any(), any());
    }

    @Test
    void changeUserRole_lastAdminReturns409() throws Exception {
        when(userService.changeRole(7L, Role.USER))
                .thenThrow(new IllegalStateException("Cannot demote the last administrator"));

        mockMvc.perform(patch("/api/admin/users/7/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"USER\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Cannot demote the last administrator"));
    }

    @Test
    void changeUserRole_unknownUserReturns404() throws Exception {
        when(userService.changeRole(99L, Role.ADMIN))
                .thenThrow(new EntityNotFoundException("User not found: 99"));

        mockMvc.perform(patch("/api/admin/users/99/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("User not found: 99"));
    }

    @Test
    void getSubmissions_returns200WithList() throws Exception {
        when(submissionService.getPending()).thenReturn(List.of(submissionDto(SubmissionStatus.PENDING)));

        mockMvc.perform(get("/api/admin/submissions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void getAnalytics_returnsTotalsAndTopPrograms() throws Exception {
        when(programAnalyticsService.getAdminAnalytics()).thenReturn(
                new AdminAnalyticsResponse(
                        12, 4, 7, 9, 100, 25,
                        List.of(new TopProgramAnalyticsResponse(
                                1L, "Popular program", 80, 20, 5, 105
                        ))
                )
        );

        mockMvc.perform(get("/api/admin/analytics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.users").value(12))
                .andExpect(jsonPath("$.programs").value(4))
                .andExpect(jsonPath("$.submissions").value(7))
                .andExpect(jsonPath("$.favorites").value(9))
                .andExpect(jsonPath("$.views").value(100))
                .andExpect(jsonPath("$.clicks").value(25))
                .andExpect(jsonPath("$.topPrograms[0].id").value(1))
                .andExpect(jsonPath("$.topPrograms[0].totalEngagement").value(105));

        verify(programAnalyticsService).getAdminAnalytics();
    }

    @Test
    void reviewSubmission_approve_returns200() throws Exception {
        var request = new ReviewSubmissionRequest(SubmissionStatus.APPROVED, "LGTM");
        when(submissionService.review(eq(1L), any())).thenReturn(submissionDto(SubmissionStatus.APPROVED));

        mockMvc.perform(patch("/api/admin/submissions/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void reviewSubmission_reject_returns200() throws Exception {
        var request = new ReviewSubmissionRequest(SubmissionStatus.REJECTED, "Not suitable");
        when(submissionService.review(eq(1L), any())).thenReturn(submissionDto(SubmissionStatus.REJECTED));

        mockMvc.perform(patch("/api/admin/submissions/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        verify(programService, never()).create(any());
    }

    @Test
    void createProgram_returns201() throws Exception {
        var request = new ProgramRequest("Prog", "Desc", "UK", ProgramType.EXCHANGE, null, null);
        when(programService.create(any())).thenReturn(programDto());

        mockMvc.perform(post("/api/admin/programs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("P"));
    }

    @Test
    void updateProgram_returns200() throws Exception {
        var request = new ProgramRequest("Updated", "Desc", "UK", ProgramType.EXCHANGE, null, null);
        when(programService.update(eq(1L), any())).thenReturn(programDto());

        mockMvc.perform(put("/api/admin/programs/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void deleteProgram_returns204() throws Exception {
        mockMvc.perform(delete("/api/admin/programs/1"))
                .andExpect(status().isNoContent());
    }

    // ── ProgramRequest validation ─────────────────────────────────────────────

    @Test
    void createProgram_invalidUrl_returns400() throws Exception {
        String body = """
                {"title":"Prog","description":"Desc","country":"UK","type":"EXCHANGE","url":"not-a-url"}
                """;
        mockMvc.perform(post("/api/admin/programs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.url").exists());
    }

    @Test
    void createProgram_pastDeadline_returns400() throws Exception {
        String body = String.format(
                """
                {"title":"Prog","description":"Desc","country":"UK","type":"EXCHANGE","deadline":"%s"}
                """,
                LocalDate.now().minusDays(1));
        mockMvc.perform(post("/api/admin/programs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.deadline").exists());
    }

    @Test
    void createProgram_titleTooLong_returns400() throws Exception {
        String longTitle = "A".repeat(256);
        String body = String.format(
                """
                {"title":"%s","description":"Desc","country":"UK","type":"EXCHANGE"}
                """,
                longTitle);
        mockMvc.perform(post("/api/admin/programs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists());
    }

    @Test
    void createProgram_descriptionTooLong_returns400() throws Exception {
        String longDesc = "D".repeat(5001);
        String body = String.format(
                """
                {"title":"Prog","description":"%s","country":"UK","type":"EXCHANGE"}
                """,
                longDesc);
        mockMvc.perform(post("/api/admin/programs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.description").exists());
    }
}

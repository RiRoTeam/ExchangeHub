package com.temka.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.temka.app.dto.SubmissionDto;
import com.temka.app.entity.ProgramType;
import com.temka.app.entity.Role;
import com.temka.app.entity.SubmissionStatus;
import com.temka.app.entity.User;
import com.temka.app.security.JwtAuthFilter;
import com.temka.app.security.JwtService;
import com.temka.app.security.UserDetailsServiceImpl;
import com.temka.app.service.SubmissionService;
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
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SubmissionController.class)
@AutoConfigureMockMvc(addFilters = false)
class SubmissionControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    SubmissionService submissionService;

    @MockBean
    JwtService jwtService;

    @MockBean
    JwtAuthFilter jwtAuthFilter;

    @MockBean
    UserDetailsServiceImpl userDetailsService;

    private SubmissionDto submissionDto() {
        return new SubmissionDto(1L, 2L, "User", "Title", "Desc", "US",
                ProgramType.INTERNSHIP, null, null, SubmissionStatus.PENDING, null, Instant.now(), null);
    }

    private User mockUser() {
        return User.builder().id(1L).email("user@test.com").name("Test").role(Role.USER).build();
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    @Test
    void submit_validRequest_returns201() throws Exception {
        when(submissionService.submit(any(), any())).thenReturn(submissionDto());

        String body = """
                {"title":"My Program","description":"Some description","country":"US","type":"INTERNSHIP"}
                """;
        mockMvc.perform(post("/api/submissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    // ── SubmissionRequest validation ──────────────────────────────────────────

    @Test
    void submit_invalidUrl_returns400() throws Exception {
        String body = """
                {"title":"Prog","description":"Desc","country":"US","type":"INTERNSHIP","url":"not-a-url"}
                """;
        mockMvc.perform(post("/api/submissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.url").exists());
    }

    @Test
    void submit_pastDeadline_returns400() throws Exception {
        String body = String.format(
                """
                {"title":"Prog","description":"Desc","country":"US","type":"INTERNSHIP","deadline":"%s"}
                """,
                LocalDate.now().minusDays(1));
        mockMvc.perform(post("/api/submissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.deadline").exists());
    }

    @Test
    void submit_titleTooLong_returns400() throws Exception {
        String longTitle = "A".repeat(256);
        String body = String.format(
                """
                {"title":"%s","description":"Desc","country":"US","type":"INTERNSHIP"}
                """,
                longTitle);
        mockMvc.perform(post("/api/submissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists());
    }

    @Test
    void submit_descriptionTooLong_returns400() throws Exception {
        String longDesc = "D".repeat(5001);
        String body = String.format(
                """
                {"title":"Prog","description":"%s","country":"US","type":"INTERNSHIP"}
                """,
                longDesc);
        mockMvc.perform(post("/api/submissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.description").exists());
    }

    @Test
    void submit_missingRequiredFields_returns400() throws Exception {
        mockMvc.perform(post("/api/submissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }
}

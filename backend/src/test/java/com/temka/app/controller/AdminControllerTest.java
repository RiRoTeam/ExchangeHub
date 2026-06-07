package com.temka.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.temka.app.dto.ProgramDto;
import com.temka.app.dto.ProgramRequest;
import com.temka.app.dto.ReviewSubmissionRequest;
import com.temka.app.dto.SubmissionDto;
import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;
import com.temka.app.entity.SubmissionStatus;
import com.temka.app.security.JwtAuthFilter;
import com.temka.app.security.JwtService;
import com.temka.app.security.UserDetailsServiceImpl;
import com.temka.app.service.ProgramService;
import com.temka.app.service.SubmissionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
    SubmissionService submissionService;

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
    void getSubmissions_returns200WithList() throws Exception {
        when(submissionService.getPending()).thenReturn(List.of(submissionDto(SubmissionStatus.PENDING)));

        mockMvc.perform(get("/api/admin/submissions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void reviewSubmission_returns200() throws Exception {
        var request = new ReviewSubmissionRequest(SubmissionStatus.APPROVED, "LGTM");
        when(submissionService.review(eq(1L), any())).thenReturn(submissionDto(SubmissionStatus.APPROVED));

        mockMvc.perform(patch("/api/admin/submissions/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
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
}

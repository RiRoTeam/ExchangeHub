package com.temka.app.controller;

import com.temka.app.dto.ProgramDto;
import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;
import com.temka.app.config.PaginationConfig;
import com.temka.app.security.JwtAuthFilter;
import com.temka.app.security.JwtService;
import com.temka.app.security.UserDetailsServiceImpl;
import com.temka.app.service.ProgramAnalyticsService;
import com.temka.app.service.ProgramService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.context.annotation.Import;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProgramController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(PaginationConfig.class)
class ProgramControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    ProgramService programService;

    @MockBean
    ProgramAnalyticsService programAnalyticsService;

    @MockBean
    JwtService jwtService;

    @MockBean
    JwtAuthFilter jwtAuthFilter;

    @MockBean
    UserDetailsServiceImpl userDetailsService;

    private ProgramDto sampleDto() {
        return new ProgramDto(1L, "Test", "Desc", "Germany",
                ProgramType.INTERNSHIP, null, "https://example.com",
                ProgramStatus.ACTIVE, Instant.now());
    }

    @Test
    void list_returns200WithPrograms() throws Exception {
        when(programService.list(null, null, null, 0, 20, "createdAt,desc"))
                .thenReturn(new PageImpl<>(List.of(sampleDto())));

        mockMvc.perform(get("/api/programs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Test"))
                .andExpect(jsonPath("$.content[0].country").value("Germany"))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    void list_withTypeFilter_passesFilterToService() throws Exception {
        when(programService.list(ProgramType.INTERNSHIP, null, null, 0, 20, "createdAt,desc"))
                .thenReturn(new PageImpl<>(List.of(sampleDto())));

        mockMvc.perform(get("/api/programs").param("type", "INTERNSHIP"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].type").value("INTERNSHIP"));
    }

    @Test
    void list_withInvalidType_returnsProblemDetail400() throws Exception {
        mockMvc.perform(get("/api/programs").param("type", "INVALID"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.detail").value(
                        "Request parameter 'type' has an unsupported value"));

        verify(programService, never()).list(any(), any(), any(), anyInt(), anyInt(), any());
    }

    @Test
    void list_withNonNumericPage_returnsProblemDetail400() throws Exception {
        mockMvc.perform(get("/api/programs").param("page", "first"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.detail").value(
                        "Request parameter 'page' has an unsupported value"));

        verify(programService, never()).list(any(), any(), any(), anyInt(), anyInt(), any());
    }

    @Test
    void getById_returns200() throws Exception {
        when(programService.getById(1L)).thenReturn(sampleDto());

        mockMvc.perform(get("/api/programs/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void getById_returns404_whenNotFound() throws Exception {
        when(programService.getById(99L)).thenThrow(new EntityNotFoundException("Program not found: 99"));

        mockMvc.perform(get("/api/programs/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void recordEvent_validView_returns204() throws Exception {
        mockMvc.perform(post("/api/programs/1/events")
                        .contentType("application/json")
                        .content("{\"type\":\"VIEW\"}"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(programAnalyticsService).record(
                1L, com.temka.app.entity.ProgramAnalyticsEventType.VIEW);
    }

    @Test
    void recordEvent_missingType_returns400WithoutRecording() throws Exception {
        mockMvc.perform(post("/api/programs/1/events")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.type").exists());

        verify(programAnalyticsService, never()).record(anyLong(), any());
    }

    @Test
    void recordEvent_unsupportedType_returns400WithoutRecording() throws Exception {
        mockMvc.perform(post("/api/programs/1/events")
                        .contentType("application/json")
                        .content("{\"type\":\"DOWNLOAD\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Request body is malformed or contains an unsupported value"));

        verify(programAnalyticsService, never()).record(anyLong(), any());
    }

    @Test
    void recordEvent_withUnsupportedContentTypeReturns415() throws Exception {
        mockMvc.perform(post("/api/programs/1/events")
                        .contentType("text/plain")
                        .content("VIEW"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"));

        verify(programAnalyticsService, never()).record(anyLong(), any());
    }

    @Test
    void unsupportedMethodKeepsMvc405InsteadOfBecoming500() throws Exception {
        mockMvc.perform(put("/api/programs"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"));
    }

    @Test
    void unexpectedException_returnsProblemDetail500() throws Exception {
        when(programService.list(null, null, null, 0, 20, "createdAt,desc"))
                .thenThrow(new RuntimeException("database unavailable"));

        mockMvc.perform(get("/api/programs"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.detail").value("Internal server error"));
    }
}

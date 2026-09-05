package com.temka.app.controller;

import com.temka.app.dto.ProgramDto;
import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;
import com.temka.app.security.JwtAuthFilter;
import com.temka.app.security.JwtService;
import com.temka.app.security.UserDetailsServiceImpl;
import com.temka.app.service.ProgramService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProgramController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProgramControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    ProgramService programService;

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
        when(programService.list(null, null, null)).thenReturn(List.of(sampleDto()));

        mockMvc.perform(get("/api/programs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Test"))
                .andExpect(jsonPath("$[0].country").value("Germany"));
    }

    @Test
    void list_withTypeFilter_passesFilterToService() throws Exception {
        when(programService.list(ProgramType.INTERNSHIP, null, null)).thenReturn(List.of(sampleDto()));

        mockMvc.perform(get("/api/programs").param("type", "INTERNSHIP"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("INTERNSHIP"));
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
    void unexpectedException_returnsProblemDetail500() throws Exception {
        when(programService.list(null, null, null)).thenThrow(new RuntimeException("database unavailable"));

        mockMvc.perform(get("/api/programs"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.detail").value("Internal server error"));
    }
}

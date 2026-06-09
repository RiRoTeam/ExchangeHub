package com.temka.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.temka.app.AbstractIntegrationTest;
import com.temka.app.dto.AuthResponse;
import com.temka.app.repository.RefreshTokenRepository;
import com.temka.app.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class UserControllerTest extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository userRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;

    @BeforeEach
    void cleanDb() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void updateProfile_nameOnly_returnsUpdatedUser() throws Exception {
        String token = registerAndGetAccessToken("name@test.com", "Old Name", "secret123");

        mvc.perform(patch("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New Name\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("New Name"))
                .andExpect(jsonPath("$.email").value("name@test.com"));
    }

    @Test
    void updateProfile_passwordChange_succeeds() throws Exception {
        String token = registerAndGetAccessToken("pwchange@test.com", "User", "oldpassword");

        mvc.perform(patch("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"oldpassword\",\"newPassword\":\"newpassword\"}"))
                .andExpect(status().isOk());

        // Verify login works with new password
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"pwchange@test.com\",\"password\":\"newpassword\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    void updateProfile_wrongCurrentPassword_returns400() throws Exception {
        String token = registerAndGetAccessToken("wrongpw@test.com", "User", "correctpassword");

        mvc.perform(patch("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"wrongpassword\",\"newPassword\":\"newpassword\"}"))
                .andExpect(status().isBadRequest());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String registerAndGetAccessToken(String email, String name, String password) throws Exception {
        var result = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format(
                                "{\"email\":\"%s\",\"name\":\"%s\",\"password\":\"%s\"}",
                                email, name, password)))
                .andReturn();

        return mapper.readValue(
                result.getResponse().getContentAsString(),
                AuthResponse.class
        ).accessToken();
    }
}

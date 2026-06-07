package com.temka.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.temka.app.AbstractIntegrationTest;
import com.temka.app.dto.AuthResponse;
import com.temka.app.entity.Role;
import com.temka.app.entity.User;
import com.temka.app.repository.RefreshTokenRepository;
import com.temka.app.repository.UserRepository;
import com.temka.app.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityRulesTest extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private String userToken;
    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();

        // USER через регистрацию
        var result = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"user@sec.com","name":"User","password":"secret123"}
                                """))
                .andReturn();
        userToken = mapper.readValue(
                result.getResponse().getContentAsString(), AuthResponse.class).accessToken();

        // ADMIN напрямую через репозиторий (регистрация всегда даёт USER)
        var admin = User.builder()
                .email("admin@sec.com")
                .name("Admin")
                .password(passwordEncoder.encode("secret123"))
                .role(Role.ADMIN)
                .build();
        userRepository.save(admin);
        adminToken = jwtService.generateAccessToken(admin);
    }

    // ── Публичные эндпоинты ──────────────────────────────────────────────────

    @Test
    void authEndpoints_arePublic() throws Exception {
        // 401 приходит от badCredentials, а не от security — значит эндпоинт доступен
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"nobody@test.com","password":"wrong"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void swaggerUi_isPublic() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk());
    }

    // ── Без токена → 401 ─────────────────────────────────────────────────────

    @Test
    void protectedEndpoint_withoutToken_returns401() throws Exception {
        mvc.perform(get("/api/admin/submissions"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidToken_returns401() throws Exception {
        mvc.perform(get("/api/admin/submissions")
                        .header("Authorization", "Bearer garbage.token.value"))
                .andExpect(status().isUnauthorized());
    }

    // ── USER токен → 403 на admin-роуты ──────────────────────────────────────

    @Test
    void userToken_onAdminEndpoint_returns403() throws Exception {
        mvc.perform(get("/api/admin/submissions")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void userToken_onAdminPrograms_returns403() throws Exception {
        mvc.perform(post("/api/admin/programs")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    // ── ADMIN токен → 200 на admin-роуты ──────────────────────────────────────

    @Test
    void adminToken_onSubmissions_returns200() throws Exception {
        mvc.perform(get("/api/admin/submissions")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void adminToken_onAnalytics_returns200() throws Exception {
        mvc.perform(get("/api/admin/analytics")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void adminToken_canPatchSubmission() throws Exception {
        // security test: admin token passes auth/authz (4xx from business logic is fine, not 401/403)
        var result = mvc.perform(patch("/api/admin/submissions/1")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"APPROVED\"}"))
                .andReturn();
        int status = result.getResponse().getStatus();
        org.assertj.core.api.Assertions.assertThat(status)
                .as("admin token must not be rejected by security (401/403)")
                .isNotIn(401, 403);
    }
}

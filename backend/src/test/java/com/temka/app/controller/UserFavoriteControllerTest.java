package com.temka.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.temka.app.AbstractIntegrationTest;
import com.temka.app.dto.AuthResponse;
import com.temka.app.entity.Program;
import com.temka.app.entity.ProgramType;
import com.temka.app.repository.ProgramRepository;
import com.temka.app.repository.RefreshTokenRepository;
import com.temka.app.repository.UserFavoriteRepository;
import com.temka.app.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserFavoriteControllerTest extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserFavoriteRepository favoriteRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired ProgramRepository programRepository;
    @Autowired UserRepository userRepository;

    private String firstUserToken;
    private String secondUserToken;
    private Program program;

    @BeforeEach
    void setUp() throws Exception {
        favoriteRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        programRepository.deleteAll();
        userRepository.deleteAll();

        firstUserToken = registerAndGetAccessToken("favorite-one@test.com");
        secondUserToken = registerAndGetAccessToken("favorite-two@test.com");
        program = programRepository.save(Program.builder()
                .title("Research Exchange")
                .description("A program worth saving")
                .country("Estonia")
                .type(ProgramType.EXCHANGE)
                .url("https://example.com/program")
                .build());
    }

    @Test
    void favorites_requireAuthentication() throws Exception {
        mvc.perform(get("/api/users/me/favorites"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/users/me/favorites/{programId}", program.getId()))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/users/me/favorites/{programId}", program.getId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void addAndListFavorite_returnsProgramForCurrentUserOnly() throws Exception {
        mvc.perform(post("/api/users/me/favorites/{programId}", program.getId())
                        .header("Authorization", "Bearer " + firstUserToken))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/users/me/favorites")
                        .header("Authorization", "Bearer " + firstUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(program.getId()))
                .andExpect(jsonPath("$[0].title").value("Research Exchange"));

        mvc.perform(get("/api/users/me/favorites")
                        .header("Authorization", "Bearer " + secondUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void addFavoriteTwice_isIdempotentAndKeepsCompositeUnique() throws Exception {
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/users/me/favorites/{programId}", program.getId())
                            .header("Authorization", "Bearer " + firstUserToken))
                    .andExpect(status().isNoContent());
        }

        assertThat(favoriteRepository.count()).isEqualTo(1);
    }

    @Test
    void removeFavoriteTwice_isIdempotent() throws Exception {
        mvc.perform(post("/api/users/me/favorites/{programId}", program.getId())
                        .header("Authorization", "Bearer " + firstUserToken))
                .andExpect(status().isNoContent());

        for (int i = 0; i < 2; i++) {
            mvc.perform(delete("/api/users/me/favorites/{programId}", program.getId())
                            .header("Authorization", "Bearer " + firstUserToken))
                    .andExpect(status().isNoContent());
        }

        assertThat(favoriteRepository.count()).isZero();
    }

    @Test
    void addMissingProgram_returns404AndDoesNotCreateFavorite() throws Exception {
        mvc.perform(post("/api/users/me/favorites/{programId}", Long.MAX_VALUE)
                        .header("Authorization", "Bearer " + firstUserToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Program not found: " + Long.MAX_VALUE));

        assertThat(favoriteRepository.count()).isZero();
    }

    private String registerAndGetAccessToken(String email) throws Exception {
        var result = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format(
                                "{\"email\":\"%s\",\"name\":\"Favorite User\",\"password\":\"secret123\"}",
                                email)))
                .andReturn();

        return mapper.readValue(
                result.getResponse().getContentAsString(),
                AuthResponse.class
        ).accessToken();
    }
}

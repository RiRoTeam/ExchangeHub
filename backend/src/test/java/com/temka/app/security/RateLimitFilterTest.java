package com.temka.app.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    // capacity: login=3, register=2
    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter(3, 2);
    }

    @Test
    void login_withinLimit_passesThrough() throws Exception {
        for (int i = 0; i < 3; i++) {
            var response = doRequest("10.0.0.1", "/api/auth/login");
            assertThat(response.getStatus()).isNotEqualTo(429);
        }
    }

    @Test
    void login_exceedsLimit_returns429WithRetryAfter() throws Exception {
        for (int i = 0; i < 3; i++) {
            doRequest("10.0.0.2", "/api/auth/login");
        }

        var response = doRequest("10.0.0.2", "/api/auth/login");

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("60");
        assertThat(response.getContentAsString()).contains("Too many requests");
    }

    @Test
    void register_exceedsLimit_returns429() throws Exception {
        for (int i = 0; i < 2; i++) {
            doRequest("10.0.0.3", "/api/auth/register");
        }

        var response = doRequest("10.0.0.3", "/api/auth/register");

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("60");
    }

    @Test
    void differentIps_haveIndependentBuckets() throws Exception {
        for (int i = 0; i < 3; i++) {
            doRequest("10.1.0.1", "/api/auth/login");
        }

        // 10.1.0.1 is exhausted but 10.1.0.2 still has budget
        var response = doRequest("10.1.0.2", "/api/auth/login");
        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    @Test
    void nonAuthPath_isNotRateLimited() throws Exception {
        for (int i = 0; i < 100; i++) {
            var response = doRequest("10.2.0.1", "/api/programs");
            assertThat(response.getStatus()).isNotEqualTo(429);
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private MockHttpServletResponse doRequest(String ip, String path) throws Exception {
        var request  = new MockHttpServletRequest("POST", path);
        request.setServletPath(path);
        request.setRemoteAddr(ip);
        var response = new MockHttpServletResponse();
        var chain    = new MockFilterChain();
        filter.doFilter(request, response, chain);
        return response;
    }
}

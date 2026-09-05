package com.temka.app.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    // capacity: login=3, register=2, analytics events=4
    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter(3, 2, 4);
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

    @Test
    void analyticsEvents_sharePerIpLimitAcrossPrograms() throws Exception {
        doRequest("10.3.0.1", "/api/programs/1/events");
        doRequest("10.3.0.1", "/api/programs/2/events");
        doRequest("10.3.0.1", "/api/programs/3/events");
        doRequest("10.3.0.1", "/api/programs/4/events");

        var response = doRequest("10.3.0.1", "/api/programs/5/events");

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("60");
    }

    @Test
    void analyticsEventLimitsAreIndependentPerIp() throws Exception {
        for (int i = 0; i < 4; i++) {
            doRequest("10.4.0.1", "/api/programs/1/events");
        }

        var response = doRequest("10.4.0.2", "/api/programs/1/events");

        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    @Test
    void forwardedHeaderCannotBypassLimitBeforeTrustedProxyNormalization() throws Exception {
        for (int i = 0; i < 3; i++) {
            doRequest("203.0.113.10", "/api/auth/login", "198.51.100." + i);
        }

        var response = doRequest(
                "203.0.113.10", "/api/auth/login", "198.51.100.99");

        assertThat(response.getStatus()).isEqualTo(429);
    }

    @Test
    void idleClientBucketsAreEvicted() throws Exception {
        var ticker = new AtomicLong();
        filter = new RateLimitFilter(3, 2, 4, 100, Duration.ofNanos(10), ticker::get);

        doRequest("10.5.0.1", "/api/auth/login");
        assertThat(filter.bucketCount()).isEqualTo(1);

        ticker.set(11);
        doRequest("10.5.0.2", "/api/auth/login");

        assertThat(filter.bucketCount()).isEqualTo(1);
    }

    @Test
    void clientBucketCacheIsBounded() throws Exception {
        filter = new RateLimitFilter(3, 2, 4, 3, Duration.ofMinutes(10), () -> 0L);

        for (int i = 0; i < 10; i++) {
            doRequest("10.6.0." + i, "/api/auth/login");
        }

        assertThat(filter.bucketCount()).isLessThanOrEqualTo(3);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private MockHttpServletResponse doRequest(String ip, String path) throws Exception {
        return doRequest(ip, path, null);
    }

    private MockHttpServletResponse doRequest(String ip, String path, String forwardedFor)
            throws Exception {
        var request  = new MockHttpServletRequest("POST", path);
        request.setServletPath(path);
        request.setRemoteAddr(ip);
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        var response = new MockHttpServletResponse();
        var chain    = new MockFilterChain();
        filter.doFilter(request, response, chain);
        return response;
    }
}

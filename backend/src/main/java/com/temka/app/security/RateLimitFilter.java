package com.temka.app.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String LOGIN_PATH    = "/api/auth/login";
    private static final String REGISTER_PATH = "/api/auth/register";
    private static final String ANALYTICS_EVENTS_KEY = "/api/programs/{id}/events";

    private final long loginCapacity;
    private final long registerCapacity;
    private final long analyticsEventCapacity;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(
            @Value("${rate-limit.login.capacity:10}") long loginCapacity,
            @Value("${rate-limit.register.capacity:5}") long registerCapacity,
            @Value("${rate-limit.analytics-events.capacity:120}") long analyticsEventCapacity
    ) {
        this.loginCapacity    = loginCapacity;
        this.registerCapacity = registerCapacity;
        this.analyticsEventCapacity = analyticsEventCapacity;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !path.equals(LOGIN_PATH)
                && !path.equals(REGISTER_PATH)
                && !isAnalyticsEventRequest(request);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String path = request.getServletPath();
        boolean analyticsEvent = isAnalyticsEventRequest(request);
        long capacity = analyticsEvent
                ? analyticsEventCapacity
                : path.equals(LOGIN_PATH) ? loginCapacity : registerCapacity;
        // One bucket per client for all program events prevents callers from
        // bypassing the limit by rotating program IDs (and avoids per-program keys).
        String bucketPath = analyticsEvent ? ANALYTICS_EVENTS_KEY : path;
        String key = request.getRemoteAddr() + ":" + bucketPath;

        Bucket bucket = buckets.computeIfAbsent(key, k -> buildBucket(capacity));

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", "60");
            response.getWriter().write("""
                    {"status":429,"detail":"Too many requests. Please try again later."}""");
        }
    }

    private Bucket buildBucket(long capacity) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacity)
                        .refillGreedy(capacity, Duration.ofMinutes(1))
                        .build())
                .build();
    }

    private boolean isAnalyticsEventRequest(HttpServletRequest request) {
        String path = request.getServletPath();
        return "POST".equals(request.getMethod())
                && path.startsWith("/api/programs/")
                && path.endsWith("/events");
    }
}

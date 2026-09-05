package com.temka.app.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

public final class SecurityProblemWriter {

    private SecurityProblemWriter() {
    }

    public static void write(HttpServletResponse response, HttpStatus status, String detail)
            throws IOException {
        response.setStatus(status.value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.getWriter().write("""
                {"title":"%s","status":%d,"detail":"%s"}"""
                .formatted(status.getReasonPhrase(), status.value(), detail));
    }
}

package com.temka.app.dto;

public record TopProgramAnalyticsResponse(
        Long id,
        String title,
        long views,
        long clicks,
        long favorites,
        long totalEngagement
) {
}

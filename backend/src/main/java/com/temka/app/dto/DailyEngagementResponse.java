package com.temka.app.dto;

import java.time.LocalDate;

public record DailyEngagementResponse(
        LocalDate date,
        long views,
        long clicks,
        long totalEngagement
) {
}

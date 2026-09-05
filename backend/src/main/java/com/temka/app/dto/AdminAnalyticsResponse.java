package com.temka.app.dto;

import java.util.List;

public record AdminAnalyticsResponse(
        long users,
        long programs,
        long submissions,
        long favorites,
        long views,
        long clicks,
        List<TopProgramAnalyticsResponse> topPrograms,
        List<DailyEngagementResponse> dailyEngagement
) {
}

package com.temka.app.service;

import com.temka.app.dto.AdminAnalyticsResponse;
import com.temka.app.dto.DailyEngagementResponse;
import com.temka.app.dto.TopProgramAnalyticsResponse;
import com.temka.app.entity.ProgramAnalyticsEventType;
import com.temka.app.repository.ProgramAnalyticsRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProgramAnalyticsService {

    private static final int TOP_PROGRAM_LIMIT = 10;

    private final ProgramAnalyticsRepository analyticsRepository;

    @Transactional
    public void record(long programId, ProgramAnalyticsEventType type) {
        int affected = switch (type) {
            case VIEW -> {
                int updated = analyticsRepository.incrementViews(programId);
                if (updated > 0) {
                    analyticsRepository.incrementDailyViews(programId);
                }
                yield updated;
            }
            case CLICK -> {
                int updated = analyticsRepository.incrementClicks(programId);
                if (updated > 0) {
                    analyticsRepository.incrementDailyClicks(programId);
                }
                yield updated;
            }
        };
        if (affected == 0) {
            throw new EntityNotFoundException("Program not found: " + programId);
        }
    }

    @Transactional(readOnly = true)
    public AdminAnalyticsResponse getAdminAnalytics() {
        var totals = analyticsRepository.findAnalyticsTotals();
        var topPrograms = analyticsRepository.findTopPrograms(TOP_PROGRAM_LIMIT).stream()
                .map(program -> new TopProgramAnalyticsResponse(
                        program.getId(),
                        program.getTitle(),
                        program.getViews(),
                        program.getClicks(),
                        program.getFavorites(),
                        program.getTotalEngagement()
                ))
                .toList();
        var dailyEngagement = analyticsRepository.findDailyEngagement().stream()
                .map(day -> new DailyEngagementResponse(
                        day.getEventDate(),
                        day.getViews(),
                        day.getClicks(),
                        day.getViews() + day.getClicks()
                ))
                .toList();
        return new AdminAnalyticsResponse(
                totals.getUsers(),
                totals.getPrograms(),
                totals.getSubmissions(),
                totals.getFavorites(),
                totals.getViews(),
                totals.getClicks(),
                topPrograms,
                dailyEngagement
        );
    }
}

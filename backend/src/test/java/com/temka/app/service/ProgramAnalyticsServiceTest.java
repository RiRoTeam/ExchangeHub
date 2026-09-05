package com.temka.app.service;

import com.temka.app.entity.ProgramAnalyticsEventType;
import com.temka.app.repository.ProgramAnalyticsRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProgramAnalyticsServiceTest {

    @Mock
    ProgramAnalyticsRepository analyticsRepository;

    @Test
    void record_routesEachEventToItsAtomicCounter() {
        var service = new ProgramAnalyticsService(analyticsRepository);
        when(analyticsRepository.incrementViews(7L)).thenReturn(1);
        when(analyticsRepository.incrementClicks(7L)).thenReturn(1);

        service.record(7L, ProgramAnalyticsEventType.VIEW);
        service.record(7L, ProgramAnalyticsEventType.CLICK);

        verify(analyticsRepository).incrementViews(7L);
        verify(analyticsRepository).incrementClicks(7L);
    }

    @Test
    void record_unknownProgramThrowsNotFound() {
        var service = new ProgramAnalyticsService(analyticsRepository);
        when(analyticsRepository.incrementViews(99L)).thenReturn(0);

        assertThatThrownBy(() -> service.record(99L, ProgramAnalyticsEventType.VIEW))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Program not found: 99");
    }

    @Test
    void getAdminAnalytics_mapsTotalsAndTopPrograms() {
        var service = new ProgramAnalyticsService(analyticsRepository);
        var totals = org.mockito.Mockito.mock(
                ProgramAnalyticsRepository.AnalyticsTotalsProjection.class);
        var top = org.mockito.Mockito.mock(
                ProgramAnalyticsRepository.TopProgramProjection.class);
        when(totals.getUsers()).thenReturn(3L);
        when(totals.getPrograms()).thenReturn(2L);
        when(totals.getSubmissions()).thenReturn(4L);
        when(totals.getFavorites()).thenReturn(5L);
        when(totals.getViews()).thenReturn(20L);
        when(totals.getClicks()).thenReturn(6L);
        when(top.getId()).thenReturn(8L);
        when(top.getTitle()).thenReturn("Top");
        when(top.getViews()).thenReturn(12L);
        when(top.getClicks()).thenReturn(4L);
        when(top.getFavorites()).thenReturn(2L);
        when(top.getTotalEngagement()).thenReturn(18L);
        when(analyticsRepository.findAnalyticsTotals()).thenReturn(totals);
        when(analyticsRepository.findTopPrograms(10)).thenReturn(List.of(top));

        var response = service.getAdminAnalytics();

        assertThat(response.users()).isEqualTo(3);
        assertThat(response.views()).isEqualTo(20);
        assertThat(response.clicks()).isEqualTo(6);
        assertThat(response.topPrograms()).singleElement().satisfies(program -> {
            assertThat(program.id()).isEqualTo(8);
            assertThat(program.totalEngagement()).isEqualTo(18);
        });
    }
}

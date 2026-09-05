package com.temka.app.dto;

import com.temka.app.entity.ProgramAnalyticsEventType;
import jakarta.validation.constraints.NotNull;

public record ProgramAnalyticsEventRequest(
        @NotNull(message = "Event type is required") ProgramAnalyticsEventType type
) {
}

package com.temka.app.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ApplicationArguments;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Date;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DevDataSeederTest {

    @Mock
    JdbcTemplate jdbcTemplate;

    @Mock
    ApplicationArguments applicationArguments;

    @InjectMocks
    DevDataSeeder seeder;

    @Test
    void isRestrictedToDevProfile() {
        Profile profile = AnnotatedElementUtils.findMergedAnnotation(DevDataSeeder.class, Profile.class);

        assertThat(profile).isNotNull();
        assertThat(profile.value()).containsExactly("dev", "demo");
    }

    @Test
    void seedsExpiredCurrentAndFutureDeadlinesIdempotently() {
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        seeder.run(applicationArguments);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> argumentsCaptor = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate, times(3)).update(sqlCaptor.capture(), argumentsCaptor.capture());

        assertThat(sqlCaptor.getAllValues())
                .allMatch(sql -> sql.contains("WHERE NOT EXISTS"));
        assertThat(argumentsCaptor.getAllValues())
                .allSatisfy(arguments -> assertThat(arguments[5]).isEqualTo(arguments[7]));

        LocalDate today = LocalDate.now();
        assertThat(deadline(argumentsCaptor.getAllValues().get(0))).isBefore(today);
        assertThat(deadline(argumentsCaptor.getAllValues().get(1))).isEqualTo(today);
        assertThat(deadline(argumentsCaptor.getAllValues().get(2))).isAfter(today);
        assertThat(argumentsCaptor.getAllValues())
                .extracting(arguments -> arguments[6])
                .doesNotHaveDuplicates();
    }

    private LocalDate deadline(Object[] arguments) {
        return ((Date) arguments[4]).toLocalDate();
    }
}

package com.temka.app.dto;

import com.temka.app.entity.ProgramType;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DeadlineValidationTest {

    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void programDeadlineTodayIsValid() {
        var request = new ProgramRequest(
                "Program", "Description", "Estonia", ProgramType.EXCHANGE, LocalDate.now(), null);

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void submissionDeadlineTodayIsValid() {
        var request = new SubmissionRequest(
                "Program", "Description", "Estonia", ProgramType.EXCHANGE, LocalDate.now(), null);

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void pastDeadlinesRemainInvalid() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        var program = new ProgramRequest(
                "Program", "Description", "Estonia", ProgramType.EXCHANGE, yesterday, null);
        var submission = new SubmissionRequest(
                "Program", "Description", "Estonia", ProgramType.EXCHANGE, yesterday, null);

        assertThat(validator.validate(program))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("deadline");
        assertThat(validator.validate(submission))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("deadline");
    }
}

package com.temka.app.repository;

import com.temka.app.AbstractIntegrationTest;
import com.temka.app.entity.Program;
import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class ProgramRepositoryIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    ProgramRepository programRepository;

    @BeforeEach
    void setUp() {
        programRepository.deleteAll();
        programRepository.save(Program.builder()
                .title("Research Exchange")
                .description("International research placement")
                .country("Estonia")
                .type(ProgramType.EXCHANGE)
                .build());
        programRepository.save(Program.builder()
                .title("Engineering Internship")
                .description("Industry experience")
                .country("Germany")
                .type(ProgramType.INTERNSHIP)
                .build());
    }

    @Test
    void findFiltered_acceptsNullFiltersOnPostgres() {
        var programs = programRepository.findFiltered(
                ProgramStatus.ACTIVE, null, null, null);

        assertThat(programs).hasSize(2);
    }

    @Test
    void findFiltered_combinesCaseInsensitiveFiltersOnPostgres() {
        var programs = programRepository.findFiltered(
                ProgramStatus.ACTIVE, ProgramType.EXCHANGE, "eSt", "RESEARCH");

        assertThat(programs)
                .extracting(Program::getTitle)
                .containsExactly("Research Exchange");
    }
}

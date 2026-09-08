package com.temka.app.repository;

import com.temka.app.AbstractIntegrationTest;
import com.temka.app.entity.Program;
import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import static com.temka.app.repository.ProgramSpecifications.activeCatalog;
import static com.temka.app.repository.ProgramSpecifications.adminCatalog;

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
        var programs = programRepository.findAll(
                activeCatalog(null, null, null),
                PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt")));

        assertThat(programs.getContent()).hasSize(2);
    }

    @Test
    void findFiltered_combinesCaseInsensitiveFiltersOnPostgres() {
        var programs = programRepository.findAll(
                activeCatalog(ProgramType.EXCHANGE, "eSt", "RESEARCH"),
                PageRequest.of(0, 20));

        assertThat(programs.getContent())
                .extracting(Program::getTitle)
                .containsExactly("Research Exchange");
    }

    @Test
    void adminCatalogIncludesEveryStatusAndCanFilterByStatus() {
        var draft = programRepository.save(Program.builder()
                .title("Internal draft")
                .description("Not publicly listed")
                .country("Ireland")
                .type(ProgramType.OTHER)
                .status(ProgramStatus.DRAFT)
                .build());

        var allPrograms = programRepository.findAll(
                adminCatalog(null, null, null, null),
                PageRequest.of(0, 20));
        var drafts = programRepository.findAll(
                adminCatalog(ProgramStatus.DRAFT, null, null, null),
                PageRequest.of(0, 20));

        assertThat(allPrograms.getContent()).hasSize(3);
        assertThat(programRepository.findByIdAndStatus(draft.getId(), ProgramStatus.ACTIVE)).isEmpty();
        assertThat(drafts.getContent())
                .extracting(Program::getTitle)
                .containsExactly("Internal draft");
    }
}

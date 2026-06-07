package com.temka.app.service;

import com.temka.app.dto.ProgramRequest;
import com.temka.app.entity.Program;
import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;
import com.temka.app.repository.ProgramRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProgramServiceTest {

    @Mock
    ProgramRepository programRepository;

    @InjectMocks
    ProgramService programService;

    private Program sampleProgram() {
        return Program.builder()
                .id(1L)
                .title("Test Program")
                .description("Description")
                .country("Germany")
                .type(ProgramType.INTERNSHIP)
                .status(ProgramStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();
    }

    @Test
    void list_returnsMappedDtos() {
        when(programRepository.findFiltered(eq(ProgramStatus.ACTIVE), isNull(), isNull(), isNull()))
                .thenReturn(List.of(sampleProgram()));

        var result = programService.list(null, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).title()).isEqualTo("Test Program");
    }

    @Test
    void getById_throwsNotFound_whenMissing() {
        when(programRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> programService.getById(99L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void create_savesAndReturnsDto() {
        var request = new ProgramRequest("New", "Desc", "France", ProgramType.EXCHANGE, null, null);
        var saved = Program.builder()
                .id(2L)
                .title("New")
                .description("Desc")
                .country("France")
                .type(ProgramType.EXCHANGE)
                .status(ProgramStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();
        when(programRepository.save(any())).thenReturn(saved);

        var dto = programService.create(request);

        assertThat(dto.id()).isEqualTo(2L);
        assertThat(dto.country()).isEqualTo("France");
    }

    @Test
    void update_throwsNotFound_whenMissing() {
        when(programRepository.findById(5L)).thenReturn(Optional.empty());
        var request = new ProgramRequest("X", "Y", "Z", ProgramType.OTHER, null, null);

        assertThatThrownBy(() -> programService.update(5L, request))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void delete_throwsNotFound_whenMissing() {
        when(programRepository.existsById(7L)).thenReturn(false);

        assertThatThrownBy(() -> programService.delete(7L))
                .isInstanceOf(EntityNotFoundException.class);
    }
}

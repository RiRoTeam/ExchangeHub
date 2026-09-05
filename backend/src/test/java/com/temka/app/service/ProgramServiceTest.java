package com.temka.app.service;

import com.temka.app.dto.ProgramRequest;
import com.temka.app.entity.Program;
import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;
import com.temka.app.exception.BadRequestException;
import com.temka.app.repository.ProgramRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

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
        when(programRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sampleProgram())));

        var result = programService.list(null, null, null, 0, 20, "createdAt,desc");

        assertThat(result).hasSize(1);
        assertThat(result.getContent().get(0).title()).isEqualTo("Test Program");
    }

    @Test
    void list_addsIdAsStableSecondarySort() {
        when(programRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        programService.list(null, null, null, 0, 20, "deadline,desc");

        var pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(programRepository).findAll(any(Specification.class), pageable.capture());
        assertThat(pageable.getValue().getSort().stream())
                .extracting(org.springframework.data.domain.Sort.Order::getProperty)
                .containsExactly("deadline", "id");
        assertThat(pageable.getValue().getSort().getOrderFor("deadline").getDirection())
                .isEqualTo(org.springframework.data.domain.Sort.Direction.DESC);
        assertThat(pageable.getValue().getSort().getOrderFor("id").getDirection())
                .isEqualTo(org.springframework.data.domain.Sort.Direction.ASC);
    }

    @Test
    void list_rejectsOversizedPage() {
        assertThatThrownBy(() -> programService.list(null, null, null, 0, 101, "createdAt,desc"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("between 1 and 100");
    }

    @Test
    void list_rejectsUnknownSortProperty() {
        assertThatThrownBy(() -> programService.list(null, null, null, 0, 20, "status,asc"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Unsupported program sort");
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

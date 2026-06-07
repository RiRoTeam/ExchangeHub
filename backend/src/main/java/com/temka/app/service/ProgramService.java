package com.temka.app.service;

import com.temka.app.dto.ProgramDto;
import com.temka.app.dto.ProgramRequest;
import com.temka.app.entity.Program;
import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;
import com.temka.app.repository.ProgramRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProgramService {

    private final ProgramRepository programRepository;

    @Transactional(readOnly = true)
    public List<ProgramDto> list(ProgramType type, String country, String q) {
        return programRepository
                .findFiltered(ProgramStatus.ACTIVE, type, country, q)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProgramDto getById(Long id) {
        return toDto(findOrThrow(id));
    }

    @Transactional
    public ProgramDto create(ProgramRequest request) {
        var program = Program.builder()
                .title(request.title())
                .description(request.description())
                .country(request.country())
                .type(request.type())
                .deadline(request.deadline())
                .url(request.url())
                .build();
        return toDto(programRepository.save(program));
    }

    @Transactional
    public ProgramDto update(Long id, ProgramRequest request) {
        var program = findOrThrow(id);
        program.setTitle(request.title());
        program.setDescription(request.description());
        program.setCountry(request.country());
        program.setType(request.type());
        program.setDeadline(request.deadline());
        program.setUrl(request.url());
        return toDto(programRepository.save(program));
    }

    @Transactional
    public void delete(Long id) {
        if (!programRepository.existsById(id)) {
            throw new EntityNotFoundException("Program not found: " + id);
        }
        programRepository.deleteById(id);
    }

    private Program findOrThrow(Long id) {
        return programRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Program not found: " + id));
    }

    public ProgramDto toDto(Program p) {
        return new ProgramDto(p.getId(), p.getTitle(), p.getDescription(),
                p.getCountry(), p.getType(), p.getDeadline(),
                p.getUrl(), p.getStatus(), p.getCreatedAt());
    }
}

package com.temka.app.service;

import com.temka.app.dto.ProgramDto;
import com.temka.app.dto.ProgramRequest;
import com.temka.app.entity.Program;
import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;
import com.temka.app.exception.BadRequestException;
import com.temka.app.repository.ProgramRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static com.temka.app.repository.ProgramSpecifications.activeCatalog;

@Service
@RequiredArgsConstructor
public class ProgramService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Map<String, String> SORT_FIELDS = Map.of(
            "createdAt", "createdAt",
            "deadline", "deadline",
            "title", "title",
            "country", "country"
    );

    private final ProgramRepository programRepository;

    @Transactional(readOnly = true)
    public Page<ProgramDto> list(
            ProgramType type,
            String country,
            String q,
            int page,
            int size,
            String sort
    ) {
        var pageable = pageRequest(page, size, sort);
        return programRepository
                .findAll(activeCatalog(type, country, q), pageable)
                .map(this::toDto);
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

    private PageRequest pageRequest(int page, int size, String sortValue) {
        if (page < 0) {
            throw new BadRequestException("Page must be zero or greater");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("Page size must be between 1 and " + MAX_PAGE_SIZE);
        }

        String requestedSort = sortValue == null || sortValue.isBlank()
                ? "createdAt,desc"
                : sortValue.trim();
        String normalized = switch (requestedSort) {
            case "created_at_desc" -> "createdAt,desc";
            case "deadline_asc" -> "deadline,asc";
            default -> requestedSort;
        };
        String[] parts = normalized.split(",", -1);
        if (parts.length > 2 || !SORT_FIELDS.containsKey(parts[0])) {
            throw new BadRequestException("Unsupported program sort: " + requestedSort);
        }
        var direction = parts.length == 1
                ? Sort.Direction.ASC
                : Sort.Direction.fromOptionalString(parts[1])
                        .orElseThrow(() -> new BadRequestException(
                                "Sort direction must be asc or desc"));

        return PageRequest.of(page, size, Sort.by(direction, SORT_FIELDS.get(parts[0])));
    }
}

package com.temka.app.service;

import com.temka.app.dto.ProgramDto;
import com.temka.app.entity.Program;
import com.temka.app.entity.User;
import com.temka.app.repository.ProgramRepository;
import com.temka.app.repository.UserFavoriteRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserFavoriteService {

    private final UserFavoriteRepository favoriteRepository;
    private final ProgramRepository programRepository;

    @Transactional(readOnly = true)
    public List<ProgramDto> list(User user) {
        return favoriteRepository.findFavoritePrograms(user.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void add(User user, Long programId) {
        if (!programRepository.existsById(programId)) {
            throw new EntityNotFoundException("Program not found: " + programId);
        }
        favoriteRepository.addIfAbsent(user.getId(), programId);
    }

    @Transactional
    public void remove(User user, Long programId) {
        favoriteRepository.deleteByUserIdAndProgramId(user.getId(), programId);
    }

    private ProgramDto toDto(Program program) {
        return new ProgramDto(
                program.getId(),
                program.getTitle(),
                program.getDescription(),
                program.getCountry(),
                program.getType(),
                program.getDeadline(),
                program.getUrl(),
                program.getStatus(),
                program.getCreatedAt()
        );
    }
}

package com.temka.app.repository;

import com.temka.app.entity.Program;
import com.temka.app.entity.ProgramStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface ProgramRepository extends JpaRepository<Program, Long>, JpaSpecificationExecutor<Program> {

    Optional<Program> findByIdAndStatus(Long id, ProgramStatus status);

    boolean existsByIdAndStatus(Long id, ProgramStatus status);
}

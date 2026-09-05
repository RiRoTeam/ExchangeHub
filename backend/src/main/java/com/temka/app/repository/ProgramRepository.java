package com.temka.app.repository;

import com.temka.app.entity.Program;
import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProgramRepository extends JpaRepository<Program, Long> {

    @Query("""
            SELECT p FROM Program p
            WHERE p.status = :status
              AND (:type IS NULL OR p.type = :type)
              AND (CAST(:country AS string) IS NULL
                   OR LOWER(p.country) LIKE LOWER(CONCAT('%', CAST(:country AS string), '%')))
              AND (CAST(:q AS string) IS NULL
                   OR LOWER(p.title) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                   OR LOWER(p.description) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
            ORDER BY p.createdAt DESC
            """)
    List<Program> findFiltered(
            @Param("status") ProgramStatus status,
            @Param("type") ProgramType type,
            @Param("country") String country,
            @Param("q") String q
    );
}

package com.temka.app.repository;

import com.temka.app.entity.Program;
import com.temka.app.entity.UserFavorite;
import com.temka.app.entity.UserFavoriteId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface UserFavoriteRepository extends JpaRepository<UserFavorite, UserFavoriteId> {

    @Query("""
            SELECT f.program FROM UserFavorite f
            WHERE f.user.id = :userId
            ORDER BY f.createdAt DESC
            """)
    List<Program> findFavoritePrograms(Long userId);

    @Modifying
    @Query(value = """
            INSERT INTO user_favorites (user_id, program_id)
            VALUES (:userId, :programId)
            ON CONFLICT (user_id, program_id) DO NOTHING
            """, nativeQuery = true)
    int addIfAbsent(Long userId, Long programId);

    @Modifying
    @Query("DELETE FROM UserFavorite f WHERE f.user.id = :userId AND f.program.id = :programId")
    int deleteByUserIdAndProgramId(Long userId, Long programId);
}

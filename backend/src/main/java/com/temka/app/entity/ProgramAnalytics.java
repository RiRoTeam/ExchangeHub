package com.temka.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "program_analytics")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ProgramAnalytics {

    @Id
    @Column(name = "program_id", nullable = false)
    private Long programId;

    @Column(name = "view_count", nullable = false)
    private long viewCount;

    @Column(name = "click_count", nullable = false)
    private long clickCount;

    @Column(nullable = false)
    private Instant updatedAt;
}

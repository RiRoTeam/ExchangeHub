package com.temka.app.repository;

import com.temka.app.entity.Program;
import com.temka.app.entity.ProgramStatus;
import com.temka.app.entity.ProgramType;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;

public final class ProgramSpecifications {

    private ProgramSpecifications() {
    }

    public static Specification<Program> activeCatalog(
            ProgramType type,
            String country,
            String query
    ) {
        Specification<Program> specification = (root, criteriaQuery, cb) ->
                cb.equal(root.get("status"), ProgramStatus.ACTIVE);

        if (type != null) {
            specification = specification.and((root, criteriaQuery, cb) ->
                    cb.equal(root.get("type"), type));
        }

        if (hasText(country)) {
            String pattern = containsPattern(country);
            specification = specification.and((root, criteriaQuery, cb) ->
                    cb.like(cb.lower(root.get("country")), pattern, '\\'));
        }

        if (hasText(query)) {
            String pattern = containsPattern(query);
            specification = specification.and((root, criteriaQuery, cb) -> cb.or(
                    cb.like(cb.lower(root.get("title")), pattern, '\\'),
                    cb.like(cb.lower(root.get("description")), pattern, '\\')
            ));
        }

        return specification;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String containsPattern(String value) {
        String escaped = value.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}

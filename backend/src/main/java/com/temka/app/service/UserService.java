package com.temka.app.service;

import com.temka.app.dto.AdminUserResponse;
import com.temka.app.dto.UpdateProfileRequest;
import com.temka.app.dto.UserMeResponse;
import com.temka.app.entity.Role;
import com.temka.app.entity.User;
import com.temka.app.exception.BadRequestException;
import com.temka.app.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getAllUsers() {
        return userRepository.findAllForAdminView().stream()
                .map(UserService::toAdminResponse)
                .toList();
    }

    @Transactional
    public AdminUserResponse changeRole(Long userId, Role newRole) {
        // Role-changing transactions acquire admin locks first and in the same
        // order, preventing concurrent demotions from both passing the count check.
        var lockedAdmins = userRepository.findAllAdminsForUpdate();
        var user = lockedAdmins.stream()
                .filter(candidate -> candidate.getId().equals(userId))
                .findFirst()
                .orElseGet(() -> userRepository.findByIdForUpdate(userId)
                        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId)));

        if (user.getRole() == newRole) {
            return toAdminResponse(user);
        }

        if (user.getRole() == Role.ADMIN && newRole != Role.ADMIN && lockedAdmins.size() == 1) {
            throw new IllegalStateException("Cannot demote the last administrator");
        }

        user.setRole(newRole);
        userRepository.save(user);
        refreshTokenService.revokeAllByUser(user);
        return toAdminResponse(user);
    }

    @Transactional
    public UserMeResponse updateProfile(User principal, UpdateProfileRequest request) {
        // The authentication principal is a snapshot loaded when the request was
        // authenticated. Reload and lock the row so a concurrent role change
        // cannot be overwritten by merging that stale snapshot.
        var user = userRepository.findByIdForUpdate(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "User not found: " + principal.getId()));

        if (request.newPassword() != null) {
            if (request.currentPassword() == null ||
                    !passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
                throw new BadRequestException("Wrong current password");
            }
            user.setPassword(passwordEncoder.encode(request.newPassword()));
        }

        if (request.name() != null) {
            user.setName(request.name());
        }

        userRepository.save(user);
        return new UserMeResponse(user.getId(), user.getEmail(), user.getName(), user.getRole());
    }

    private static AdminUserResponse toAdminResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}

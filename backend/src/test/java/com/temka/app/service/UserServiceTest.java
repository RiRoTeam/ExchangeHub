package com.temka.app.service;

import com.temka.app.entity.Role;
import com.temka.app.entity.User;
import com.temka.app.dto.UpdateProfileRequest;
import com.temka.app.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    UserRepository userRepository;

    @Mock
    PasswordEncoder passwordEncoder;

    @Mock
    RefreshTokenService refreshTokenService;

    @InjectMocks
    UserService userService;

    @Test
    void getAllUsers_mapsSafeAdminView() {
        var user = user(1L, "person@example.com", Role.USER);
        when(userRepository.findAllForAdminView()).thenReturn(List.of(user));

        var result = userService.getAllUsers();

        assertThat(result).singleElement().satisfies(item -> {
            assertThat(item.id()).isEqualTo(1L);
            assertThat(item.email()).isEqualTo("person@example.com");
            assertThat(item.name()).isEqualTo("Person");
            assertThat(item.role()).isEqualTo(Role.USER);
            assertThat(item.createdAt()).isEqualTo(user.getCreatedAt());
        });
    }

    @Test
    void changeRole_promotesUserAndRevokesRefreshTokens() {
        var currentAdmin = user(1L, "admin@example.com", Role.ADMIN);
        var target = user(2L, "person@example.com", Role.USER);
        when(userRepository.findAllAdminsForUpdate()).thenReturn(List.of(currentAdmin));
        when(userRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(target));

        var result = userService.changeRole(2L, Role.ADMIN);

        assertThat(result.role()).isEqualTo(Role.ADMIN);
        assertThat(target.getRole()).isEqualTo(Role.ADMIN);
        verify(userRepository).save(target);
        verify(refreshTokenService).revokeAllByUser(target);
    }

    @Test
    void changeRole_demotesAdminWhenAnotherAdminRemains() {
        var target = user(1L, "first@example.com", Role.ADMIN);
        var remaining = user(2L, "second@example.com", Role.ADMIN);
        when(userRepository.findAllAdminsForUpdate()).thenReturn(List.of(target, remaining));

        var result = userService.changeRole(1L, Role.USER);

        assertThat(result.role()).isEqualTo(Role.USER);
        verify(userRepository).save(target);
        verify(refreshTokenService).revokeAllByUser(target);
    }

    @Test
    void changeRole_rejectsDemotionOfLastAdmin() {
        var onlyAdmin = user(1L, "admin@example.com", Role.ADMIN);
        when(userRepository.findAllAdminsForUpdate()).thenReturn(List.of(onlyAdmin));

        assertThatThrownBy(() -> userService.changeRole(1L, Role.USER))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Cannot demote the last administrator");

        assertThat(onlyAdmin.getRole()).isEqualTo(Role.ADMIN);
        verify(userRepository, never()).save(onlyAdmin);
        verifyNoInteractions(refreshTokenService);
    }

    @Test
    void changeRole_sameRoleIsIdempotentAndKeepsTokens() {
        var admin = user(1L, "admin@example.com", Role.ADMIN);
        when(userRepository.findAllAdminsForUpdate()).thenReturn(List.of(admin));

        var result = userService.changeRole(1L, Role.ADMIN);

        assertThat(result.role()).isEqualTo(Role.ADMIN);
        verify(userRepository, never()).save(admin);
        verifyNoInteractions(refreshTokenService);
    }

    @Test
    void changeRole_missingUserThrowsNotFound() {
        when(userRepository.findAllAdminsForUpdate()).thenReturn(List.of());
        when(userRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.changeRole(99L, Role.ADMIN))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("User not found: 99");
    }

    @Test
    void updateProfile_usesFreshLockedUserInsteadOfStalePrincipalRole() {
        var stalePrincipal = user(7L, "person@example.com", Role.ADMIN);
        var persistedUser = user(7L, "person@example.com", Role.USER);
        when(userRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(persistedUser));

        var result = userService.updateProfile(
                stalePrincipal,
                new UpdateProfileRequest("Fresh Name", null, null)
        );

        assertThat(result.role()).isEqualTo(Role.USER);
        assertThat(result.name()).isEqualTo("Fresh Name");
        assertThat(persistedUser.getName()).isEqualTo("Fresh Name");
        assertThat(stalePrincipal.getName()).isEqualTo("Person");
        assertThat(stalePrincipal.getRole()).isEqualTo(Role.ADMIN);
        verify(userRepository).save(persistedUser);
        verify(userRepository, never()).save(stalePrincipal);
    }

    private static User user(Long id, String email, Role role) {
        return User.builder()
                .id(id)
                .email(email)
                .name("Person")
                .password("encoded-password")
                .role(role)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
    }
}

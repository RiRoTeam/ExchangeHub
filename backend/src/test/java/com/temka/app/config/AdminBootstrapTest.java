package com.temka.app.config;

import com.temka.app.entity.Role;
import com.temka.app.entity.User;
import com.temka.app.repository.UserRepository;
import com.temka.app.service.RefreshTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AdminBootstrapTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);

    @Test
    void emptyConfigurationDisablesBootstrap() {
        bootstrap(new AdminBootstrapProperties("", "", ""));

        verifyNoInteractions(userRepository, passwordEncoder, refreshTokenService);
    }

    @Test
    void partialConfigurationFailsFast() {
        assertThatThrownBy(() -> bootstrap(
                new AdminBootstrapProperties("admin@example.com", "Admin", "")
        )).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("must be set together");

        verifyNoInteractions(userRepository, passwordEncoder, refreshTokenService);
    }

    @Test
    void shortBootstrapPasswordFailsFast() {
        assertThatThrownBy(() -> bootstrap(
                new AdminBootstrapProperties("admin@example.com", "Admin", "too-short")
        )).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("12 to 72");

        verifyNoInteractions(userRepository, passwordEncoder, refreshTokenService);
    }

    @Test
    void existingAdminPreventsBootstrapMutation() {
        var existingAdmin = user(Role.ADMIN);
        when(userRepository.findAllAdminsForUpdate()).thenReturn(List.of(existingAdmin));

        bootstrap(configuredProperties());

        verify(userRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder, refreshTokenService);
    }

    @Test
    void existingUserIsPromotedAndRefreshTokensAreRevoked() {
        var existingUser = user(Role.USER);
        when(userRepository.findAllAdminsForUpdate()).thenReturn(List.of());
        when(userRepository.findByEmailForUpdate("admin@example.com")).thenReturn(Optional.of(existingUser));

        bootstrap(configuredProperties());

        assertThat(existingUser.getRole()).isEqualTo(Role.ADMIN);
        verify(userRepository).save(existingUser);
        verify(refreshTokenService).revokeAllByUser(existingUser);
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void configuredBootstrapCreatesEncodedAdminWithoutDefaultPassword() {
        when(userRepository.findAllAdminsForUpdate()).thenReturn(List.of());
        when(userRepository.findByEmailForUpdate("admin@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("long-secure-password")).thenReturn("encoded");

        bootstrap(configuredProperties());

        verify(userRepository).save(org.mockito.ArgumentMatchers.argThat(user ->
                user.getRole() == Role.ADMIN
                        && user.getEmail().equals("admin@example.com")
                        && user.getName().equals("Admin")
                        && user.getPassword().equals("encoded")
        ));
    }

    private void bootstrap(AdminBootstrapProperties properties) {
        new AdminBootstrap(properties, userRepository, passwordEncoder, refreshTokenService)
                .run(new DefaultApplicationArguments());
    }

    private static AdminBootstrapProperties configuredProperties() {
        return new AdminBootstrapProperties("admin@example.com", "Admin", "long-secure-password");
    }

    private static User user(Role role) {
        return User.builder()
                .id(1L)
                .email("admin@example.com")
                .name("Admin")
                .password("encoded-existing")
                .role(role)
                .build();
    }
}

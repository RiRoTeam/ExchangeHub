package com.temka.app.service;

import com.temka.app.dto.AuthResponse;
import com.temka.app.dto.LoginRequest;
import com.temka.app.dto.RefreshRequest;
import com.temka.app.dto.RegisterRequest;
import com.temka.app.entity.Role;
import com.temka.app.entity.User;
import com.temka.app.exception.BadRequestException;
import com.temka.app.exception.InvalidTokenException;
import com.temka.app.repository.UserRepository;
import com.temka.app.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        String name = request.name().trim();
        if (name.length() < 2) {
            throw new BadRequestException("Name must contain at least 2 non-whitespace characters");
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already in use");
        }
        var user = User.builder()
                .email(email)
                .name(name)
                .password(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .build();
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw new IllegalArgumentException("Email already in use", exception);
        }
        return buildTokenPair(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        // Take the same user-row lock used by password/role changes before
        // authenticating and issuing a refresh token. This prevents a login
        // authenticated with an old password from committing a fresh session
        // after a concurrent password change has revoked all sessions.
        var lockedUser = userRepository.findByEmailForUpdate(email);
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email, request.password())
        );
        // If the account appeared only after the locking lookup, do not issue a
        // token from credentials checked without the lock. A normal retry takes
        // the row lock before authentication and cannot race a password change.
        var user = lockedUser.orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        return buildTokenPair(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        // All session-issuing paths lock the user row before locking or
        // creating refresh-token rows. Password and role changes use the same
        // order, so a newly rotated token can never escape revoke-all.
        Long userId = refreshTokenService.findUserId(request.refreshToken());
        var user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new InvalidTokenException("Refresh token user not found"));
        var refreshToken = refreshTokenService.verifyAndGet(request.refreshToken());
        if (!refreshToken.getUser().getId().equals(user.getId())) {
            throw new InvalidTokenException("Refresh token user mismatch");
        }
        // Rotate only the presented session. Other browsers remain signed in;
        // password and role changes still revoke every session explicitly.
        refreshTokenService.revoke(request.refreshToken());
        return buildTokenPair(user);
    }

    @Transactional
    public void logout(RefreshRequest request) {
        refreshTokenService.revoke(request.refreshToken());
    }

    private AuthResponse buildTokenPair(User user) {
        var accessToken = jwtService.generateAccessToken(user);
        var refreshToken = refreshTokenService.createRefreshToken(user);
        return new AuthResponse(accessToken, refreshToken);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(java.util.Locale.ROOT);
    }
}

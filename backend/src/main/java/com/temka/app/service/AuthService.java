package com.temka.app.service;

import com.temka.app.dto.AuthResponse;
import com.temka.app.dto.LoginRequest;
import com.temka.app.dto.RefreshRequest;
import com.temka.app.dto.RegisterRequest;
import com.temka.app.entity.Role;
import com.temka.app.entity.User;
import com.temka.app.repository.UserRepository;
import com.temka.app.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already in use");
        }
        var user = User.builder()
                .email(request.email())
                .name(request.name())
                .password(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .build();
        userRepository.save(user);
        return buildTokenPair(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        var user = (User) auth.getPrincipal();
        return buildTokenPair(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        var refreshToken = refreshTokenService.verifyAndGet(request.refreshToken());
        var user = refreshToken.getUser();
        return buildTokenPair(user);
    }

    private AuthResponse buildTokenPair(User user) {
        var accessToken = jwtService.generateAccessToken(user);
        var refreshToken = refreshTokenService.createRefreshToken(user);
        return new AuthResponse(accessToken, refreshToken.getToken());
    }
}

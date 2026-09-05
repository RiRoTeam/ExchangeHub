package com.temka.app.config;

import com.temka.app.entity.Role;
import com.temka.app.entity.User;
import com.temka.app.repository.UserRepository;
import com.temka.app.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
@EnableConfigurationProperties(AdminBootstrapProperties.class)
@Slf4j
public class AdminBootstrap implements ApplicationRunner {

    private final AdminBootstrapProperties properties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!isConfigured()) {
            return;
        }
        validate();

        // Use the same lock order as role management. Existing admins always win:
        // bootstrap credentials cannot replace or modify an initialized system.
        if (!userRepository.findAllAdminsForUpdate().isEmpty()) {
            return;
        }

        var existingUser = userRepository.findByEmailForUpdate(properties.email());
        if (existingUser.isPresent()) {
            var user = existingUser.get();
            user.setRole(Role.ADMIN);
            userRepository.save(user);
            refreshTokenService.revokeAllByUser(user);
            log.info("Promoted configured bootstrap account to administrator");
            return;
        }

        userRepository.save(User.builder()
                .email(properties.email())
                .name(properties.name())
                .password(passwordEncoder.encode(properties.password()))
                .role(Role.ADMIN)
                .build());
        log.info("Created configured bootstrap administrator");
    }

    private boolean isConfigured() {
        return StringUtils.hasText(properties.email())
                || StringUtils.hasText(properties.name())
                || StringUtils.hasText(properties.password());
    }

    private void validate() {
        if (!StringUtils.hasText(properties.email())
                || !StringUtils.hasText(properties.name())
                || !StringUtils.hasText(properties.password())) {
            throw new IllegalStateException(
                    "BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME and BOOTSTRAP_ADMIN_PASSWORD must be set together"
            );
        }
        if (!properties.email().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalStateException("BOOTSTRAP_ADMIN_EMAIL must be a valid email address");
        }
        if (properties.name().length() < 2 || properties.name().length() > 100) {
            throw new IllegalStateException("BOOTSTRAP_ADMIN_NAME must contain 2 to 100 characters");
        }
        if (properties.password().length() < 12 || properties.password().length() > 72) {
            throw new IllegalStateException("BOOTSTRAP_ADMIN_PASSWORD must contain 12 to 72 characters");
        }
    }
}

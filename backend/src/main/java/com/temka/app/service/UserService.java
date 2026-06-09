package com.temka.app.service;

import com.temka.app.dto.UpdateProfileRequest;
import com.temka.app.dto.UserMeResponse;
import com.temka.app.entity.User;
import com.temka.app.exception.BadRequestException;
import com.temka.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserMeResponse updateProfile(User user, UpdateProfileRequest request) {
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
}

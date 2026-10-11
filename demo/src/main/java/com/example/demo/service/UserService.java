package com.example.demo.service;

import com.example.demo.domain.User;
import com.example.demo.repository.UserRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserService {
    private final UserRepository users;

    public UserService(UserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<User> list() { return users.findAll(); }

    @Transactional(readOnly = true)
    public User get(Long id) { return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", id)); }

    public User create(User user) { return users.save(user); }

    public User update(Long id, User changes) {
        User user = get(id);
        user.setDisplayName(changes.getDisplayName());
        user.setEmail(changes.getEmail());
        return users.save(user);
    }

    public void delete(Long id) { users.delete(get(id)); }
}

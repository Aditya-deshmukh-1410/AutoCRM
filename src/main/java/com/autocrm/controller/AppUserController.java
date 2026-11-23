package com.autocrm.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.autocrm.model.AppUser;
import com.autocrm.service.AppUserService;

@RestController
@RequestMapping("/api/users")
public class AppUserController {

    private final AppUserService appUserService;

    public AppUserController(AppUserService appUserService) {
        this.appUserService = appUserService;
    }

    @PostMapping
    public String createUser(@Valid @RequestBody AppUser user) {

        appUserService.createUser(user);

        return "User created successfully!";
    }

    @GetMapping
    public List<AppUser> getAllUsers() {

        return appUserService.getAllUsers();
    }

    @GetMapping("/{userId}")
    public AppUser getUserById(@PathVariable Long userId) {

        return appUserService.getUserById(userId).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PutMapping("/{userId}")
    public String updateUser(@PathVariable Long userId, @RequestBody AppUser user) {

        appUserService.updateUser(userId, user);

        return "User updated successfully!";
    }
}
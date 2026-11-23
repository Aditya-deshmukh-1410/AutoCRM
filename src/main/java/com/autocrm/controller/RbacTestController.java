package com.autocrm.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RbacTestController {

    @GetMapping("/api/rbac/sales")
    public String salesAccess() {
        return "RBAC SUCCESS: SALES user can access this endpoint!";
    }
}
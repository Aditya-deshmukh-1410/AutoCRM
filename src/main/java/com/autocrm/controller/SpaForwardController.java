package com.autocrm.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Serves the React entry point for BrowserRouter routes in the combined app. */
@Controller
public class SpaForwardController {
    @GetMapping({
            "/", "/showroom", "/login", "/signup", "/reset-password", "/control-panel", "/dashboard",
            "/customers", "/leads", "/sell-requests", "/notifications", "/vehicles/**", "/test-drives",
            "/sales", "/finance", "/activities", "/users", "/audit-history", "/dealership-profile",
            "/dealership-settings", "/website", "/site/{slug}", "/site/{slug}/**", "/builder-preview/**"
    })
    public String app() { return "forward:/index.html"; }
}

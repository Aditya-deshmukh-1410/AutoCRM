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
import org.springframework.security.access.prepost.PreAuthorize;
import com.autocrm.dto.AssignmentRequest;

import com.autocrm.model.Activity;
import com.autocrm.service.ActivityService;

@RestController
@RequestMapping("/api/activities")
@PreAuthorize("hasAnyRole('ADMIN', 'SALES')")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @PostMapping
    public Activity createActivity(@Valid @RequestBody Activity activity) {
        return activityService.createActivity(activity);
    }

    @GetMapping
    public List<Activity> getAllActivities() {
        return activityService.getAllActivities();
    }

    @GetMapping("/{activityId}")
    public Activity getActivityById(@PathVariable Long activityId) {
        return activityService.getActivityById(activityId);
    }

    @PutMapping("/{activityId}")
    public Activity updateActivity(@PathVariable Long activityId, @Valid @RequestBody Activity activity) {
        return activityService.updateActivity(activityId, activity);
    }

    @org.springframework.web.bind.annotation.PutMapping("/{activityId}/assignment")
    @PreAuthorize("hasRole('ADMIN')")
    public Activity assignActivity(@PathVariable Long activityId, @Valid @RequestBody AssignmentRequest request) {
        return activityService.assignActivity(activityId, request.assigneeId());
    }
}

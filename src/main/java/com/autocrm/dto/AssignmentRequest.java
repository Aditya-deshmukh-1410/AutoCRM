package com.autocrm.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AssignmentRequest(
        @NotNull(message = "Assignee ID is required")
        @Positive(message = "Assignee ID must be positive") Long assigneeId) { }

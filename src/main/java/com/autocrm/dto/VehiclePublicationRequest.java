package com.autocrm.dto;

import jakarta.validation.constraints.NotNull;

public record VehiclePublicationRequest(@NotNull Boolean publiclyVisible) {
}

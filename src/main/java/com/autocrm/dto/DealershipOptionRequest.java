package com.autocrm.dto;

import com.autocrm.model.DealershipOptionType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DealershipOptionRequest(@NotNull DealershipOptionType optionType,
        @NotBlank @Size(max = 60) String value, Boolean active) {
}

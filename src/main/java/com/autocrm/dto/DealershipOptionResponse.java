package com.autocrm.dto;

import com.autocrm.model.DealershipOption;
import com.autocrm.model.DealershipOptionType;

public record DealershipOptionResponse(Long optionId, DealershipOptionType optionType, String value, boolean active) {
    public DealershipOptionResponse(DealershipOption option) {
        this(option.getOptionId(), option.getOptionType(), option.getValue(), option.isActive());
    }
}

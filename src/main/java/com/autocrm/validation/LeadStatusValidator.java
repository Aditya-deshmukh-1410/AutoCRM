package com.autocrm.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class LeadStatusValidator implements ConstraintValidator<ValidLeadStatus, String> {

    private static final String[] VALID_STATUSES = { "NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST" };

    @Override
    public boolean isValid(String status, ConstraintValidatorContext context) {

        if (status == null) {
            return true;
        }

        for (String validStatus : VALID_STATUSES) {
            if (validStatus.equals(status)) {
                return true;
            }
        }

        return false;
    }
}
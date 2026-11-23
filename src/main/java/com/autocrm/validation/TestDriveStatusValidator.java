package com.autocrm.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class TestDriveStatusValidator implements ConstraintValidator<ValidTestDriveStatus, String> {

    private static final String[] VALID_STATUSES = { "SCHEDULED", "COMPLETED", "CANCELLED" };

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
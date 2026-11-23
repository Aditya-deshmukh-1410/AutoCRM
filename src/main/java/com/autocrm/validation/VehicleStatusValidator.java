package com.autocrm.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class VehicleStatusValidator implements ConstraintValidator<ValidVehicleStatus, String> {

    private static final String[] VALID_STATUSES = { "AVAILABLE", "RESERVED", "SOLD" };

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
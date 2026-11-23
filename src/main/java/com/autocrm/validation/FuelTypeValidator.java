package com.autocrm.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class FuelTypeValidator implements ConstraintValidator<ValidFuelType, String> {

    private static final String[] VALID_FUEL_TYPES = { "PETROL", "DIESEL", "CNG", "ELECTRIC", "HYBRID" };

    @Override
    public boolean isValid(String fuelType, ConstraintValidatorContext context) {

        if (fuelType == null) {
            return true;
        }

        for (String validFuelType : VALID_FUEL_TYPES) {
            if (validFuelType.equals(fuelType)) {
                return true;
            }
        }

        return false;
    }
}
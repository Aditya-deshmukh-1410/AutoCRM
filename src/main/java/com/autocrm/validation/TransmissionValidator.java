package com.autocrm.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class TransmissionValidator implements ConstraintValidator<ValidTransmission, String> {

    private static final String[] VALID_TRANSMISSIONS = { "MANUAL", "AUTOMATIC" };

    @Override
    public boolean isValid(String transmission, ConstraintValidatorContext context) {

        if (transmission == null) {
            return true;
        }

        for (String validTransmission : VALID_TRANSMISSIONS) {
            if (validTransmission.equals(transmission)) {
                return true;
            }
        }

        return false;
    }
}
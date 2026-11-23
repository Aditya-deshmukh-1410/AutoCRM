package com.autocrm.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class SaleStatusValidator implements ConstraintValidator<ValidSaleStatus, String> {

    private static final String[] VALID_STATUSES = { "DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED" };

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
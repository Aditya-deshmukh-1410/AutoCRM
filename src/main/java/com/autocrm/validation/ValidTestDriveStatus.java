package com.autocrm.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

@Constraint(validatedBy = TestDriveStatusValidator.class)
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidTestDriveStatus {

    String message() default "Invalid test drive status";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
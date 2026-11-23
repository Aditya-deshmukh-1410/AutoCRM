package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

import com.autocrm.model.Activity;
import com.autocrm.model.Customer;
import com.autocrm.model.Finance;
import com.autocrm.model.Lead;
import com.autocrm.model.Sale;
import com.autocrm.model.TestDrive;
import com.autocrm.model.Vehicle;
import com.autocrm.model.VehicleInspection;
import com.autocrm.security.TenantContext;

class TenantContextRequiredForCreationTest {

    @AfterEach
    void clearTenantContext() {
        TenantContext.clear();
    }

    @Test
    void allDealershipCreateServicesRejectMissingTenantBeforeRepositoryAccess() {
        TenantContext.clear();

        assertMissingTenant(() -> new ActivityService(null, null, null, null, null).createActivity(new Activity()));
        assertMissingTenant(() -> new CustomerService(null, null).createCustomer(new Customer()));
        assertMissingTenant(() -> new FinanceService(null, null, null, null).createFinance(new Finance()));
        assertMissingTenant(() -> new LeadService(null, null, null, null).createLead(new Lead()));
        assertMissingTenant(() -> new SaleService(null, null, null, null).createSale(new Sale()));
        assertMissingTenant(() -> new TestDriveService(null, null, null, null, null).createTestDrive(new TestDrive()));
        assertMissingTenant(() -> new VehicleInspectionService(null, null, null).createInspection(new VehicleInspection()));
        assertMissingTenant(() -> new VehicleService(null, null, null, null).createVehicle(new Vehicle()));
    }

    private void assertMissingTenant(Executable create) {
        IllegalStateException error = assertThrows(IllegalStateException.class, create);
        assertEquals("Authenticated tenant context is missing", error.getMessage());
    }
}

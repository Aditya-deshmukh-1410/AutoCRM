package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.autocrm.repository.ActivityRepository;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.FinanceRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.repository.SaleRepository;
import com.autocrm.repository.TestDriveRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.TenantContext;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    private static final Long TENANT_ID = 73L;

    @Mock private CustomerRepository customers;
    @Mock private LeadRepository leads;
    @Mock private VehicleRepository vehicles;
    @Mock private TestDriveRepository testDrives;
    @Mock private SaleRepository sales;
    @Mock private ActivityRepository activities;
    @Mock private FinanceRepository finances;

    @InjectMocks private DashboardService service;

    @AfterEach
    void clearTenantContext() {
        TenantContext.clear();
    }

    @Test
    void dashboardCountsUseOnlyTheTenantFromTenantContext() {
        TenantContext.setTenantId(TENANT_ID);
        when(customers.findByTenantId(TENANT_ID)).thenReturn(List.of(new com.autocrm.model.Customer()));
        when(leads.findByTenantId(TENANT_ID)).thenReturn(List.of(new com.autocrm.model.Lead(), new com.autocrm.model.Lead()));
        when(vehicles.findByTenantId(TENANT_ID)).thenReturn(List.of(new com.autocrm.model.Vehicle()));
        when(testDrives.findByTenantId(TENANT_ID)).thenReturn(List.of());
        when(sales.findByTenantId(TENANT_ID)).thenReturn(List.of(new com.autocrm.model.Sale()));
        when(activities.findByTenantId(TENANT_ID)).thenReturn(List.of(new com.autocrm.model.Activity()));
        when(finances.findByTenantId(TENANT_ID)).thenReturn(List.of());

        Map<String, Long> result = service.getDashboard();

        assertEquals(Map.of(
                "totalCustomers", 1L,
                "totalLeads", 2L,
                "totalVehicles", 1L,
                "totalTestDrives", 0L,
                "totalSales", 1L,
                "totalActivities", 1L,
                "totalFinanceRecords", 0L), result);
        verify(customers).findByTenantId(TENANT_ID);
        verify(leads).findByTenantId(TENANT_ID);
        verify(vehicles).findByTenantId(TENANT_ID);
        verify(testDrives).findByTenantId(TENANT_ID);
        verify(sales).findByTenantId(TENANT_ID);
        verify(activities).findByTenantId(TENANT_ID);
        verify(finances).findByTenantId(TENANT_ID);
    }

    @Test
    void dashboardRequiresTenantContextAndDoesNotQueryRepositoriesWithoutIt() {
        assertThrows(IllegalStateException.class, service::getDashboard);

        verifyNoInteractions(customers, leads, vehicles, testDrives, sales, activities, finances);
    }
}

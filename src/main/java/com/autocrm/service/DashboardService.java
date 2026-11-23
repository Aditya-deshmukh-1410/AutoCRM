package com.autocrm.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.autocrm.repository.ActivityRepository;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.FinanceRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.repository.SaleRepository;
import com.autocrm.repository.TestDriveRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.TenantContext;

@Service
public class DashboardService {

    private final CustomerRepository customerRepository;
    private final LeadRepository leadRepository;
    private final VehicleRepository vehicleRepository;
    private final TestDriveRepository testDriveRepository;
    private final SaleRepository saleRepository;
    private final ActivityRepository activityRepository;
    private final FinanceRepository financeRepository;

    public DashboardService(CustomerRepository customerRepository, LeadRepository leadRepository,
            VehicleRepository vehicleRepository, TestDriveRepository testDriveRepository, SaleRepository saleRepository,
            ActivityRepository activityRepository, FinanceRepository financeRepository) {

        this.customerRepository = customerRepository;
        this.leadRepository = leadRepository;
        this.vehicleRepository = vehicleRepository;
        this.testDriveRepository = testDriveRepository;
        this.saleRepository = saleRepository;
        this.activityRepository = activityRepository;
        this.financeRepository = financeRepository;
    }

    public Map<String, Long> getDashboard() {

        Long tenantId = TenantContext.requireTenantId();

        Map<String, Long> dashboard = new HashMap<>();

        dashboard.put("totalCustomers", (long) customerRepository.findByTenantId(tenantId).size());

        dashboard.put("totalLeads", (long) leadRepository.findByTenantId(tenantId).size());

        dashboard.put("totalVehicles", (long) vehicleRepository.findByTenantId(tenantId).size());

        dashboard.put("totalTestDrives", (long) testDriveRepository.findByTenantId(tenantId).size());

        dashboard.put("totalSales", (long) saleRepository.findByTenantId(tenantId).size());

        dashboard.put("totalActivities", (long) activityRepository.findByTenantId(tenantId).size());

        dashboard.put("totalFinanceRecords", (long) financeRepository.findByTenantId(tenantId).size());

        return dashboard;
    }
}
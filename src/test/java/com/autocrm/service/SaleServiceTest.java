package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.autocrm.model.Customer;
import com.autocrm.model.Sale;
import com.autocrm.model.Vehicle;
import com.autocrm.exception.BusinessException;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.SaleRepository;
import com.autocrm.security.TenantContext;

@ExtendWith(MockitoExtension.class)
class SaleServiceTest {

    private static final Long TENANT_ID = 17L;
    private static final Long CUSTOMER_ID = 21L;
    private static final Long VEHICLE_ID = 31L;
    private static final Long SALE_ID = 41L;

    @Mock private SaleRepository saleRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private VehicleService vehicleService;
    @Mock private AuditLogService auditLogService;

    private SaleService service;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TENANT_ID);
        service = new SaleService(saleRepository, customerRepository, vehicleService, auditLogService);
    }

    @AfterEach
    void clearTenantContext() {
        TenantContext.clear();
    }

    @Test
    void completedSaleMarksVehicleSold() {
        Sale sale = sale("COMPLETED");
        Vehicle vehicle = vehicle("AVAILABLE");
        when(customerRepository.findByCustomerIdAndTenantId(CUSTOMER_ID, TENANT_ID))
                .thenReturn(Optional.of(customer()));
        when(vehicleService.getVehicleByIdForUpdate(VEHICLE_ID)).thenReturn(vehicle);
        when(saleRepository.findByVehicleIdAndTenantIdAndSaleStatus(VEHICLE_ID, TENANT_ID, "COMPLETED"))
                .thenReturn(Optional.empty());
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale saved = invocation.getArgument(0);
            saved.setSaleId(SALE_ID);
            return saved;
        });

        service.createSale(sale);

        assertEquals("SOLD", vehicle.getStatus());
        verify(vehicleService).updateVehicleFromSale(VEHICLE_ID, vehicle);
    }

    @Test
    void rejectsASecondCompletedSaleForTheSameVehicle() {
        Sale sale = sale("COMPLETED");
        when(customerRepository.findByCustomerIdAndTenantId(CUSTOMER_ID, TENANT_ID))
                .thenReturn(Optional.of(customer()));
        when(vehicleService.getVehicleByIdForUpdate(VEHICLE_ID)).thenReturn(vehicle("AVAILABLE"));
        when(saleRepository.findByVehicleIdAndTenantIdAndSaleStatus(VEHICLE_ID, TENANT_ID, "COMPLETED"))
                .thenReturn(Optional.of(sale("COMPLETED")));

        assertThrows(BusinessException.class, () -> service.createSale(sale));

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void rejectsSaleWhenVehicleIsUnavailableAsBusinessConflict() {
        Sale sale = sale("COMPLETED");
        when(customerRepository.findByCustomerIdAndTenantId(CUSTOMER_ID, TENANT_ID))
                .thenReturn(Optional.of(customer()));
        when(vehicleService.getVehicleByIdForUpdate(VEHICLE_ID)).thenReturn(vehicle("SOLD"));

        BusinessException error = assertThrows(BusinessException.class, () -> service.createSale(sale));

        assertEquals("Vehicle is not available for sale", error.getMessage());
        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void rejectsCompletingSaleAgainstUnavailableReplacementVehicleAsBusinessConflict() {
        Sale existing = sale("COMPLETED");
        existing.setSaleId(SALE_ID);
        Sale update = sale("COMPLETED");
        update.setVehicleId(32L);
        when(saleRepository.findBySaleIdAndTenantId(SALE_ID, TENANT_ID)).thenReturn(Optional.of(existing));
        when(customerRepository.findByCustomerIdAndTenantId(CUSTOMER_ID, TENANT_ID))
                .thenReturn(Optional.of(customer()));
        when(vehicleService.getVehicleByIdForUpdate(32L)).thenReturn(vehicle("SOLD"));
        when(saleRepository.findByVehicleIdAndTenantIdAndSaleStatus(32L, TENANT_ID, "COMPLETED"))
                .thenReturn(Optional.empty());

        BusinessException error = assertThrows(BusinessException.class, () -> service.updateSale(SALE_ID, update));

        assertEquals("Vehicle is not available for sale", error.getMessage());
        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void missingOrTenantInaccessibleVehicleErrorIsNotConvertedToBusinessConflict() {
        Sale sale = sale("COMPLETED");
        when(customerRepository.findByCustomerIdAndTenantId(CUSTOMER_ID, TENANT_ID))
                .thenReturn(Optional.of(customer()));
        when(vehicleService.getVehicleByIdForUpdate(VEHICLE_ID))
                .thenThrow(new RuntimeException("Vehicle not found"));

        RuntimeException error = assertThrows(RuntimeException.class, () -> service.createSale(sale));

        assertEquals(RuntimeException.class, error.getClass());
        assertEquals("Vehicle not found", error.getMessage());
        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void changingCompletedSaleVehicleRestoresOldVehicleAndMarksNewVehicleSold() {
        Sale existing = sale("COMPLETED");
        existing.setSaleId(SALE_ID);
        Vehicle oldVehicle = vehicle("SOLD");
        Vehicle newVehicle = vehicle("AVAILABLE");
        newVehicle.setVehicleId(32L);
        Sale update = sale("COMPLETED");
        update.setVehicleId(32L);
        when(saleRepository.findBySaleIdAndTenantId(SALE_ID, TENANT_ID)).thenReturn(Optional.of(existing));
        when(customerRepository.findByCustomerIdAndTenantId(CUSTOMER_ID, TENANT_ID))
                .thenReturn(Optional.of(customer()));
        when(vehicleService.getVehicleByIdForUpdate(32L)).thenReturn(newVehicle);
        when(saleRepository.findByVehicleIdAndTenantIdAndSaleStatus(32L, TENANT_ID, "COMPLETED"))
                .thenReturn(Optional.empty());
        when(saleRepository.save(existing)).thenReturn(existing);
        when(vehicleService.getVehicleByIdForUpdate(VEHICLE_ID)).thenReturn(oldVehicle);
        when(saleRepository.existsByVehicleIdAndTenantIdAndSaleStatusAndSaleIdNot(
                VEHICLE_ID, TENANT_ID, "COMPLETED", SALE_ID)).thenReturn(false);

        service.updateSale(SALE_ID, update);

        assertEquals("SOLD", newVehicle.getStatus());
        assertEquals("AVAILABLE", oldVehicle.getStatus());
        verify(vehicleService).updateVehicleFromSale(32L, newVehicle);
        verify(vehicleService).updateVehicleFromSale(VEHICLE_ID, oldVehicle);
    }

    @Test
    void cancellingCompletedSaleLeavesVehicleSoldWhenAnotherCompletedSaleExists() {
        Sale existing = sale("COMPLETED");
        existing.setSaleId(SALE_ID);
        Vehicle vehicle = vehicle("SOLD");
        Sale update = sale("CANCELLED");
        when(saleRepository.findBySaleIdAndTenantId(SALE_ID, TENANT_ID)).thenReturn(Optional.of(existing));
        when(customerRepository.findByCustomerIdAndTenantId(CUSTOMER_ID, TENANT_ID))
                .thenReturn(Optional.of(customer()));
        when(vehicleService.getVehicleById(VEHICLE_ID)).thenReturn(vehicle);
        when(vehicleService.getVehicleByIdForUpdate(VEHICLE_ID)).thenReturn(vehicle);
        when(saleRepository.save(existing)).thenReturn(existing);
        when(saleRepository.existsByVehicleIdAndTenantIdAndSaleStatusAndSaleIdNot(
                VEHICLE_ID, TENANT_ID, "COMPLETED", SALE_ID)).thenReturn(true);

        service.updateSale(SALE_ID, update);

        assertEquals("SOLD", vehicle.getStatus());
        verify(vehicleService, never()).updateVehicleFromSale(any(), any());
    }

    @Test
    void deletingCompletedSaleRestoresVehicleOnlyWhenNoOtherCompletedSaleExists() {
        Sale existing = sale("COMPLETED");
        existing.setSaleId(SALE_ID);
        Vehicle vehicle = vehicle("SOLD");
        when(saleRepository.findBySaleIdAndTenantId(SALE_ID, TENANT_ID)).thenReturn(Optional.of(existing));
        when(vehicleService.getVehicleByIdForUpdate(VEHICLE_ID)).thenReturn(vehicle);
        when(saleRepository.existsByVehicleIdAndTenantIdAndSaleStatusAndSaleIdNot(
                VEHICLE_ID, TENANT_ID, "COMPLETED", SALE_ID)).thenReturn(false);

        service.deleteSale(SALE_ID);

        assertEquals("AVAILABLE", vehicle.getStatus());
        verify(vehicleService).updateVehicleFromSale(VEHICLE_ID, vehicle);
        verify(saleRepository).delete(existing);
    }

    private Sale sale(String status) {
        Sale sale = new Sale();
        sale.setCustomerId(CUSTOMER_ID);
        sale.setVehicleId(VEHICLE_ID);
        sale.setSaleDate(LocalDate.of(2026, 1, 1));
        sale.setSalePrice(new BigDecimal("10000"));
        sale.setPaymentStatus("PENDING");
        sale.setSaleStatus(status);
        return sale;
    }

    private Customer customer() {
        Customer customer = new Customer();
        customer.setCustomerId(CUSTOMER_ID);
        customer.setTenantId(TENANT_ID);
        return customer;
    }

    private Vehicle vehicle(String status) {
        Vehicle vehicle = new Vehicle();
        vehicle.setVehicleId(VEHICLE_ID);
        vehicle.setTenantId(TENANT_ID);
        vehicle.setStatus(status);
        return vehicle;
    }
}

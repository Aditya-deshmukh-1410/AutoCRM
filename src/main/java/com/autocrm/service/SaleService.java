package com.autocrm.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.exception.BusinessException;
import com.autocrm.model.Sale;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.SaleRepository;
import com.autocrm.security.TenantContext;

@Service
public class SaleService {

    private final SaleRepository saleRepository;
    private final CustomerRepository customerRepository;
    private final VehicleService vehicleService;
    private final AuditLogService auditLogService;

    public SaleService(SaleRepository saleRepository, CustomerRepository customerRepository,
            VehicleService vehicleService, AuditLogService auditLogService) {

        this.saleRepository = saleRepository;
        this.customerRepository = customerRepository;
        this.vehicleService = vehicleService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public Sale createSale(Sale sale) {

        Long tenantId = TenantContext.requireTenantId();

        customerRepository.findByCustomerIdAndTenantId(sale.getCustomerId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        Vehicle vehicle = "COMPLETED".equalsIgnoreCase(sale.getSaleStatus())
                ? vehicleService.getVehicleByIdForUpdate(sale.getVehicleId())
                : vehicleService.getVehicleById(sale.getVehicleId());

        if (!"AVAILABLE".equalsIgnoreCase(vehicle.getStatus())) {
            throw new BusinessException("Vehicle is not available for sale");
        }

        if ("COMPLETED".equalsIgnoreCase(sale.getSaleStatus()) && saleRepository
                .findByVehicleIdAndTenantIdAndSaleStatus(sale.getVehicleId(), tenantId, "COMPLETED").isPresent()) {

            throw new BusinessException("Vehicle already has a completed sale");
        }

        sale.setSaleId(null);
        sale.setTenantId(tenantId);

        Sale savedSale = saleRepository.save(sale);

        if ("COMPLETED".equalsIgnoreCase(sale.getSaleStatus())) {
            String previousVehicleStatus = vehicle.getStatus();
            vehicle.setStatus("SOLD");

            vehicleService.updateVehicleFromSale(vehicle.getVehicleId(), vehicle);
            recordVehicleStatusChange(vehicle, previousVehicleStatus, "sale completion");
        }

        auditLogService.record("SALE_CREATED", "SALE", savedSale.getSaleId(), "saleStatus: (new) -> "
                + savedSale.getSaleStatus() + "; paymentStatus: (new) -> " + savedSale.getPaymentStatus());

        return savedSale;
    }

    public List<Sale> getAllSales() {

        Long tenantId = TenantContext.requireTenantId();

        return saleRepository.findByTenantId(tenantId);
    }

    public Sale getSaleById(Long saleId) {

        Long tenantId = TenantContext.requireTenantId();

        return saleRepository.findBySaleIdAndTenantId(saleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Sale not found"));
    }

    @Transactional
    public Sale updateSale(Long saleId, Sale updatedSale) {

        Long tenantId = TenantContext.requireTenantId();

        Sale existingSale = saleRepository.findBySaleIdAndTenantId(saleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Sale not found"));

        customerRepository.findByCustomerIdAndTenantId(updatedSale.getCustomerId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        Vehicle vehicle = "COMPLETED".equalsIgnoreCase(updatedSale.getSaleStatus())
                ? vehicleService.getVehicleByIdForUpdate(updatedSale.getVehicleId())
                : vehicleService.getVehicleById(updatedSale.getVehicleId());

        Long previousVehicleId = existingSale.getVehicleId();
        if ("COMPLETED".equalsIgnoreCase(updatedSale.getSaleStatus())) {

            saleRepository.findByVehicleIdAndTenantIdAndSaleStatus(updatedSale.getVehicleId(), tenantId, "COMPLETED")
                    .ifPresent(completedSale -> {

                        if (!completedSale.getSaleId().equals(existingSale.getSaleId())) {
                            throw new BusinessException("Vehicle already has a completed sale");
                        }
                    });

            if (!"AVAILABLE".equalsIgnoreCase(vehicle.getStatus())
                    && !existingSale.getVehicleId().equals(updatedSale.getVehicleId())) {

                throw new BusinessException("Vehicle is not available for sale");
            }
        }

        String previousSaleStatus = existingSale.getSaleStatus();
        String previousPaymentStatus = existingSale.getPaymentStatus();
        boolean wasCompleted = "COMPLETED".equalsIgnoreCase(existingSale.getSaleStatus());

        existingSale.setCustomerId(updatedSale.getCustomerId());
        existingSale.setVehicleId(updatedSale.getVehicleId());
        existingSale.setSaleDate(updatedSale.getSaleDate());
        existingSale.setSalePrice(updatedSale.getSalePrice());
        existingSale.setPaymentStatus(updatedSale.getPaymentStatus());
        existingSale.setSaleStatus(updatedSale.getSaleStatus());
        existingSale.setNotes(updatedSale.getNotes());

        Sale savedSale = saleRepository.save(existingSale);

        if ("COMPLETED".equalsIgnoreCase(updatedSale.getSaleStatus())) {
            String previousVehicleStatus = vehicle.getStatus();
            vehicle.setStatus("SOLD");

            vehicleService.updateVehicleFromSale(vehicle.getVehicleId(), vehicle);
            recordVehicleStatusChange(vehicle, previousVehicleStatus, "sale completion");
        }

        boolean completedSaleReleasedVehicle = wasCompleted && (!"COMPLETED".equalsIgnoreCase(updatedSale.getSaleStatus())
                || !previousVehicleId.equals(updatedSale.getVehicleId()));
        if (completedSaleReleasedVehicle) {
            restoreVehicleIfNoOtherCompletedSale(previousVehicleId, tenantId, savedSale.getSaleId(),
                    "sale " + updatedSale.getSaleStatus().toLowerCase());
        }

        String auditAction = previousSaleStatus.equalsIgnoreCase(savedSale.getSaleStatus()) ? "SALE_UPDATED"
                : "COMPLETED".equalsIgnoreCase(savedSale.getSaleStatus()) ? "SALE_COMPLETED"
                        : "CANCELLED".equalsIgnoreCase(savedSale.getSaleStatus()) ? "SALE_CANCELLED"
                                : "SALE_STATUS_CHANGED";
        auditLogService.record(auditAction, "SALE", savedSale.getSaleId(),
                "saleStatus: " + previousSaleStatus + " -> " + savedSale.getSaleStatus() + "; paymentStatus: "
                        + previousPaymentStatus + " -> " + savedSale.getPaymentStatus());

        return savedSale;
    }

    @Transactional
    public void deleteSale(Long saleId) {

        Long tenantId = TenantContext.requireTenantId();

        Sale existingSale = saleRepository.findBySaleIdAndTenantId(saleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Sale not found"));

        if ("COMPLETED".equalsIgnoreCase(existingSale.getSaleStatus())) {
            restoreVehicleIfNoOtherCompletedSale(existingSale.getVehicleId(), tenantId, existingSale.getSaleId(),
                    "deletion of completed sale");
        }

        saleRepository.delete(existingSale);
        auditLogService.record("SALE_DELETED", "SALE", existingSale.getSaleId(), "saleStatus: "
                + existingSale.getSaleStatus() + " -> DELETED; paymentStatus: " + existingSale.getPaymentStatus());
    }

    private void recordVehicleStatusChange(Vehicle vehicle, String previousStatus, String reason) {
        if (previousStatus != null && vehicle.getStatus() != null
                && !previousStatus.equalsIgnoreCase(vehicle.getStatus())) {
            auditLogService.record("VEHICLE_STATUS_CHANGED", "VEHICLE", vehicle.getVehicleId(),
                    "status: " + previousStatus + " -> " + vehicle.getStatus() + " (" + reason + ")");
        }
    }

    private void restoreVehicleIfNoOtherCompletedSale(Long vehicleId, Long tenantId, Long currentSaleId,
            String reason) {
        Vehicle vehicle = vehicleService.getVehicleByIdForUpdate(vehicleId);
        boolean anotherCompletedSaleExists = saleRepository.existsByVehicleIdAndTenantIdAndSaleStatusAndSaleIdNot(
                vehicleId, tenantId, "COMPLETED", currentSaleId);

        if (!anotherCompletedSaleExists && !"AVAILABLE".equalsIgnoreCase(vehicle.getStatus())) {
            String previousVehicleStatus = vehicle.getStatus();
            vehicle.setStatus("AVAILABLE");
            vehicleService.updateVehicleFromSale(vehicle.getVehicleId(), vehicle);
            recordVehicleStatusChange(vehicle, previousVehicleStatus, reason);
        }
    }
}

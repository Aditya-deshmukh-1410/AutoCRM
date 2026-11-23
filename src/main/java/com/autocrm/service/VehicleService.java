
package com.autocrm.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.dto.PublicVehicleResponse;
import com.autocrm.exception.BusinessException;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.repository.TenantRepository;
import com.autocrm.security.TenantContext;

@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final AuditLogService auditLogService;
    private final VehicleImageService vehicleImageService;
    private final TenantRepository tenantRepository;

    @Autowired
    public VehicleService(VehicleRepository vehicleRepository, AuditLogService auditLogService,
            @Lazy VehicleImageService vehicleImageService, TenantRepository tenantRepository) {
        this.vehicleRepository = vehicleRepository;
        this.auditLogService = auditLogService;
        this.vehicleImageService = vehicleImageService;
        this.tenantRepository = tenantRepository;
    }

    @Transactional
    public Vehicle createVehicle(Vehicle vehicle) {

        Long tenantId = TenantContext.requireTenantId();

        if (vehicleRepository.existsByRegistrationNumberAndTenantId(vehicle.getRegistrationNumber(), tenantId)) {
            throw new BusinessException("Vehicle with this registration number already exists");
        }

        vehicle.setVehicleId(null);
        vehicle.setTenantId(tenantId);
        vehicle.setPubliclyVisible(false);
        vehicle.setCategory(normalizeCategory(vehicle.getCategory()));
        normalizeListingFields(vehicle);

        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        auditLogService.record("VEHICLE_CREATED", "VEHICLE", savedVehicle.getVehicleId(),
                "status: (new) -> " + savedVehicle.getStatus());

        return savedVehicle;
    }

    public List<Vehicle> getAllVehicles() {

        Long tenantId = TenantContext.requireTenantId();

        return vehicleRepository.findByTenantId(tenantId);
    }

    @Transactional(readOnly = true)
    public List<PublicVehicleResponse> getPublishedVehicles() {
        List<Vehicle> published = vehicleRepository.findByPubliclyVisibleTrueOrderByVehicleIdDesc();
        var tenantsById = tenantRepository.findAllById(published.stream().map(Vehicle::getTenantId).distinct().toList())
                .stream().collect(java.util.stream.Collectors.toMap(com.autocrm.model.Tenant::getTenantId, tenant -> tenant));
        return published.stream()
                .map(vehicle -> new PublicVehicleResponse(vehicle.getVehicleId(), vehicle.getMake(), vehicle.getModel(),
                        vehicle.getVariant(), vehicle.getYear(), vehicle.getPrice(), vehicle.getKilometers(),
                          vehicle.getFuelType(), vehicle.getTransmission(), vehicle.getColor(), vehicle.getStatus(),
                          tenantsById.get(vehicle.getTenantId()) == null ? null : tenantsById.get(vehicle.getTenantId()).getName(),
                          tenantsById.get(vehicle.getTenantId()) == null || tenantsById.get(vehicle.getTenantId()).getLogo() == null
                                  ? null : "/api/public/vehicles/" + vehicle.getVehicleId() + "/dealership-logo",
                          vehicle.getCategory(), vehicle.getBodyType(), vehicle.getOwnerType(), vehicle.getDescription(),
                          vehicle.getRegistrationAt(), vehicle.getRegistrationType(), vehicle.getInsuranceType(),
                          vehicle.getSellerNote()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Vehicle getPublishedVehicleById(Long vehicleId) {

        return vehicleRepository.findByVehicleIdAndPubliclyVisibleTrue(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
    }

    @Transactional
    public Vehicle setVehiclePubliclyVisible(Long vehicleId, boolean publiclyVisible) {

        // Require a tenant context before accessing dealership-owned data.
        Long tenantId = TenantContext.requireTenantId();

        Vehicle vehicle = vehicleRepository.findByVehicleIdAndTenantId(vehicleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        boolean previousVisibility = vehicle.isPubliclyVisible();

        if (previousVisibility == publiclyVisible) {
            return vehicle;
        }

        vehicle.setPubliclyVisible(publiclyVisible);

        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        auditLogService.record("VEHICLE_PUBLICATION_UPDATED", "VEHICLE", savedVehicle.getVehicleId(),
                "publiclyVisible: " + previousVisibility + " -> " + publiclyVisible);

        return savedVehicle;
    }

    public Vehicle getVehicleById(Long vehicleId) {

        Long tenantId = TenantContext.requireTenantId();

        return vehicleRepository.findByVehicleIdAndTenantId(vehicleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
    }

    @Transactional
    public Vehicle getVehicleByIdForUpdate(Long vehicleId) {

        Long tenantId = TenantContext.requireTenantId();

        return vehicleRepository.findByVehicleIdAndTenantIdForUpdate(vehicleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
    }

    @Transactional
    public Vehicle updateVehicle(Long vehicleId, Vehicle updatedVehicle) {
        return updateVehicle(vehicleId, updatedVehicle, true);
    }

    /** SaleService records sale-triggered status changes in its own audit event. */
    public Vehicle updateVehicleFromSale(Long vehicleId, Vehicle updatedVehicle) {
        return updateVehicle(vehicleId, updatedVehicle, false);
    }

    private Vehicle updateVehicle(Long vehicleId, Vehicle updatedVehicle, boolean recordAudit) {

        Long tenantId = TenantContext.requireTenantId();

        Vehicle existingVehicle = vehicleRepository.findByVehicleIdAndTenantId(vehicleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        if (!existingVehicle.getRegistrationNumber().equals(updatedVehicle.getRegistrationNumber()) && vehicleRepository
                .existsByRegistrationNumberAndTenantId(updatedVehicle.getRegistrationNumber(), tenantId)) {

            throw new BusinessException("Vehicle with this registration number already exists");
        }

        String previousStatus = existingVehicle.getStatus();

        existingVehicle.setMake(updatedVehicle.getMake());
        existingVehicle.setModel(updatedVehicle.getModel());
        existingVehicle.setVariant(updatedVehicle.getVariant());
        existingVehicle.setCategory(normalizeCategory(updatedVehicle.getCategory()));
        existingVehicle.setBodyType(normalizeOptional(updatedVehicle.getBodyType()));
        existingVehicle.setOwnerType(normalizeOptional(updatedVehicle.getOwnerType()));
        existingVehicle.setYear(updatedVehicle.getYear());
        existingVehicle.setFuelType(updatedVehicle.getFuelType());
        existingVehicle.setTransmission(updatedVehicle.getTransmission());
        existingVehicle.setKilometers(updatedVehicle.getKilometers());
        existingVehicle.setPrice(updatedVehicle.getPrice());
        existingVehicle.setColor(updatedVehicle.getColor());
        existingVehicle.setDescription(normalizeOptional(updatedVehicle.getDescription()));
        existingVehicle.setRegistrationNumber(updatedVehicle.getRegistrationNumber());
        existingVehicle.setRegistrationAt(normalizeOptional(updatedVehicle.getRegistrationAt()));
        existingVehicle.setRegistrationType(normalizeOptional(updatedVehicle.getRegistrationType()));
        existingVehicle.setInsuranceType(normalizeOptional(updatedVehicle.getInsuranceType()));
        existingVehicle.setSellerNote(normalizeOptional(updatedVehicle.getSellerNote()));
        existingVehicle.setStatus(updatedVehicle.getStatus());

        Vehicle savedVehicle = vehicleRepository.save(existingVehicle);

        if (recordAudit) {
            boolean vehicleStatusChanged = statusChanged(previousStatus, savedVehicle.getStatus());
            String changeDetails = vehicleStatusChanged
                    ? "status: " + previousStatus + " -> " + savedVehicle.getStatus()
                    : "Vehicle details updated.";
            String auditAction = vehicleStatusChanged ? "VEHICLE_STATUS_CHANGED" : "VEHICLE_UPDATED";

            auditLogService.record(auditAction, "VEHICLE", savedVehicle.getVehicleId(), changeDetails);
        }

        return savedVehicle;
    }

    @Transactional
    public void deleteVehicle(Long vehicleId) {

        Long tenantId = TenantContext.requireTenantId();

        Vehicle existingVehicle = vehicleRepository.findByVehicleIdAndTenantIdForUpdate(vehicleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        vehicleImageService.deleteImagesForVehicle(existingVehicle.getVehicleId(), tenantId);
        vehicleRepository.delete(existingVehicle);

        auditLogService.record("VEHICLE_DELETED", "VEHICLE", existingVehicle.getVehicleId(),
                "status: " + existingVehicle.getStatus() + " -> DELETED");
    }

    private boolean statusChanged(String previousStatus, String currentStatus) {

        return previousStatus == null ? currentStatus != null
                : currentStatus == null || !previousStatus.equalsIgnoreCase(currentStatus);
    }

    private String normalizeCategory(String category) {
        return category == null || category.isBlank() ? null : category.trim();
    }

    private void normalizeListingFields(Vehicle vehicle) {
        vehicle.setBodyType(normalizeOptional(vehicle.getBodyType()));
        vehicle.setOwnerType(normalizeOptional(vehicle.getOwnerType()));
        vehicle.setDescription(normalizeOptional(vehicle.getDescription()));
        vehicle.setRegistrationAt(normalizeOptional(vehicle.getRegistrationAt()));
        vehicle.setRegistrationType(normalizeOptional(vehicle.getRegistrationType()));
        vehicle.setInsuranceType(normalizeOptional(vehicle.getInsuranceType()));
        vehicle.setSellerNote(normalizeOptional(vehicle.getSellerNote()));
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

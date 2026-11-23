package com.autocrm.service;

import java.util.List;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.autocrm.model.VehicleInspection;
import com.autocrm.repository.VehicleInspectionRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.TenantContext;

@Service
public class VehicleInspectionService {

    private final VehicleInspectionRepository vehicleInspectionRepository;
    private final VehicleRepository vehicleRepository;
    private final AuditLogService auditLogService;

    public VehicleInspectionService(VehicleInspectionRepository vehicleInspectionRepository,
            VehicleRepository vehicleRepository, AuditLogService auditLogService) {

        this.vehicleInspectionRepository = vehicleInspectionRepository;
        this.vehicleRepository = vehicleRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public VehicleInspection createInspection(VehicleInspection inspection) {

        Long tenantId = TenantContext.requireTenantId();
        var vehicle = vehicleRepository.findByVehicleIdAndTenantId(inspection.getVehicleId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        inspection.setInspectionId(null);
        inspection.setVehicleId(vehicle.getVehicleId());
        inspection.setTenantId(tenantId);
        inspection.setInspectorEmail(currentActorEmail());

        VehicleInspection savedInspection = vehicleInspectionRepository.save(inspection);
        String status = StringUtils.hasText(savedInspection.getInspectionStatus())
                ? savedInspection.getInspectionStatus().trim()
                : "Not recorded";
        auditLogService.record("VEHICLE_INSPECTION_CREATED", "VEHICLE", vehicle.getVehicleId(),
                "Inspection #" + savedInspection.getInspectionId() + " recorded; status: " + status);
        return savedInspection;
    }

    @Transactional(readOnly = true)
    public List<VehicleInspection> getInspectionsForVehicle(Long vehicleId) {
        Long tenantId = TenantContext.requireTenantId();
        vehicleRepository.findByVehicleIdAndTenantId(vehicleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        return vehicleInspectionRepository
                .findByVehicleIdAndTenantIdOrderByInspectionDateDescInspectionIdDesc(vehicleId, tenantId);
    }

    private String currentActorEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || !StringUtils.hasText(authentication.getName())) {
            throw new IllegalStateException("Cannot create an inspection without an authenticated inspector");
        }
        return authentication.getName();
    }

    public List<VehicleInspection> getAllInspections() {

        Long tenantId = TenantContext.requireTenantId();

        return vehicleInspectionRepository.findByTenantId(tenantId);
    }

    public VehicleInspection getInspectionById(Long inspectionId) {

        Long tenantId = TenantContext.requireTenantId();

        return vehicleInspectionRepository.findByInspectionIdAndTenantId(inspectionId, tenantId)
                .orElseThrow(() -> new RuntimeException("Vehicle inspection not found"));
    }
}

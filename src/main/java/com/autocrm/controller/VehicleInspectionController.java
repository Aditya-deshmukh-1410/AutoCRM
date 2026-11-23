package com.autocrm.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.autocrm.model.VehicleInspection;
import com.autocrm.service.VehicleInspectionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/vehicle-inspections")
public class VehicleInspectionController {

    private final VehicleInspectionService vehicleInspectionService;

    public VehicleInspectionController(VehicleInspectionService vehicleInspectionService) {
        this.vehicleInspectionService = vehicleInspectionService;
    }

    @PostMapping
    public VehicleInspection createInspection(@Valid @RequestBody VehicleInspection inspection) {

        return vehicleInspectionService.createInspection(inspection);
    }

    @GetMapping
    public List<VehicleInspection> getAllInspections() {

        return vehicleInspectionService.getAllInspections();
    }

    @GetMapping("/vehicle/{vehicleId}")
    public List<VehicleInspection> getInspectionsForVehicle(@PathVariable Long vehicleId) {
        return vehicleInspectionService.getInspectionsForVehicle(vehicleId);
    }

    @GetMapping("/{inspectionId}")
    public VehicleInspection getInspectionById(@PathVariable Long inspectionId) {

        return vehicleInspectionService.getInspectionById(inspectionId);
    }
}
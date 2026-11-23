package com.autocrm.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.autocrm.exception.BusinessException;
import com.autocrm.model.Sale;
import com.autocrm.model.Vehicle;
import com.autocrm.security.JwtService;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.service.SaleService;
import com.autocrm.service.VehicleImageService;
import com.autocrm.service.VehicleService;

@WebMvcTest(controllers = { VehicleController.class, SaleController.class })
@AutoConfigureMockMvc(addFilters = false)
class BusinessErrorMappingTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private AppUserRepository appUsers;
    @MockitoBean private VehicleService vehicleService;
    @MockitoBean private VehicleImageService vehicleImageService;
    @MockitoBean private SaleService saleService;

    @Test
    void duplicateVehicleRegistrationConflictMapsToHttp409() throws Exception {
        when(vehicleService.createVehicle(any(Vehicle.class)))
                .thenThrow(new BusinessException("Vehicle with this registration number already exists"));

        mockMvc.perform(post("/api/vehicles").contentType(MediaType.APPLICATION_JSON).content(vehicleJson()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Vehicle with this registration number already exists"));
    }

    @Test
    void unavailableVehicleConflictMapsTo409ButMissingVehicleRemains404() throws Exception {
        when(saleService.createSale(any(Sale.class)))
                .thenThrow(new BusinessException("Vehicle is not available for sale"));
        mockMvc.perform(post("/api/sales").contentType(MediaType.APPLICATION_JSON).content(saleJson()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Vehicle is not available for sale"));

        when(saleService.createSale(any(Sale.class))).thenThrow(new RuntimeException("Vehicle not found"));
        mockMvc.perform(post("/api/sales").contentType(MediaType.APPLICATION_JSON).content(saleJson()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Vehicle not found"));
    }

    private String vehicleJson() {
        return "{\"make\":\"Make\",\"model\":\"Model\",\"year\":2020,\"fuelType\":\"PETROL\","
                + "\"transmission\":\"MANUAL\",\"kilometers\":100,\"price\":10000,"
                + "\"registrationNumber\":\"ABC123\",\"status\":\"AVAILABLE\"}";
    }

    private String saleJson() {
        return "{\"customerId\":1,\"vehicleId\":2,\"saleDate\":\"2030-01-01\",\"salePrice\":1000,"
                + "\"paymentStatus\":\"PENDING\",\"saleStatus\":\"COMPLETED\"}";
    }
}

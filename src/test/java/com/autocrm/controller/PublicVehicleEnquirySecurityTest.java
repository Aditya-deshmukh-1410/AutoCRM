package com.autocrm.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.autocrm.config.SecurityConfig;
import com.autocrm.dto.PublicVehicleEnquiryRequest;
import com.autocrm.dto.PublicVehicleEnquiryResponse;
import com.autocrm.dto.PublicTestDriveBookingRequest;
import com.autocrm.dto.PublicTestDriveBookingResponse;
import com.autocrm.security.JwtService;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.service.DealershipProfileService;
import com.autocrm.service.PublicVehicleEnquiryService;
import com.autocrm.service.PublicTestDriveBookingService;
import com.autocrm.service.VehicleImageService;
import com.autocrm.service.VehicleService;

@WebMvcTest(PublicVehicleController.class)
@ImportAutoConfiguration({ SecurityAutoConfiguration.class, ServletWebSecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class })
@Import(SecurityConfig.class)
class PublicVehicleEnquirySecurityTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private AppUserRepository users;
    @MockitoBean private VehicleService vehicleService;
    @MockitoBean private VehicleImageService vehicleImageService;
    @MockitoBean private PublicVehicleEnquiryService publicVehicleEnquiryService;
    @MockitoBean private PublicTestDriveBookingService publicTestDriveBookingService;
    @MockitoBean private DealershipProfileService dealershipProfileService;

    @Test
    void internalCustomerAndLeadEndpointsStillRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/customers")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/leads").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void exactPublicEnquiryRouteIsAllowedAndReturnsNoCrmIds() throws Exception {
        when(publicVehicleEnquiryService.submit(eq(7L), any(PublicVehicleEnquiryRequest.class)))
                .thenReturn(new PublicVehicleEnquiryResponse("Thanks. The dealership will contact you."));

        mockMvc.perform(post("/api/public/vehicles/7/enquiries")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Visitor\",\"phone\":\"1234567890\",\"email\":\"visitor@example.com\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Thanks. The dealership will contact you."))
                .andExpect(jsonPath("$.customerId").doesNotExist())
                .andExpect(jsonPath("$.leadId").doesNotExist());
    }

    @Test
    void exactPublicTestDriveRouteIsAllowedAndValidatesBookingInput() throws Exception {
        when(publicTestDriveBookingService.submit(eq(7L), any(PublicTestDriveBookingRequest.class)))
                .thenReturn(new PublicTestDriveBookingResponse("The dealership will confirm your test-drive appointment."));

        mockMvc.perform(post("/api/public/vehicles/7/test-drives")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Visitor\",\"phone\":\"1234567890\",\"email\":\"visitor@example.com\",\"scheduledDateTime\":\"2026-11-01T14:30:00\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("The dealership will confirm your test-drive appointment."))
                .andExpect(jsonPath("$.testDriveId").doesNotExist());

        mockMvc.perform(post("/api/public/vehicles/7/test-drives")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Visitor\",\"phone\":\"1234567890\",\"email\":\"visitor@example.com\"}"))
                .andExpect(status().isBadRequest());
    }
}

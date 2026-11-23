package com.autocrm.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.autocrm.service.ActivityService;
import com.autocrm.service.AuthService;
import com.autocrm.service.EmailVerificationService;
import com.autocrm.service.LeadService;
import com.autocrm.service.PasswordResetService;
import com.autocrm.service.SaleService;
import com.autocrm.service.TestDriveService;
import com.autocrm.security.JwtService;
import com.autocrm.repository.AppUserRepository;

@WebMvcTest(controllers = { ActivityController.class, LeadController.class, TestDriveController.class,
        SaleController.class, AuthController.class })
@AutoConfigureMockMvc(addFilters = false)
class RequestValidationTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private AppUserRepository appUsers;
    @MockitoBean private ActivityService activityService;
    @MockitoBean private LeadService leadService;
    @MockitoBean private TestDriveService testDriveService;
    @MockitoBean private SaleService saleService;
    @MockitoBean private AuthService authService;
    @MockitoBean private EmailVerificationService emailVerificationService;
    @MockitoBean private PasswordResetService passwordResetService;

    @Test
    void activityRequiresPositiveCustomerAndLeadIdsBeforeCallingService() throws Exception {
        mockMvc.perform(post("/api/activities").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.customerId").exists())
                .andExpect(jsonPath("$.leadId").exists());
        mockMvc.perform(post("/api/activities").contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\":0,\"leadId\":-1}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(activityService);
    }

    @Test
    void leadTestDriveAndSaleRejectNonPositiveRelationshipIds() throws Exception {
        mockMvc.perform(post("/api/leads").contentType(MediaType.APPLICATION_JSON)
                .content("{\"source\":\"WEB\",\"status\":\"NEW\",\"interestedVehicle\":\"Car\",\"customerId\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.customerId").exists());

        mockMvc.perform(post("/api/test-drives").contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\":0,\"vehicleId\":1,\"scheduledDateTime\":\"2030-01-01T10:00:00\",\"status\":\"SCHEDULED\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.customerId").exists());
        mockMvc.perform(post("/api/test-drives").contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\":1,\"vehicleId\":-1,\"scheduledDateTime\":\"2030-01-01T10:00:00\",\"status\":\"SCHEDULED\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.vehicleId").exists());

        mockMvc.perform(post("/api/sales").contentType(MediaType.APPLICATION_JSON)
                .content(saleJson(0, 1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.customerId").exists());
        mockMvc.perform(post("/api/sales").contentType(MediaType.APPLICATION_JSON)
                .content(saleJson(1, 0)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.vehicleId").exists());

        verifyNoInteractions(leadService, testDriveService, saleService);
    }

    @Test
    void assignmentIdsAreValidatedBeforeAssignmentServiceMethods() throws Exception {
        mockMvc.perform(put("/api/leads/8/assignment").contentType(MediaType.APPLICATION_JSON)
                .content("{\"assigneeId\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.assigneeId").exists());
        mockMvc.perform(put("/api/activities/8/assignment").contentType(MediaType.APPLICATION_JSON)
                .content("{\"assigneeId\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.assigneeId").exists());
        mockMvc.perform(put("/api/test-drives/8/assignment").contentType(MediaType.APPLICATION_JSON)
                .content("{\"assigneeId\":-1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.assigneeId").exists());

        verifyNoInteractions(leadService, activityService, testDriveService);
    }

    @Test
    void registrationIsValidatedButSendOtpStillAcceptsItsEmailOnlyPayload() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Example\",\"email\":\"invalid\",\"password\":\"secret\",\"phone\":\"123\",\"showroomName\":\"Showroom\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.email").exists());
        verifyNoInteractions(authService);

        mockMvc.perform(post("/api/auth/send-otp").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"visitor@example.test\"}"))
                .andExpect(status().isOk());
        verify(emailVerificationService).generateOtp("visitor@example.test");
    }

    private String saleJson(long customerId, long vehicleId) {
        return "{\"customerId\":" + customerId + ",\"vehicleId\":" + vehicleId
                + ",\"saleDate\":\"2030-01-01\",\"salePrice\":1000,\"paymentStatus\":\"PENDING\","
                + "\"saleStatus\":\"DRAFT\"}";
    }
}

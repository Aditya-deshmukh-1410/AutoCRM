package com.autocrm.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
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

import com.autocrm.model.Customer;
import com.autocrm.model.Finance;
import com.autocrm.security.JwtService;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.service.CustomerService;
import com.autocrm.service.FinanceService;

@WebMvcTest(controllers = { CustomerController.class, FinanceController.class })
@AutoConfigureMockMvc(addFilters = false)
class CustomerFinanceValidationTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private AppUserRepository appUsers;
    @MockitoBean private CustomerService customerService;
    @MockitoBean private FinanceService financeService;

    @Test
    void validCustomerCreateAndUpdateRequestsReachService() throws Exception {
        when(customerService.createCustomer(any(Customer.class))).thenAnswer(call -> call.getArgument(0));
        when(customerService.updateCustomer(org.mockito.ArgumentMatchers.eq(9L), any(Customer.class)))
                .thenAnswer(call -> call.getArgument(1));
        String customer = "{\"name\":\"Customer\",\"email\":\"customer@example.com\",\"phone\":\"1234567890\"}";

        mockMvc.perform(post("/api/customers").contentType(MediaType.APPLICATION_JSON).content(customer))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/customers/9").contentType(MediaType.APPLICATION_JSON).content(customer))
                .andExpect(status().isOk());

        verify(customerService).createCustomer(any(Customer.class));
        verify(customerService).updateCustomer(org.mockito.ArgumentMatchers.eq(9L), any(Customer.class));
    }

    @Test
    void invalidCustomerFieldsAreReportedForCreateAndUpdate() throws Exception {
        String invalidCustomer = "{\"name\":\" \",\"email\":\"not-an-email\",\"phone\":\"\"}";

        mockMvc.perform(post("/api/customers").contentType(MediaType.APPLICATION_JSON).content(invalidCustomer))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.name").value("Name is required"))
                .andExpect(jsonPath("$.email").value("Invalid email format"))
                .andExpect(jsonPath("$.phone").value("Phone is required"));
        mockMvc.perform(put("/api/customers/9").contentType(MediaType.APPLICATION_JSON).content(invalidCustomer))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(customerService);
    }

    @Test
    void financeAcceptsZeroDownPaymentZeroInterestAndMinimumPositiveValues() throws Exception {
        when(financeService.createFinance(any(Finance.class))).thenAnswer(call -> call.getArgument(0));
        String boundaryFinance = financeJson("1", "2", "0.001", "0", "0", "1");

        mockMvc.perform(post("/api/finance").contentType(MediaType.APPLICATION_JSON).content(boundaryFinance))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/finance/9").contentType(MediaType.APPLICATION_JSON).content(boundaryFinance))
                .andExpect(status().isOk());

        verify(financeService).createFinance(any(Finance.class));
        verify(financeService).updateFinance(org.mockito.ArgumentMatchers.eq(9L), any(Finance.class));
    }

    @Test
    void financeRejectsMissingAndOutOfRangeFieldValues() throws Exception {
        assertFinanceFieldRejected(financeJson("null", "2", "100", "0", "0", "1"), "saleId");
        assertFinanceFieldRejected(financeJson("0", "2", "100", "0", "0", "1"), "saleId");
        assertFinanceFieldRejected(financeJson("1", "null", "100", "0", "0", "1"), "customerId");
        assertFinanceFieldRejected(financeJson("1", "0", "100", "0", "0", "1"), "customerId");
        assertFinanceFieldRejected(financeJson("1", "2", "null", "0", "0", "1"), "loanAmount");
        assertFinanceFieldRejected(financeJson("1", "2", "0", "0", "0", "1"), "loanAmount");
        assertFinanceFieldRejected(financeJson("1", "2", "100", "null", "0", "1"), "downPayment");
        assertFinanceFieldRejected(financeJson("1", "2", "100", "-0.01", "0", "1"), "downPayment");
        assertFinanceFieldRejected(financeJson("1", "2", "100", "0", "null", "1"), "interestRate");
        assertFinanceFieldRejected(financeJson("1", "2", "100", "0", "-0.01", "1"), "interestRate");
        assertFinanceFieldRejected(financeJson("1", "2", "100", "0", "0", "null"), "tenureMonths");
        assertFinanceFieldRejected(financeJson("1", "2", "100", "0", "0", "0"), "tenureMonths");
        assertFinanceFieldRejected(financeJson("1", "2", "100", "0", "0", "-1"), "tenureMonths");
        mockMvc.perform(put("/api/finance/9").contentType(MediaType.APPLICATION_JSON)
                .content(financeJson("1", "2", "0", "0", "0", "1")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.loanAmount").exists());

        verifyNoInteractions(financeService);
    }

    private void assertFinanceFieldRejected(String body, String field) throws Exception {
        mockMvc.perform(post("/api/finance").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$." + field).exists());
    }

    private String financeJson(String saleId, String customerId, String loanAmount, String downPayment,
            String interestRate, String tenureMonths) {
        return "{\"saleId\":" + saleId + ",\"customerId\":" + customerId + ",\"loanAmount\":"
                + loanAmount + ",\"downPayment\":" + downPayment + ",\"interestRate\":" + interestRate
                + ",\"tenureMonths\":" + tenureMonths + ",\"financeStatus\":\"ACTIVE\"}";
    }
}

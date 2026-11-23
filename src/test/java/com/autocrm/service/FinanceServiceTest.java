package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.autocrm.exception.BusinessException;
import com.autocrm.model.Customer;
import com.autocrm.model.Finance;
import com.autocrm.model.Sale;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.FinanceRepository;
import com.autocrm.repository.SaleRepository;
import com.autocrm.security.TenantContext;

@ExtendWith(MockitoExtension.class)
class FinanceServiceTest {

    private static final Long TENANT_ID = 41L;
    private static final Long CUSTOMER_ID = 51L;
    private static final Long OTHER_CUSTOMER_ID = 52L;
    private static final Long SALE_ID = 61L;
    private static final Long OTHER_SALE_ID = 62L;

    @Mock private FinanceRepository financeRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private SaleRepository saleRepository;
    @Mock private AuditLogService auditLogService;

    private FinanceService service;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TENANT_ID);
        service = new FinanceService(financeRepository, customerRepository, saleRepository, auditLogService);
    }

    @AfterEach
    void clearTenantContext() {
        TenantContext.clear();
    }

    @Test
    void createsFinanceWhenSaleAndFinanceReferToSameCustomer() {
        Finance finance = finance(CUSTOMER_ID, SALE_ID);
        when(customerRepository.findByCustomerIdAndTenantId(CUSTOMER_ID, TENANT_ID))
                .thenReturn(Optional.of(customer(CUSTOMER_ID)));
        when(saleRepository.findBySaleIdAndTenantId(SALE_ID, TENANT_ID))
                .thenReturn(Optional.of(sale(SALE_ID, CUSTOMER_ID)));
        when(financeRepository.save(any(Finance.class))).thenAnswer(invocation -> {
            Finance saved = invocation.getArgument(0);
            saved.setFinanceId(81L);
            return saved;
        });

        Finance saved = service.createFinance(finance);

        assertEquals(TENANT_ID, saved.getTenantId());
        assertEquals(CUSTOMER_ID, saved.getCustomerId());
        assertEquals(SALE_ID, saved.getSaleId());
        assertEquals(new BigDecimal("8884.88"), saved.getMonthlyEMI());
        verify(financeRepository).save(finance);
        verify(auditLogService).record("FINANCE_CREATED", "FINANCE", 81L,
                "Finance record created for sale #61; status: ACTIVE");
    }

    @Test
    void calculatesEmiByStraightDivisionWhenInterestRateIsZero() {
        Finance finance = finance(CUSTOMER_ID, SALE_ID);
        finance.setLoanAmount(new BigDecimal("120000"));
        finance.setInterestRate(BigDecimal.ZERO);
        finance.setTenureMonths(12);
        when(customerRepository.findByCustomerIdAndTenantId(CUSTOMER_ID, TENANT_ID))
                .thenReturn(Optional.of(customer(CUSTOMER_ID)));
        when(saleRepository.findBySaleIdAndTenantId(SALE_ID, TENANT_ID))
                .thenReturn(Optional.of(sale(SALE_ID, CUSTOMER_ID)));
        when(financeRepository.save(any(Finance.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Finance saved = service.createFinance(finance);

        assertEquals(new BigDecimal("10000.00"), saved.getMonthlyEMI());
    }

    @Test
    void rejectsFinanceCreationWhenSaleBelongsToAnotherCustomer() {
        Finance finance = finance(CUSTOMER_ID, SALE_ID);
        when(customerRepository.findByCustomerIdAndTenantId(CUSTOMER_ID, TENANT_ID))
                .thenReturn(Optional.of(customer(CUSTOMER_ID)));
        when(saleRepository.findBySaleIdAndTenantId(SALE_ID, TENANT_ID))
                .thenReturn(Optional.of(sale(SALE_ID, OTHER_CUSTOMER_ID)));

        BusinessException error = assertThrows(BusinessException.class, () -> service.createFinance(finance));

        assertEquals("Sale does not belong to selected customer", error.getMessage());
        verify(financeRepository, never()).save(any(Finance.class));
        verify(auditLogService, never()).record(any(), any(), any(), any());
    }

    @Test
    void updatesFinanceWhenSaleAndFinanceReferToSameCustomer() {
        Finance existing = finance(OTHER_CUSTOMER_ID, OTHER_SALE_ID);
        existing.setFinanceId(71L);
        existing.setTenantId(TENANT_ID);
        Finance update = finance(CUSTOMER_ID, SALE_ID);
        when(financeRepository.findByFinanceIdAndTenantId(71L, TENANT_ID)).thenReturn(Optional.of(existing));
        when(customerRepository.findByCustomerIdAndTenantId(CUSTOMER_ID, TENANT_ID))
                .thenReturn(Optional.of(customer(CUSTOMER_ID)));
        when(saleRepository.findBySaleIdAndTenantId(SALE_ID, TENANT_ID))
                .thenReturn(Optional.of(sale(SALE_ID, CUSTOMER_ID)));
        when(financeRepository.save(existing)).thenReturn(existing);

        Finance saved = service.updateFinance(71L, update);

        assertEquals(TENANT_ID, saved.getTenantId());
        assertEquals(CUSTOMER_ID, saved.getCustomerId());
        assertEquals(SALE_ID, saved.getSaleId());
        verify(financeRepository).save(existing);
        verify(auditLogService).record("FINANCE_UPDATED", "FINANCE", 71L,
                "Finance record fields updated; status: ACTIVE -> ACTIVE");
    }

    @Test
    void rejectsFinanceUpdateWhenSaleBelongsToAnotherCustomer() {
        Finance existing = finance(OTHER_CUSTOMER_ID, OTHER_SALE_ID);
        existing.setFinanceId(71L);
        existing.setTenantId(TENANT_ID);
        Finance update = finance(CUSTOMER_ID, SALE_ID);
        when(financeRepository.findByFinanceIdAndTenantId(71L, TENANT_ID)).thenReturn(Optional.of(existing));
        when(customerRepository.findByCustomerIdAndTenantId(CUSTOMER_ID, TENANT_ID))
                .thenReturn(Optional.of(customer(CUSTOMER_ID)));
        when(saleRepository.findBySaleIdAndTenantId(SALE_ID, TENANT_ID))
                .thenReturn(Optional.of(sale(SALE_ID, OTHER_CUSTOMER_ID)));

        BusinessException error = assertThrows(BusinessException.class, () -> service.updateFinance(71L, update));

        assertEquals("Sale does not belong to selected customer", error.getMessage());
        assertEquals(OTHER_CUSTOMER_ID, existing.getCustomerId());
        assertEquals(OTHER_SALE_ID, existing.getSaleId());
        verify(financeRepository, never()).save(any(Finance.class));
        verify(auditLogService, never()).record(any(), any(), any(), any());
    }

    private Finance finance(Long customerId, Long saleId) {
        Finance finance = new Finance();
        finance.setCustomerId(customerId);
        finance.setSaleId(saleId);
        finance.setLoanAmount(new BigDecimal("100000"));
        finance.setDownPayment(new BigDecimal("10000"));
        finance.setInterestRate(new BigDecimal("12"));
        finance.setTenureMonths(12);
        finance.setFinanceStatus("ACTIVE");
        return finance;
    }

    private Customer customer(Long id) {
        Customer customer = new Customer();
        customer.setCustomerId(id);
        customer.setTenantId(TENANT_ID);
        return customer;
    }

    private Sale sale(Long id, Long customerId) {
        Sale sale = new Sale();
        sale.setSaleId(id);
        sale.setCustomerId(customerId);
        sale.setTenantId(TENANT_ID);
        return sale;
    }
}

package com.autocrm.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.exception.BusinessException;
import com.autocrm.model.Finance;
import com.autocrm.model.Sale;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.FinanceRepository;
import com.autocrm.repository.SaleRepository;
import com.autocrm.security.TenantContext;

@Service
public class FinanceService {

    private final FinanceRepository financeRepository;
    private final CustomerRepository customerRepository;
    private final SaleRepository saleRepository;
    private final AuditLogService auditLogService;

    public FinanceService(FinanceRepository financeRepository, CustomerRepository customerRepository,
            SaleRepository saleRepository, AuditLogService auditLogService) {

        this.financeRepository = financeRepository;
        this.customerRepository = customerRepository;
        this.saleRepository = saleRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public Finance createFinance(Finance finance) {

        Long tenantId = TenantContext.requireTenantId();

        customerRepository.findByCustomerIdAndTenantId(finance.getCustomerId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        Sale sale = saleRepository.findBySaleIdAndTenantId(finance.getSaleId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Sale not found"));
        if (!Objects.equals(sale.getCustomerId(), finance.getCustomerId())) {
            throw new BusinessException("Sale does not belong to selected customer");
        }

        finance.setFinanceId(null);
        finance.setTenantId(tenantId);

        BigDecimal emi = calculateEMI(finance.getLoanAmount(), finance.getInterestRate(), finance.getTenureMonths());

        finance.setMonthlyEMI(emi);

        Finance savedFinance = financeRepository.save(finance);
        auditLogService.record("FINANCE_CREATED", "FINANCE", savedFinance.getFinanceId(),
                "Finance record created for sale #" + savedFinance.getSaleId() + "; status: " + savedFinance.getFinanceStatus());
        return savedFinance;
    }

    public List<Finance> getAllFinance() {

        Long tenantId = TenantContext.requireTenantId();

        return financeRepository.findByTenantId(tenantId);
    }

    public Finance getFinanceById(Long financeId) {

        Long tenantId = TenantContext.requireTenantId();

        return financeRepository.findByFinanceIdAndTenantId(financeId, tenantId)
                .orElseThrow(() -> new RuntimeException("Finance record not found"));
    }

    @Transactional
    public Finance updateFinance(Long financeId, Finance updatedFinance) {

        Long tenantId = TenantContext.requireTenantId();

        Finance existingFinance = financeRepository.findByFinanceIdAndTenantId(financeId, tenantId)
                .orElseThrow(() -> new RuntimeException("Finance record not found"));

        customerRepository.findByCustomerIdAndTenantId(updatedFinance.getCustomerId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        Sale sale = saleRepository
                .findBySaleIdAndTenantId(updatedFinance.getSaleId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Sale not found"));
        if (!Objects.equals(sale.getCustomerId(), updatedFinance.getCustomerId())) {
            throw new BusinessException("Sale does not belong to selected customer");
        }

        String previousStatus = existingFinance.getFinanceStatus();
        existingFinance.setSaleId(updatedFinance.getSaleId());
        existingFinance.setCustomerId(updatedFinance.getCustomerId());
        existingFinance.setLoanAmount(updatedFinance.getLoanAmount());
        existingFinance.setDownPayment(updatedFinance.getDownPayment());
        existingFinance.setInterestRate(updatedFinance.getInterestRate());
        existingFinance.setTenureMonths(updatedFinance.getTenureMonths());
        existingFinance.setFinanceStatus(updatedFinance.getFinanceStatus());

        BigDecimal emi = calculateEMI(existingFinance.getLoanAmount(), existingFinance.getInterestRate(),
                existingFinance.getTenureMonths());

        existingFinance.setMonthlyEMI(emi);

        Finance savedFinance = financeRepository.save(existingFinance);
        String auditAction = java.util.Objects.equals(previousStatus, savedFinance.getFinanceStatus())
                ? "FINANCE_UPDATED" : "FINANCE_STATUS_CHANGED";
        auditLogService.record(auditAction, "FINANCE", savedFinance.getFinanceId(),
                "Finance record fields updated; status: " + previousStatus + " -> " + savedFinance.getFinanceStatus());
        return savedFinance;
    }

    @Transactional
    public void deleteFinance(Long financeId) {

        Long tenantId = TenantContext.requireTenantId();

        Finance existingFinance = financeRepository.findByFinanceIdAndTenantId(financeId, tenantId)
                .orElseThrow(() -> new RuntimeException("Finance record not found"));

        financeRepository.delete(existingFinance);
        auditLogService.record("FINANCE_DELETED", "FINANCE", existingFinance.getFinanceId(),
                "status: " + existingFinance.getFinanceStatus() + " -> DELETED");
    }

    private BigDecimal calculateEMI(BigDecimal loanAmount, BigDecimal annualInterestRate, Integer tenureMonths) {

        double principal = loanAmount.doubleValue();

        double monthlyRate = annualInterestRate.doubleValue() / 12 / 100;

        int months = tenureMonths;

        double emi;

        if (monthlyRate == 0) {
            emi = principal / months;
        } else {
            emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
        }

        return BigDecimal.valueOf(emi).setScale(2, RoundingMode.HALF_UP);
    }
}

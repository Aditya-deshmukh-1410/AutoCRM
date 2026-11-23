package com.autocrm.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.autocrm.model.Finance;
import com.autocrm.service.FinanceService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    private final FinanceService financeService;

    public FinanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @PostMapping
    public Finance createFinance(@Valid @RequestBody Finance finance) {
        return financeService.createFinance(finance);
    }

    @GetMapping
    public List<Finance> getAllFinance() {
        return financeService.getAllFinance();
    }

    @GetMapping("/{financeId}")
    public Finance getFinanceById(@PathVariable Long financeId) {
        return financeService.getFinanceById(financeId);
    }

    @PutMapping("/{financeId}")
    public Finance updateFinance(@PathVariable Long financeId, @Valid @RequestBody Finance finance) {

        return financeService.updateFinance(financeId, finance);
    }

    @DeleteMapping("/{financeId}")
    public String deleteFinance(@PathVariable Long financeId) {

        financeService.deleteFinance(financeId);

        return "Finance record deleted successfully";
    }
}

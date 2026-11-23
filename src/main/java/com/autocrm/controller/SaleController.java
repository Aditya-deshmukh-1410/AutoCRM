package com.autocrm.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.autocrm.model.Sale;
import com.autocrm.service.SaleService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/sales")
public class SaleController {

    private final SaleService saleService;

    public SaleController(SaleService saleService) {
        this.saleService = saleService;
    }

    @PostMapping
    public Sale createSale(@Valid @RequestBody Sale sale) {
        return saleService.createSale(sale);
    }

    @GetMapping
    public List<Sale> getAllSales() {
        return saleService.getAllSales();
    }

    @GetMapping("/{saleId}")
    public Sale getSaleById(@PathVariable Long saleId) {
        return saleService.getSaleById(saleId);
    }

    @PutMapping("/{saleId}")
    public Sale updateSale(@PathVariable Long saleId, @Valid @RequestBody Sale sale) {

        return saleService.updateSale(saleId, sale);
    }

    @DeleteMapping("/{saleId}")
    public String deleteSale(@PathVariable Long saleId) {

        saleService.deleteSale(saleId);

        return "Sale deleted successfully";
    }
}
package com.autocrm.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "dealership_option", uniqueConstraints = @UniqueConstraint(
        name = "uk_dealership_option_tenant_type_value", columnNames = { "tenant_id", "option_type", "normalized_value" }))
public class DealershipOption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long optionId;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "option_type", nullable = false, length = 30, updatable = false)
    private DealershipOptionType optionType;

    @Column(name = "option_value", nullable = false, length = 60)
    private String value;

    @Column(name = "normalized_value", nullable = false, length = 60)
    private String normalizedValue;

    @Column(nullable = false)
    private boolean active = true;

    protected DealershipOption() { }

    public DealershipOption(Long tenantId, DealershipOptionType optionType, String value) {
        this.tenantId = tenantId;
        this.optionType = optionType;
        this.value = value;
        normalize();
    }

    @PrePersist @PreUpdate
    private void normalize() {
        if (value != null) normalizedValue = value.trim().toLowerCase(java.util.Locale.ROOT);
    }

    public Long getOptionId() { return optionId; }
    public Long getTenantId() { return tenantId; }
    public DealershipOptionType getOptionType() { return optionType; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; normalize(); }
    public String getNormalizedValue() { return normalizedValue; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}

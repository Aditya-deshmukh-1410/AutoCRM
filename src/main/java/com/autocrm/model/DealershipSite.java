package com.autocrm.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "dealership_site")
public class DealershipSite {
    @Id
    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;
    @Column(nullable = false, unique = true, length = 80)
    private String slug;
    @Column(nullable = false, length = 32)
    private String templateId = "classic";
    @Column(nullable = false, columnDefinition = "text")
    private String config = "{}";
    @Column(nullable = false)
    private boolean published;

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getTemplateId() { return templateId; }
    public void setTemplateId(String templateId) { this.templateId = templateId; }
    public String getConfig() { return config; }
    public void setConfig(String config) { this.config = config; }
    public boolean isPublished() { return published; }
    public void setPublished(boolean published) { this.published = published; }
}

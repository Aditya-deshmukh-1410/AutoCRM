package com.autocrm.model;

import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "dealership_site_image")
public class DealershipSiteImage {
    @Id @Column(nullable = false, updatable = false) private UUID id;
    @Column(name = "tenant_id", nullable = false) private Long tenantId;
    @Column(name = "content_type", nullable = false, length = 30) private String contentType;
    @Column(nullable = false, columnDefinition = "bytea") private byte[] data;
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public byte[] getData() { return data; }
    public void setData(byte[] data) { this.data = data; }
}

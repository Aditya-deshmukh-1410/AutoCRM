package com.autocrm.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long auditLogId;

    @Column(nullable = false, updatable = false)
    private Long tenantId;

    @Column(nullable = false, updatable = false, length = 320)
    private String actorEmail;

    @Column(nullable = false, updatable = false, length = 40)
    private String action;

    @Column(nullable = false, updatable = false, length = 100)
    private String entityType;

    @Column(nullable = false, updatable = false)
    private Long entityId;

    @Column(nullable = false, updatable = false)
    private Instant occurredAt;

    @Column(length = 2000, updatable = false)
    private String changeDetails;

    protected AuditLog() {
    }

    public AuditLog(Long tenantId, String actorEmail, String action, String entityType, Long entityId,
            String changeDetails) {
        this.tenantId = tenantId;
        this.actorEmail = actorEmail;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.changeDetails = changeDetails;
    }

    public Long getAuditLogId() {
        return auditLogId;
    }

    public Long getTenantId() {
        return tenantId;
    }

    public String getActorEmail() {
        return actorEmail;
    }

    public String getAction() {
        return action;
    }

    public String getEntityType() {
        return entityType;
    }

    public Long getEntityId() {
        return entityId;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public String getChangeDetails() {
        return changeDetails;
    }

    @PrePersist
    private void setOccurredAtIfMissing() {
        if (occurredAt == null) {
            occurredAt = Instant.now();
        }
    }
}

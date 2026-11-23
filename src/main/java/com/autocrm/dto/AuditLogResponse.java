package com.autocrm.dto;

import java.time.Instant;

public class AuditLogResponse {

    private final Instant timestamp;
    private final String actorEmail;
    private final String action;
    private final String entityType;
    private final Long entityId;
    private final String changeDetails;

    public AuditLogResponse(Instant timestamp, String actorEmail, String action, String entityType, Long entityId,
            String changeDetails) {
        this.timestamp = timestamp;
        this.actorEmail = actorEmail;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.changeDetails = changeDetails;
    }

    public Instant getTimestamp() {
        return timestamp;
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

    public String getChangeDetails() {
        return changeDetails;
    }
}

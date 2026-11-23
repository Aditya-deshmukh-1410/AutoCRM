package com.autocrm.dto;

import java.util.List;

public class AuditLogPageResponse {

    private final List<AuditLogResponse> content;
    private final int page;
    private final int size;
    private final long totalElements;
    private final int totalPages;
    private final long totalEvents;
    private final long distinctEmployees;
    private final List<String> employees;
    private final List<String> actions;
    private final List<String> entityTypes;

    public AuditLogPageResponse(List<AuditLogResponse> content, int page, int size, long totalElements, int totalPages,
            long totalEvents, long distinctEmployees, List<String> employees, List<String> actions,
            List<String> entityTypes) {
        this.content = List.copyOf(content);
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.totalEvents = totalEvents;
        this.distinctEmployees = distinctEmployees;
        this.employees = List.copyOf(employees);
        this.actions = List.copyOf(actions);
        this.entityTypes = List.copyOf(entityTypes);
    }

    public List<AuditLogResponse> getContent() { return content; }
    public int getPage() { return page; }
    public int getSize() { return size; }
    public long getTotalElements() { return totalElements; }
    public int getTotalPages() { return totalPages; }
    public long getTotalEvents() { return totalEvents; }
    public long getDistinctEmployees() { return distinctEmployees; }
    public List<String> getEmployees() { return employees; }
    public List<String> getActions() { return actions; }
    public List<String> getEntityTypes() { return entityTypes; }
}

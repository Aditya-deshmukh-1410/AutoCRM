export type AuditRecord = {
  timestamp: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: number;
  changeDetails: string | null;
};

export const AUDIT_CATEGORIES = [
  { value: "VEHICLES", label: "Vehicles" },
  { value: "CUSTOMERS", label: "Customers" },
  { value: "LEADS", label: "Leads" },
  { value: "TEST_DRIVES", label: "Test Drives" },
  { value: "ACTIVITIES", label: "Activities" },
  { value: "SALES", label: "Sales" },
  { value: "FINANCE", label: "Finance" },
  { value: "USERS_ROLES", label: "Users and Roles" },
  { value: "TENANT_MANAGEMENT", label: "Tenant Management" },
  { value: "OTHER", label: "Other" },
] as const;

const CATEGORY_BY_ENTITY: Record<string, string> = {
  VEHICLE: "VEHICLES",
  CUSTOMER: "CUSTOMERS",
  LEAD: "LEADS",
  TEST_DRIVE: "TEST_DRIVES",
  ACTIVITY: "ACTIVITIES",
  SALE: "SALES",
  FINANCE: "FINANCE",
  USER: "USERS_ROLES",
  ROLE: "USERS_ROLES",
  TENANT: "TENANT_MANAGEMENT",
};

const ACTION_LABELS: Record<string, string> = {
  ACTIVITY_CREATED: "Activity recorded",
  CUSTOMER_CREATED: "Customer created",
  CUSTOMER_UPDATED: "Customer updated",
  CUSTOMER_DELETED: "Customer deleted",
  FINANCE_CREATED: "Finance record created",
  FINANCE_UPDATED: "Finance record updated",
  FINANCE_STATUS_CHANGED: "Finance status changed",
  FINANCE_DELETED: "Finance record deleted",
  LEAD_CREATED: "Lead created",
  LEAD_UPDATED: "Lead updated",
  LEAD_STATUS_CHANGED: "Lead status changed",
  LEAD_DELETED: "Lead deleted",
  SALE_CREATED: "Sale created",
  SALE_COMPLETED: "Sale completed",
  SALE_CANCELLED: "Sale cancelled",
  SALE_STATUS_CHANGED: "Sale status changed",
  SALE_UPDATED: "Sale updated",
  SALE_DELETED: "Sale deleted",
  TEST_DRIVE_SCHEDULED: "Test drive scheduled",
  TEST_DRIVE_RESCHEDULED: "Test drive rescheduled",
  TEST_DRIVE_UPDATED: "Test drive updated",
  TEST_DRIVE_STATUS_CHANGED: "Test drive status changed",
  TEST_DRIVE_DELETED: "Test drive deleted",
  USER_CREATED: "User created",
  USER_ROLE_CHANGED: "User role changed",
  VEHICLE_CREATED: "Vehicle added",
  VEHICLE_UPDATED: "Vehicle updated",
  VEHICLE_STATUS_CHANGED: "Vehicle status changed",
  VEHICLE_PUBLICATION_UPDATED: "Vehicle publication changed",
  VEHICLE_DELETED: "Vehicle deleted",
};

export function auditCategory(entityType: string): string {
  return CATEGORY_BY_ENTITY[entityType.toUpperCase()] ?? "OTHER";
}

export function auditCategoryLabel(category: string): string {
  return AUDIT_CATEGORIES.find((item) => item.value === category)?.label ?? "Other";
}

export function auditActionLabel(action: string): string {
  const knownLabel = ACTION_LABELS[action.toUpperCase()];
  if (knownLabel) return knownLabel;
  return action
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unrecognized event";
}

export function auditActorLabel(actorEmail: string): string {
  return actorEmail === "PUBLIC_SHOWROOM" ? "Public showroom visitor" : actorEmail;
}

export function parseRecordedChanges(details: string): Array<{ field: string; before: string; after: string }> {
  return details.split(";").flatMap((part) => {
    const match = part.trim().match(/^([^:]+):\s*(.*?)\s+->\s+(.*)$/);
    return match ? [{ field: match[1].trim(), before: match[2].trim(), after: match[3].trim() }] : [];
  });
}

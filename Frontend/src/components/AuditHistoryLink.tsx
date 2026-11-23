import { History } from "lucide-react";
import { Link } from "react-router-dom";

type AuditHistoryLinkProps = {
  entityType: "CUSTOMER" | "VEHICLE";
  entityId: number;
};

function isDealershipAdmin(): boolean {
  try {
    const user: unknown = JSON.parse(localStorage.getItem("autocrm_user") ?? "null");
    return typeof user === "object" && user !== null && "role" in user &&
      typeof user.role === "string" && user.role.toUpperCase() === "ADMIN";
  } catch {
    return false;
  }
}

export default function AuditHistoryLink({ entityType, entityId }: AuditHistoryLinkProps) {
  if (!isDealershipAdmin()) return null;
  const params = new URLSearchParams({ entityType, entityId: String(entityId) });

  return (
    <Link
      to={`/audit-history?${params.toString()}`}
      aria-label={`View audit history for ${entityType.toLowerCase()} ${entityId}`}
      title="View record history"
      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-brand-600/20 px-2.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      <History size={15} aria-hidden="true" />
      <span>History</span>
    </Link>
  );
}

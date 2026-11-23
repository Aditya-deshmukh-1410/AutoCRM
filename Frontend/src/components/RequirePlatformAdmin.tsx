import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  let role = "";
  try {
    const user: unknown = JSON.parse(localStorage.getItem("autocrm_user") ?? "null");
    if (typeof user === "object" && user !== null && "role" in user && typeof user.role === "string") {
      role = user.role.toUpperCase();
    }
  } catch { /* Invalid local state is handled as an unauthenticated route. */ }

  return role === "PLATFORM_ADMIN" ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

export function RequireDealershipUser({ children }: { children: ReactNode }) {
  let role = "";
  try {
    const user: unknown = JSON.parse(localStorage.getItem("autocrm_user") ?? "null");
    if (typeof user === "object" && user !== null && "role" in user && typeof user.role === "string") {
      role = user.role.toUpperCase();
    }
  } catch { /* Invalid local state is handled as an unauthenticated route. */ }

  if (role === "PLATFORM_ADMIN") return <Navigate to="/control-panel" replace />;
  return role === "ADMIN" || role === "SALES" ? <>{children}</> : <Navigate to="/login" replace />;
}

export function RequireDealershipAdmin({ children }: { children: ReactNode }) {
  let role = "";
  try {
    const user: unknown = JSON.parse(localStorage.getItem("autocrm_user") ?? "null");
    if (typeof user === "object" && user !== null && "role" in user && typeof user.role === "string") {
      role = user.role.toUpperCase();
    }
  } catch { /* Invalid local state is handled by the route guard. */ }
  return role === "ADMIN" ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

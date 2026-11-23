import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";

export default function RequireAuth({
  children,
}: {
  children: ReactNode;
}) {
  const token = localStorage.getItem("autocrm_token");
  let isValid = false;

  if (token) {
    try {
      const payload = JSON.parse(
        atob(
          token
            .split(".")[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/")
        )
      );

      // eslint-disable-next-line react-hooks/purity -- JWT expiry must be checked against the current time during render.
      const currentTime = Math.floor(Date.now() / 1000);

      if (!payload.exp || payload.exp <= currentTime) {
        isValid = false;
      } else {
        isValid = true;
      }
    } catch {
      isValid = false;
    }
  }

  useEffect(() => {
    if (token && !isValid) {
      localStorage.removeItem("autocrm_token");
    }
  }, [token, isValid]);

  if (!isValid) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

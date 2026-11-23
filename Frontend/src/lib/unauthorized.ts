let redirectStarted = false;

/** Clears an authenticated session and redirects once when a protected request expires. */
export function handleUnauthorizedResponse(response: Pick<Response, "status">): boolean {
  if (response.status !== 401) {
    return false;
  }

  localStorage.removeItem("autocrm_token");
  localStorage.removeItem("autocrm_user");

  if (!redirectStarted && window.location.pathname !== "/login") {
    redirectStarted = true;
    window.location.replace("/login");
  }

  return true;
}

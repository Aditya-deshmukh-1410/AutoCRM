export const BASE = (import.meta.env.VITE_API_URL || "")
  .replace(/\/api\/?$/, "").replace(/\/$/, "");
export const getToken = () => localStorage.getItem("autocrm_token");
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${getToken() || ""}`,
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || "Could not save website changes.");
  }
  return response.json() as Promise<T>;
}

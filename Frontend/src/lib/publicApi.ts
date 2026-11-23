import { useOutletContext } from "react-router-dom";

export const API = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "").replace(/\/$/, "");

export type Site = { showroomName: string; templateId: string; config: Record<string, string> };

export type PublicCar = {
  id: number; make: string; model: string; variant: string | null; description: string | null; year: number; kmDriven: number | null;
  fuel: string | null; transmission: string | null; bodyType: string | null; ownerType: string | null;
  color: string | null; price: number; status: string; registrationNo: string | null;
  registrationAt: string | null; registrationType: string | null; insuranceType: string | null;
  sellerNote: string | null; createdAt: string | null; photos: string[];
};

export type SiteCtx = { slug: string; site: Site; cars: PublicCar[] };
export const useSite = () => useOutletContext<SiteCtx>();

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(String(res.status));
  const value = await res.json();
  const normalize = (car: PublicCar): PublicCar => ({
    ...car, photos: car.photos.map((url) => url.startsWith("/") ? `${API}${url}` : url),
  });
  if (path.includes("/cars")) {
    return (Array.isArray(value) ? value.map(normalize) : normalize(value)) as T;
  }
  if (value?.config) {
    for (const key of ["logoUrl", "heroImage", "aboutImage"]) {
      if (value.config[key]?.startsWith("/")) value.config[key] = `${API}${value.config[key]}`;
    }
  }
  return value as T;
}

export async function postJson(path: string, body: object) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("Too many requests. Please try again later.");
  if (!res.ok) throw new Error("Could not submit. Please check your details.");
}

export const priceText = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : "₹" + new Intl.NumberFormat("en-IN").format(n);

export const carName = (c: PublicCar) => [c.year, c.make, c.model, c.variant].filter(Boolean).join(" ");
export const BUDGETS: [string, string][] = [
  ["u3", "Under ₹3 Lakh"], ["3-6", "₹3 - 6 Lakh"], ["6-10", "₹6 - 10 Lakh"], ["10-20", "₹10 - 20 Lakh"], ["20+", "Above ₹20 Lakh"],
];
export async function postForm(path: string, form: FormData) {
  const res = await fetch(`${API}${path}`, { method: "POST", body: form });
  if (res.status === 429) throw new Error("Too many requests. Please try again later.");
  if (!res.ok) {
    let msg = "Could not submit. Please check your details.";
    try { msg = (await res.json()).message || msg; } catch { /* keep default */ }
    throw new Error(msg);
  }
}

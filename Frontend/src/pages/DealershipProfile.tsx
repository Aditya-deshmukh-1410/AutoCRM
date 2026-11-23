import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { FeedbackMessage } from "../components/Feedback";
import PageHeader from "../components/PageHeader";

type Profile = { name: string; email: string; phone: string; address: string | null; logoUrl: string | null };
const API = "/api/dealership-profile";

function isAdmin() {
  try { const user: unknown = JSON.parse(localStorage.getItem("autocrm_user") ?? "null"); return typeof user === "object" && user !== null && "role" in user && user.role === "ADMIN"; }
  catch { return false; }
}

export default function DealershipProfile() {
  const admin = isAdmin();
  const [profile, setProfile] = useState<Profile>({ name: "", email: "", phone: "", address: "", logoUrl: null });
  const [logo, setLogo] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const request = async (path = "", options: RequestInit = {}) => {
    const token = localStorage.getItem("autocrm_token");
    if (!token) throw new Error("Your session has expired. Please log in again.");
    const response = await fetch(`${API}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.body instanceof FormData ? {} : options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
    const text = await response.text();
    let body: unknown;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) throw new Error(typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : `Request failed (${response.status}).`);
    return body;
  };

  useEffect(() => {
    let active = true;
    void request().then(async (data) => {
      if (!active) return;
      const value = data as Profile;
      setProfile(value);
      if (value.logoUrl) {
        const token = localStorage.getItem("autocrm_token");
        const response = await fetch(`${value.logoUrl}`, { headers: { Authorization: `Bearer ${token}` } });
        if (response.ok && active) setLogo(URL.createObjectURL(await response.blob()));
      }
    }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Could not load dealership profile."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setNotice(""); setSaving(true);
    try { setProfile(await request("", { method: "PUT", body: JSON.stringify({ name: profile.name.trim(), email: profile.email.trim(), phone: profile.phone.trim(), address: profile.address?.trim() || null }) }) as Profile); window.dispatchEvent(new Event("dealership-profile-updated")); setNotice("Dealership profile saved."); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save profile."); }
    finally { setSaving(false); }
  };
  const uploadLogo = async (file?: File) => {
    if (!file) return;
    setError(""); setNotice("");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 1_048_576) { setError("Choose a JPEG, PNG, or WebP logo up to 1 MB."); return; }
    const form = new FormData(); form.append("file", file);
    try { const updated = await request("/logo", { method: "POST", body: form }) as Profile; setProfile(updated); window.dispatchEvent(new Event("dealership-profile-updated")); setLogo(URL.createObjectURL(file)); setNotice("Logo saved."); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Could not save logo."); }
  };

  if (!admin) return <Navigate to="/dashboard" replace />;
  return <main className="crm-management-page bg-background text-foreground"><div className="mx-auto max-w-3xl px-5 py-7 sm:px-8 sm:py-9"><PageHeader title="Dealership Profile" description="Manage the business identity shown in the CRM and published showroom listings." />
    {error && <FeedbackMessage message={error} className="mb-4" />}{notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</p>}
    {loading ? <p role="status" className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">Loading profile…</p> : <section className="rounded-xl border border-brand-600/15 bg-white p-5 shadow-sm sm:p-7">
      <form onSubmit={(event) => void save(event)} className="space-y-4"><label className="block text-sm font-semibold">Dealership name<input required maxLength={120} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="input-wrap mt-1 h-11 w-full" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Contact email<input required type="email" maxLength={254} value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className="input-wrap mt-1 h-11 w-full" /></label><label className="block text-sm font-semibold">Contact phone<input required type="tel" maxLength={30} value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className="input-wrap mt-1 h-11 w-full" /></label></div><label className="block text-sm font-semibold">Address<textarea maxLength={500} rows={3} value={profile.address ?? ""} onChange={(event) => setProfile({ ...profile, address: event.target.value })} className="input-wrap mt-1 w-full py-2" /></label><button disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{saving ? "Saving…" : "Save profile"}</button></form>
      <div className="mt-7 border-t border-brand-600/10 pt-6"><h2 className="text-sm font-bold">Dealership logo</h2><div className="mt-3 flex flex-wrap items-center gap-4">{logo ? <img src={logo} alt="Dealership logo preview" className="size-20 rounded-lg border bg-white object-contain p-2" /> : <div className="grid size-20 place-items-center rounded-lg border bg-slate-50 text-xs text-slate-500">No logo</div>}<label className="cursor-pointer rounded-lg border border-brand-600/25 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">Upload logo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void uploadLogo(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label><span className="text-xs text-muted-foreground">JPEG, PNG, or WebP · max 1 MB</span></div></div>
    </section>}</div></main>;
}

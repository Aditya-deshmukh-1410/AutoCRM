import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { FeedbackMessage } from "../components/Feedback";
import PageHeader from "../components/PageHeader";

type OptionType = "LEAD_SOURCE" | "VEHICLE_CATEGORY";
type SettingOption = { optionId: number; optionType: OptionType; value: string; active: boolean };
const API = "/api/dealership-settings";

function isAdmin() {
  try { const user: unknown = JSON.parse(localStorage.getItem("autocrm_user") ?? "null"); return typeof user === "object" && user !== null && "role" in user && user.role === "ADMIN"; }
  catch { return false; }
}

export default function DealershipSettings() {
  const admin = isAdmin();
  const [options, setOptions] = useState<SettingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ id: number | null; type: OptionType; value: string } | null>(null);

  const request = async (path = "", method = "GET", body?: string) => {
    const token = localStorage.getItem("autocrm_token");
    if (!token) throw new Error("Your session has expired. Please log in again.");
    const response = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body });
    const text = await response.text();
    let payload: unknown = text;
    if (text) { try { payload = JSON.parse(text); } catch { /* Keep the text error. */ } }
    if (!response.ok) {
      const value = payload as { error?: unknown } | string;
      throw new Error(typeof value === "object" && value !== null && typeof value.error === "string" ? value.error : typeof value === "string" && value ? value : `Request failed (${response.status}).`);
    }
    return payload;
  };

  const reload = async () => {
    const data = await request() as SettingOption[];
    if (!Array.isArray(data)) throw new Error("Settings response was not valid.");
    setOptions(data);
  };

  useEffect(() => {
    let active = true;
    void request().then((data) => {
      if (!Array.isArray(data)) throw new Error("Settings response was not valid.");
      if (active) setOptions(data as SettingOption[]);
    }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Could not load settings."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const value = editing.value.trim();
    if (!value || value.length > 60) { setError("Enter an option name from 1 to 60 characters."); return; }
    setError(""); setNotice(""); setSaving(true);
    try {
      const body = JSON.stringify({ optionType: editing.type, value, active: true });
      if (editing.id === null) await request("", "POST", body);
      else await request(`/${editing.id}`, "PUT", body);
      await reload(); setEditing(null); setNotice(editing.id === null ? "Option added." : "Option updated.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save option."); }
    finally { setSaving(false); }
  };

  const retire = async (option: SettingOption) => {
    setError(""); setNotice("");
    try { await request(`/${option.optionId}`, "DELETE"); await reload(); setNotice("Option removed from new records. Existing values are preserved."); }
    catch (removeError) { setError(removeError instanceof Error ? removeError.message : "Could not remove option."); }
  };

  const startAdd = (type: OptionType) => { setError(""); setEditing({ id: null, type, value: "" }); };
  const groups = useMemo(() => [
    { type: "LEAD_SOURCE" as const, title: "Lead sources", description: "Options shown when creating a lead." },
    { type: "VEHICLE_CATEGORY" as const, title: "Vehicle categories", description: "Options used to classify inventory, separate from make, model, and status." },
  ], []);

  if (!admin) return <Navigate to="/dashboard" replace />;
  return <main className="crm-management-page bg-background text-foreground"><div className="mx-auto max-w-4xl px-5 py-7 sm:px-8 sm:py-9">
    <PageHeader title="Dealership Settings" description="Configure lead sources and vehicle categories used for new CRM records." />
    {error && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mb-4" />}{notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</p>}
    {loading ? <p role="status" className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">Loading settings…</p> : <div className="grid gap-5">{groups.map((group) => <section key={group.type} className="overflow-hidden rounded-xl border border-brand-600/15 bg-white shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-600/10 px-5 py-4"><div><h2 className="font-display text-lg font-bold text-plum-950">{group.title}</h2><p className="mt-1 text-sm text-muted-foreground">{group.description}</p></div><Button onClick={() => startAdd(group.type)} className="bg-brand-600 font-semibold text-white hover:bg-brand-700"><Plus size={16} /> Add option</Button></div>
      <ul className="divide-y divide-brand-600/10">{options.filter((option) => option.optionType === group.type).map((option) => <li key={option.optionId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><span className={`font-medium ${option.active ? "text-foreground" : "text-muted-foreground line-through"}`}>{option.value}</span>{!option.active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Removed</span>}</div><div className="flex items-center gap-2">{option.active ? <><Button variant="outline" size="icon" onClick={() => setEditing({ id: option.optionId, type: option.optionType, value: option.value })} aria-label={`Edit ${option.value}`}><Pencil size={15} /></Button><Button variant="outline" size="icon" onClick={() => void retire(option)} aria-label={`Remove ${option.value}`}><Trash2 size={15} /></Button></> : <Button variant="outline" onClick={() => setEditing({ id: option.optionId, type: option.optionType, value: option.value })}><RotateCcw size={15} /> Restore</Button>}</div></li>)}{options.filter((option) => option.optionType === group.type).length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">No options are configured.</li>}</ul>
    </section>)}</div>}
    <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Removing an option retires it instead of deleting it. It disappears from new-record choices, while existing lead sources and vehicle categories remain stored and visible. When editing a record, its existing value remains available. Keep at least one active option in each list.</p>
    {editing && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#200024]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"><section role="dialog" aria-modal="true" aria-labelledby="setting-option-title" className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-7"><h2 id="setting-option-title" className="font-display text-xl font-bold text-plum-950">{editing.id === null ? "Add" : options.find((option) => option.optionId === editing.id)?.active ? "Edit" : "Restore"} {editing.type === "LEAD_SOURCE" ? "lead source" : "vehicle category"}</h2>{error && <FeedbackMessage message={error} className="mt-4" />}<form onSubmit={(event) => void save(event)} className="mt-4 space-y-4"><label className="block text-sm font-semibold">Name<input autoFocus required maxLength={60} value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })} className="input-wrap mt-1 h-11 w-full" /></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving} className="bg-brand-600 text-white hover:bg-brand-700">{saving ? "Saving…" : "Save option"}</Button></div></form></section></div>}
  </div></main>;
}

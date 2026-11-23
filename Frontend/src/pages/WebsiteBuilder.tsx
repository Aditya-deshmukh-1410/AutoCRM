import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink, ImagePlus, Monitor, Smartphone, Tablet, Trash2 } from "lucide-react";
import { api, getToken, BASE } from "../lib/siteApi";
import type { PublicCar } from "../lib/publicApi";

type Site = { slug: string; templateId: string; config: Record<string, string>; published: boolean };

const input = "w-full rounded-lg border border-black/10 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-600";
const SWATCHES = ["#c4161c", "#1d4ed8", "#0f766e", "#7e22ce", "#ea580c", "#111827"];
const SECTIONS: [string, string][] = [
  ["showHero", "Hero banner"], ["showAbout", "About / welcome"], ["showQuick", "Quick action bar"],
  ["showStock", "Featured inventory"], ["showEmi", "EMI calculator"], ["showFooter", "Footer"],
];
const DEVICES = { desktop: "100%", tablet: "768px", mobile: "390px" } as const;

async function fetchAdminImagePreview(value: string): Promise<string | null> {
  const id = value.match(/\/public\/site-images\/([0-9a-f-]{36})$/i)?.[1];
  if (!id) return value;
  const response = await fetch(`${BASE}/api/website/images/${id}/preview`, {
    headers: { Authorization: `Bearer ${getToken() || ""}` },
  });
  if (!response.ok) return null;
  return URL.createObjectURL(await response.blob());
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/api/website/images`, {
    method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd,
  });
  if (!res.ok) {
    let msg = "Could not upload the image.";
    try { msg = (await res.json()).message || msg; } catch { /* keep default */ }
    throw new Error(msg);
  }
  return (await res.json()).url as string;
}

function Group({ title, open: initial = true, children }: { title: string; open?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initial);
  return (
    <div className="border-b border-black/10">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-4 px-5 pb-5">{children}</div>}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-brand-600" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Segment({ value, options, onChange }: {
  value: string; options: [string, string][]; onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-flow-col rounded-lg bg-slate-100 p-1">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${value === v ? "bg-white shadow" : "text-slate-500"}`}>{l}</button>
      ))}
    </div>
  );
}

function ImageField({ label, hint, value, onChange }: {
  label: string; hint: string; value?: string; onChange: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (!value) { setPreview(null); return; }
    void fetchAdminImagePreview(value).then((url) => {
      if (!active) { if (url?.startsWith("blob:")) URL.revokeObjectURL(url); return; }
      objectUrl = url?.startsWith("blob:") ? url : null;
      setPreview(url);
    }).catch(() => { if (active) setPreview(null); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [value]);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true); setErr("");
    try { onChange(await uploadImage(file)); }
    catch (e) { setErr(e instanceof Error ? e.message : "Upload failed."); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-black/20 bg-slate-50">
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="text-slate-300" />}
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => ref.current?.click()}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60">
            {busy ? "Uploading…" : value ? "Change" : "Upload"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")} className="rounded-lg border p-2 text-red-600" title="Remove"><Trash2 size={14} /></button>
          )}
        </div>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

export default function WebsiteBuilder() {
  const [site, setSite] = useState<Site | null>(null);
  const [name, setName] = useState("");
  const [cars, setCars] = useState<PublicCar[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [page, setPage] = useState("home");
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [ready, setReady] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    api<Site>("/api/website").then(setSite).catch(() => setMsg({ ok: false, text: "Could not load your website." }));
    api<{ name: string }>("/api/dealership-profile").then((m) => setName(m.name)).catch(() => {});
    api<PublicCar[]>("/api/website/cars")
      .then((list) =>
        setCars(list.map((c) => ({ ...c, photos: c.photos.map((p) => p.startsWith("/") ? `${BASE}${p}` : p) }))))
      .catch(() => {});
  }, []);

  // the preview frame tells us when it is ready to receive data
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "preview-ready") setReady((n) => n + 1);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // send the latest draft to the preview whenever anything changes
  useEffect(() => {
    if (!site) return;
    let active = true;
    const objectUrls: string[] = [];
    void (async () => {
      const config = { ...site.config };
      for (const key of ["logoUrl", "heroImage", "aboutImage"]) {
        const value = config[key];
        if (!value) continue;
        const previewUrl = await fetchAdminImagePreview(value).catch(() => null);
        if (!active) { if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl); return; }
        if (previewUrl?.startsWith("blob:")) objectUrls.push(previewUrl);
        if (previewUrl) config[key] = previewUrl;
      }
      if (active) frame.current?.contentWindow?.postMessage(
        { type: "preview", payload: {
          slug: site.slug, page, cars,
          site: { showroomName: name, templateId: site.templateId, config },
        } },
        window.location.origin,
      );
    })();
    return () => { active = false; objectUrls.forEach(URL.revokeObjectURL); };
  }, [site, name, cars, page, ready]);

  if (!site) return <p className="text-slate-500">{msg?.text || "Loading…"}</p>;

  const c = site.config;
  const color = c.primaryColor || "#c4161c";
  const url = `${window.location.origin}/site/${site.slug}`;
  const setConfig = (k: string, v: string) => { setSite({ ...site, config: { ...site.config, [k]: v } }); setDirty(true); };
  const isOn = (k: string) => c[k] !== "false";

  const field = (label: string, key: string, o: { multiline?: boolean; placeholder?: string } = {}) => (
    <label className="block text-sm font-medium">
      {label}
      {o.multiline
        ? <textarea rows={4} className={`${input} mt-1`} value={c[key] || ""} placeholder={o.placeholder} onChange={(e) => setConfig(key, e.target.value)} />
        : <input className={`${input} mt-1`} value={c[key] || ""} placeholder={o.placeholder} onChange={(e) => setConfig(key, e.target.value)} />}
    </label>
  );

  const save = async (): Promise<boolean> => {
    try {
      await api<Site>("/api/website", { method: "PUT", body: { slug: site.slug, templateId: site.templateId, config: site.config } });
      setDirty(false);
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save." });
      return false;
    }
  };
  const onSave = async () => { setBusy(true); setMsg(null); if (await save()) setMsg({ ok: true, text: "Saved." }); setBusy(false); };
  const onPublish = async () => {
    setBusy(true); setMsg(null);
    if (dirty && !(await save())) { setBusy(false); return; }
    try {
      const res = await api<Site>("/api/website/publish", { method: "POST", body: { published: !site.published } });
      setSite((s) => (s ? { ...s, published: res.published } : s));
      setMsg({ ok: true, text: res.published ? "Your website is live." : "Website unpublished." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not update." });
    }
    setBusy(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-5 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Website Builder</h1>
          <select value={page} onChange={(e) => setPage(e.target.value)} className={`${input} !w-auto`}>
            <option value="home">Page: Home</option>
            <option value="stock">Page: Car Stock</option>
          </select>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([d, Icon]) => (
              <button key={d} onClick={() => setDevice(d)} title={d}
                className={`rounded-md p-1.5 ${device === d ? "bg-white shadow" : "text-slate-500"}`}><Icon size={18} /></button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${site.published ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
            {site.published ? "Live" : "Draft"}
          </span>
          {dirty && <span className="text-sm text-amber-600">Unsaved</span>}
          {msg && <span className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</span>}
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium">
            <ExternalLink size={14} /> Live site
          </a>
          <button onClick={onPublish} disabled={busy} className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-60">
            {site.published ? "Unpublish" : "Publish"}
          </button>
          <button onClick={onSave} disabled={busy || !dirty}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 gap-4">
        {/* Tools */}
        <aside className="w-80 shrink-0 overflow-y-auto rounded-2xl border border-black/10 bg-white">
          <div className="border-b border-black/10 px-5 py-4">
            <p className="font-semibold">Editor tools</p>
            <p className="text-xs text-slate-500">Changes show in the preview instantly.</p>
          </div>

          <Group title="Page sections">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Navigation bar</span><span className="text-xs">Always on</span>
            </div>
            {SECTIONS.map(([k, label]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <Toggle on={isOn(k)} onChange={(v) => setConfig(k, v ? "true" : "false")} />
              </div>
            ))}
          </Group>

          <Group title="Global styling">
            <div>
              <p className="text-sm font-medium">Primary colour</p>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                {SWATCHES.map((s) => (
                  <button key={s} type="button" onClick={() => setConfig("primaryColor", s)} style={{ background: s }}
                    className={`h-8 w-8 rounded-full border-2 ${color === s ? "border-black" : "border-transparent"}`} />
                ))}
                <input type="color" value={color} onChange={(e) => setConfig("primaryColor", e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border" />
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Typography</p>
              <Segment value={c.fontStyle || "modern"} onChange={(v) => setConfig("fontStyle", v)}
                options={[["modern", "Modern"], ["classic", "Classic"]]} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Corner radius</p>
              <Segment value={c.corners || "rounded"} onChange={(v) => setConfig("corners", v)}
                options={[["rounded", "Rounded"], ["sharp", "Sharp"]]} />
            </div>
            <ImageField label="Logo" value={c.logoUrl} onChange={(u) => setConfig("logoUrl", u)}
              hint="Shown in the header. Transparent PNG works best." />
          </Group>

          <Group title="Hero banner">
            {field("Headline", "heroTitle", { placeholder: "Welcome to our showroom" })}
            {field("Sub-headline", "heroSubtitle", { placeholder: "Find your perfect car with us." })}
            <ImageField label="Banner image" value={c.heroImage} onChange={(u) => setConfig("heroImage", u)}
              hint="Landscape, about 1600×900. If empty, your first car photo is used." />
          </Group>

          <Group title="About" open={false}>
            {field("About text", "about", { multiline: true, placeholder: "Tell customers who you are…" })}
            <ImageField label="About photo" value={c.aboutImage} onChange={(u) => setConfig("aboutImage", u)}
              hint="Shown in a circle beside the text." />
          </Group>

          <Group title="Contact & social" open={false}>
            {field("Phone / WhatsApp", "phone", { placeholder: "+91 98765 43210" })}
            {field("Email", "email", { placeholder: "sales@yourshowroom.com" })}
            {field("Address", "address", { multiline: true })}
            {field("Opening hours", "hours", { placeholder: "Mon–Sun, 10 AM – 8 PM" })}
            {field("Facebook link", "facebook")}
            {field("Instagram link", "instagram")}
          </Group>

          <Group title="Website address" open={false}>
            <label className="block text-sm font-medium">
              Link
              <div className="mt-1 flex items-center overflow-hidden rounded-lg border border-black/10 bg-slate-50 text-sm">
                <span className="px-2 text-slate-500">/site/</span>
                <input className="min-w-0 flex-1 bg-white px-2 py-2 outline-none" value={site.slug}
                  onChange={(e) => { setSite({ ...site, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }); setDirty(true); }} />
              </div>
              <span className="text-xs text-slate-500">3–40 letters, numbers or dashes.</span>
            </label>
          </Group>
        </aside>

        {/* Live preview */}
        <div className="min-w-0 flex-1 overflow-auto rounded-2xl bg-slate-200 p-4">
          <iframe ref={frame} src="/builder-preview" title="Website preview"
            className="mx-auto block h-full rounded-xl bg-white shadow-lg transition-all"
            style={{ width: DEVICES[device], maxWidth: "100%" }} />
        </div>
      </div>
    </div>
  );
}

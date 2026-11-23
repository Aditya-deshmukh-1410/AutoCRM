import { useRef, useState, type ReactNode } from "react";
import { Camera, ChevronDown, ChevronRight, X } from "lucide-react";
import { postForm, useSite } from "../../lib/publicApi";

const FEATURES: Record<string, string[]> = {
  "Safety & Security": ["Driver Air Bag", "Passenger Air Bag", "Anti-Lock Brakes", "Immobilizer", "Child Safety Locks", "Traction Control"],
  "Comfort & Convenience": ["Air Conditioning", "Power Steering", "Power Windows", "Power Door Lock", "Power Seats", "Defogger", "Central Locking", "Steering Adjustment", "Remote Boot/Fuel-Lid"],
  "Other Features": ["Alloy Wheels", "Rear Wash Wiper", "Audio System", "Cup Holder", "Tubeless Tyres", "Fog Lights", "Leather Seats", "Tachometer"],
};
const CONDITION = ["Air Conditioning", "Battery Condition", "Brakes Condition", "Car Electricals", "Car Engine", "Seat Condition",
  "Suspensions", "Tyre's Condition", "Interior Condition", "Exterior Condition", "Overall Car Condition"];
const RATINGS = ["Excellent", "Good", "Fair", "Poor"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS = Array.from({ length: new Date().getFullYear() - 1994 }, (_, i) => String(new Date().getFullYear() - i));
const MAX_PICS = 6;
const PHOTO_TIPS = ["Front", "Back", "Left side", "Right side", "Interior", "Dashboard"];

const empty = {
  make: "", model: "", variant: "", month: "", year: "", owner: "", color: "", city: "", regNo: "", regAt: "",
  km: "", insurance: "", tax: "", insuranceTill: "", price: "", accidental: "", flood: "",
  warranties: "", mods: "", note: "", name: "", phone: "", email: "",
};
type F = typeof empty;
type Pic = { file: File; url: string };
const box = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]";

/** Phone photos are often 5–10 MB, so shrink them in the browser before uploading. */
async function shrink(file: File): Promise<File> {
  const plain = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  if (plain && file.size < 800 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

function Section({ i, title, open, setOpen, children }: {
  i: number; title: string; open: number; setOpen: (n: number) => void; children: ReactNode;
}) {
  return (
    <div className="border-b border-black/10 last:border-0">
      <button type="button" onClick={() => setOpen(open === i ? -1 : i)}
        className={`flex w-full items-center justify-between px-5 py-4 text-left text-lg uppercase ${open === i ? "bg-[var(--brand)] text-white" : ""}`}>
        {title} {open === i ? <ChevronDown /> : <ChevronRight />}
      </button>
      {open === i && <div className="p-5">{children}</div>}
    </div>
  );
}

export default function SiteSell() {
  const { slug, site, cars } = useSite();
  const [open, setOpen] = useState(0);
  const [f, setF] = useState<F>(empty);
  const [features, setFeatures] = useState<string[]>([]);
  const [cond, setCond] = useState<Record<string, string>>({});
  const [pics, setPics] = useState<Pic[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof F, v: string) => setF((p) => ({ ...p, [k]: v }));
  const side = [site.config.heroImage, ...cars.flatMap((c) => c.photos)].filter(Boolean).slice(0, 2) as string[];

  const addPics = (list: FileList | null) => {
    if (!list) return;
    const ok = Array.from(list).filter((x) => x.type.startsWith("image/"));
    setPics((prev) => [...prev, ...ok.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_PICS));
    if (fileRef.current) fileRef.current.value = "";
  };
  const removePic = (url: string) => {
    URL.revokeObjectURL(url);
    setPics((p) => p.filter((x) => x.url !== url));
  };

  const text = (label: string, k: keyof F, o: { type?: string; placeholder?: string; req?: boolean } = {}) => (
    <label className="block text-sm">
      {label}{o.req && " *"}
      <input className={`${box} mt-1`} type={o.type || "text"} value={f[k]} placeholder={o.placeholder}
        onChange={(e) => set(k, e.target.value)} />
    </label>
  );
  const select = (label: string, k: keyof F, opts: string[], req = false) => (
    <label className="block text-sm">
      {label}{req && " *"}
      <select className={`${box} mt-1`} value={f[k]} onChange={(e) => set(k, e.target.value)}>
        <option value="">Select</option>
        {opts.map((o, i) => <option key={o} value={k === "month" ? String(i + 1) : o}>{o}</option>)}
      </select>
    </label>
  );
  const radios = (label: string, k: keyof F, opts: string[]) => (
    <div className="text-sm">
      <p>{label}</p>
      <div className="mt-2 flex flex-wrap gap-4">
        {opts.map((o) => (
          <label key={o} className="flex items-center gap-2">
            <input type="radio" name={k} checked={f[k] === o} onChange={() => set(k, o)} /> {o}
          </label>
        ))}
      </div>
    </div>
  );
  const area = (label: string, k: keyof F) => (
    <label className="block text-sm">
      {label}
      <textarea rows={4} className={`${box} mt-1`} value={f[k]} onChange={(e) => set(k, e.target.value)} />
    </label>
  );

  const submit = async () => {
    setError("");
    if (!f.make.trim() || !f.model.trim() || !f.month || !f.year || !f.city.trim()) {
      setOpen(0); return setError("Please fill make, model, month, year and city.");
    }
    if (!f.name.trim() || f.phone.replace(/\D/g, "").length < 10) {
      setOpen(5); return setError("Please enter your name and a 10-digit mobile number.");
    }
    const yn = (v: string) => (v === "Yes" ? true : v === "No" ? false : undefined);
    const data = {
      name: f.name.trim(), phone: f.phone, email: f.email.trim() || undefined,
      carMake: f.make.trim(), carModel: f.model.trim(), carVariant: f.variant.trim() || undefined,
      carYear: Number(f.year), regMonth: Number(f.month), ownerType: f.owner || undefined,
      color: f.color.trim() || undefined, city: f.city.trim(),
      registrationNo: f.regNo.trim() || undefined, registrationAt: f.regAt.trim() || undefined,
      kmDriven: f.km ? Number(f.km) : undefined, insuranceType: f.insurance || undefined,
      lifetimeTax: f.tax || undefined, insuranceValidTill: f.insuranceTill || undefined,
      accidental: yn(f.accidental), floodAffected: yn(f.flood),
      expectedPrice: f.price ? Number(f.price) : undefined,
      features, condition: cond,
      warranties: f.warranties.trim() || undefined, modifications: f.mods.trim() || undefined,
      sellerNote: f.note.trim() || undefined,
    };
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));
      for (const file of await Promise.all(pics.map((p) => shrink(p.file)))) fd.append("photos", file);
      await postForm(`/public/${slug}/sell-car`, fd);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <section className="bg-black py-14 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.3em]">{site.showroomName}</p>
        <h1 className="mt-2 text-4xl font-extrabold uppercase">Sell Car</h1>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1fr_300px]">
        {done ? (
          <div className="rounded-2xl border border-black/10 p-10 text-center lg:col-span-2">
            <h2 className="text-2xl font-bold text-[var(--brand)]">Thank you!</h2>
            <p className="mt-2 text-slate-600">We received your car details. Our team will contact you shortly with an offer.</p>
          </div>
        ) : (
          <>
            <div>
              <div className="overflow-hidden rounded-xl border border-black/15">
                <Section open={open} setOpen={setOpen} i={0} title="Car details">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {text("Make", "make", { req: true, placeholder: "Maruti" })}
                    {text("Model", "model", { req: true, placeholder: "Swift" })}
                    {text("Variant", "variant", { placeholder: "VXi" })}
                    {select("Month", "month", MONTHS, true)}
                    {select("Year", "year", YEARS, true)}
                    {select("Owner", "owner", ["First", "Second", "Third", "Fourth or more"])}
                    {text("Colour", "color")}
                    {text("City", "city", { req: true })}
                    {text("Registration no", "regNo")}
                    {text("Registration at", "regAt", { placeholder: "MH-03" })}
                    {text("KM done", "km", { type: "number" })}
                    {text("Estimated price (₹)", "price", { type: "number" })}
                  </div>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    {radios("Car insurance", "insurance", ["Comprehensive", "Third Party", "No Insurance"])}
                    {radios("Life time tax", "tax", ["Individual", "Corporate"])}
                    {text("Insurance valid till", "insuranceTill", { type: "date" })}
                    <div />
                    {radios("Is car accidental?", "accidental", ["Yes", "No"])}
                    {radios("Is car flood-affected?", "flood", ["Yes", "No"])}
                  </div>
                </Section>

                <Section open={open} setOpen={setOpen} i={1} title="Installed features">
                  <div className="grid gap-6 sm:grid-cols-3">
                    {Object.entries(FEATURES).map(([group, items]) => (
                      <div key={group}>
                        <p className="text-sm font-semibold text-slate-500">{group}</p>
                        <div className="mt-2 space-y-2">
                          {items.map((it) => (
                            <label key={it} className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={features.includes(it)}
                                onChange={() => setFeatures((p) => (p.includes(it) ? p.filter((x) => x !== it) : [...p, it]))} />
                              {it}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section open={open} setOpen={setOpen} i={2} title="Car condition">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="py-2 text-left font-normal" />
                          {RATINGS.map((r) => <th key={r} className="px-3 py-2 font-normal">{r}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {CONDITION.map((item) => (
                          <tr key={item} className="border-t border-black/10">
                            <td className="py-3 pr-3">{item}</td>
                            {RATINGS.map((r) => (
                              <td key={r} className="px-3 text-center">
                                <input type="radio" name={item} checked={cond[item] === r}
                                  onChange={() => setCond((p) => ({ ...p, [item]: r }))} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>

                <Section open={open} setOpen={setOpen} i={3} title={`Car photos (${pics.length}/${MAX_PICS})`}>
                  <p className="text-sm text-slate-600">
                    Clear photos help us give you a better offer. Try to include: {PHOTO_TIPS.join(", ")}.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {pics.map((p, i) => (
                      <div key={p.url} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
                        <img src={p.url} alt="" className="h-full w-full object-cover" />
                        {i === 0 && <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">Cover</span>}
                        <button type="button" onClick={() => removePic(p.url)}
                          className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-red-600"><X size={14} /></button>
                      </div>
                    ))}
                    {pics.length < MAX_PICS && (
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/20 text-slate-500 hover:border-[var(--brand)] hover:text-[var(--brand)]">
                        <Camera size={28} />
                        <span className="text-sm font-medium">Add photos</span>
                      </button>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPics(e.target.files)} />
                </Section>

                <Section open={open} setOpen={setOpen} i={4} title="Additional information">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {area("Available warranties (if any)", "warranties")}
                    {area("Major modifications (if any)", "mods")}
                    {area("Special note", "note")}
                  </div>
                </Section>

                <Section open={open} setOpen={setOpen} i={5} title="Contact information">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {text("Your name", "name", { req: true })}
                    {text("Mobile", "phone", { req: true, placeholder: "10 digits" })}
                    {text("Email", "email", { type: "email" })}
                  </div>
                </Section>
              </div>

              {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <button onClick={submit} disabled={sending}
                className="mt-5 rounded-full bg-[var(--brand)] px-10 py-3.5 font-semibold text-white disabled:opacity-60">
                {sending ? "Uploading & submitting…" : "Submit car details"}
              </button>
            </div>

            <aside className="hidden space-y-4 lg:block">
              {side.map((u) => <img key={u} src={u} alt="" className="aspect-[4/5] w-full rounded-3xl object-cover" />)}
            </aside>
          </>
        )}
      </div>
    </>
  );
}

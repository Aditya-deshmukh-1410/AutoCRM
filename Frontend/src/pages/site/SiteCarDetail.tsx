import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Car as CarIcon, MessageCircle, Phone, X } from "lucide-react";
import { carName, getJson, postJson, priceText, useSite, type PublicCar } from "../../lib/publicApi";

const field = "w-full rounded-lg border border-black/15 px-3 py-2.5";

export default function SiteCarDetail() {
  const { slug, site } = useSite();
  const { carId } = useParams();
  const [car, setCar] = useState<PublicCar | null>(null);
  const [missing, setMissing] = useState(false);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState<"test-drive" | "enquiry">("test-drive");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getJson<PublicCar>(`/public/${slug}/cars/${carId}`).then(setCar).catch(() => setMissing(true));
  }, [slug, carId]);

  if (missing) return <p className="p-16 text-center">This car is no longer available.</p>;
  if (!car) return <p className="p-16 text-center text-slate-500">Loading…</p>;

  const digits = (site.config.phone || "").replace(/\D/g, "");
  const go = (d: number) => setIdx((i) => (i + d + car.photos.length) % car.photos.length);
  const rows: [string, string | null][] = [
    ["KMS Done", car.kmDriven?.toLocaleString("en-IN") ?? null], ["Model Year", String(car.year)],
    ["Colour", car.color], ["Owner", car.ownerType], ["Body Type", car.bodyType],
    ["Insurance", car.insuranceType], ["Registration Type", car.registrationType],
    ["Transmission", car.transmission], ["Fuel Type", car.fuel],
    ["Registration At", car.registrationAt],
  ];

  const book = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const v = (k: string) => ((f.get(k) as string) || "").trim() || undefined;
    setSending(true); setMsg("");
    try {
      if (requestType === "test-drive") {
        await postJson(`/public/${slug}/test-drive`, {
          name: v("name"), phone: v("phone"), email: v("email"), carId: car.id,
          preferredDate: v("date"), preferredTime: v("time"),
        });
      } else {
        await postJson(`/api/public/vehicles/${car.id}/enquiries`, {
          name: v("name"), phone: v("phone"), email: v("email"),
        });
      }
      setMsg("Request sent! The dealership will contact you.");
      form.reset();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <Link to={`/site/${slug}/stock`} className="text-sm text-slate-500">← Back to car stock</Link>
      <h1 className="mt-3 text-3xl font-bold">{carName(car)}</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[var(--brand)] bg-black">
            {car.photos.length ? (
              <img src={car.photos[idx]} alt="" className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full items-center justify-center text-white/30"><CarIcon size={64} /></div>
            )}
            {car.photos.length > 1 && (
              <>
                <button onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2"><ChevronLeft /></button>
                <button onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2"><ChevronRight /></button>
              </>
            )}
          </div>
          {car.photos.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {car.photos.map((u, i) => (
                <button key={u} onClick={() => setIdx(i)}
                  className={`aspect-square overflow-hidden rounded-2xl border-2 ${i === idx ? "border-[var(--brand)]" : "border-transparent opacity-60"}`}>
                  <img src={u} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 rounded-xl border border-black/10">
            <h2 className="border-b px-5 py-4 text-xl font-bold uppercase text-[var(--brand)]">Vehicle description</h2>
            <p className="whitespace-pre-line px-5 py-4 text-slate-700">{car.description || "No description added for this car."}</p>
          </div>
          <div className="mt-4 rounded-xl border border-black/10">
            <h2 className="border-b px-5 py-4 text-xl font-bold uppercase text-[var(--brand)]">Seller’s note</h2>
            <p className="whitespace-pre-line px-5 py-4 text-slate-700">{car.sellerNote || "No notes added for this car."}</p>
          </div>
        </div>

        <aside className="h-fit overflow-hidden rounded-3xl bg-slate-100">
          <div className="bg-[var(--brand)] p-6 text-white">
            <p className="text-lg font-semibold uppercase">Car overview</p>
            <p className="mt-1 text-3xl font-extrabold">{priceText(car.price)}</p>
          </div>
          <dl className="px-6 py-2">
            {rows.map(([l, v]) => (
              <div key={l} className="flex justify-between border-b border-black/10 py-3 text-sm last:border-0">
                <dt className="text-slate-600">{l}</dt><dd className="font-medium">{v || "--"}</dd>
              </div>
            ))}
          </dl>
          <div className="space-y-3 p-6 pt-2">
            <button onClick={() => { setRequestType("test-drive"); setOpen(true); setMsg(""); }}
              className="w-full rounded-full bg-black py-3 font-semibold text-white">Book a Test Drive</button>
            <button onClick={() => { setRequestType("enquiry"); setOpen(true); setMsg(""); }}
              className="w-full rounded-full border border-black py-3 font-semibold">Ask about this car</button>
            {digits && (
              <div className="flex gap-3">
                <a href={`https://wa.me/${digits}?text=${encodeURIComponent("Hi, I am interested in " + carName(car))}`}
                  target="_blank" rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-green-500 py-3 font-semibold text-white"><MessageCircle size={18} /> WhatsApp</a>
                <a href={`tel:${digits}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--brand)] py-3 font-semibold text-white"><Phone size={18} /> Call</a>
              </div>
            )}
          </div>
        </aside>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={book} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">{requestType === "test-drive" ? "Book a Test Drive" : "Ask about this car"}</h3>
              <button type="button" onClick={() => setOpen(false)}><X /></button>
            </div>
            <p className="text-sm text-slate-500">{carName(car)}</p>
            <input className={field} name="name" placeholder="Your name" required />
            <input className={field} name="phone" placeholder="Phone (10 digits)" required minLength={10} maxLength={15} />
            <input className={field} name="email" type="email" required placeholder="Email" />
            {requestType === "test-drive" && <div className="grid grid-cols-2 gap-3">
              <input className={field} name="date" type="date" required min={new Date().toISOString().split("T")[0]} />
              <input className={field} name="time" type="time" required />
            </div>}
            <button disabled={sending} className="w-full rounded-full bg-[var(--brand)] py-3 font-semibold text-white disabled:opacity-60">
              {sending ? "Sending…" : requestType === "test-drive" ? "Request Test Drive" : "Send Enquiry"}
            </button>
            {msg && <p className="text-sm">{msg}</p>}
          </form>
        </div>
      )}
    </div>
  );
}

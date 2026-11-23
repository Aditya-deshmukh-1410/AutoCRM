import { useState, type FormEvent } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { postJson, useSite } from "../../lib/publicApi";

const box = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]";

export default function SiteContact() {
  const { slug, site } = useSite();
  const c = site.config;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const cards = [
    { icon: Mail, title: "Email us", text: c.email },
    { icon: MapPin, title: "Our address", text: c.address },
    { icon: Clock, title: "Opening hours", text: c.hours },
    { icon: Phone, title: "Call us", text: c.phone },
  ].filter((x) => x.text);

  const mapUrl = c.address
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${site.showroomName} ${c.address}`)}&output=embed`
    : "";

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const v = (k: string) => ((f.get(k) as string) || "").trim() || undefined;
    setSending(true); setMsg(null);
    try {
      await postJson(`/public/${slug}/enquiry`, {
        name: v("name"), phone: v("phone"), email: v("email"), message: v("message"), kind: "contact",
      });
      setMsg({ ok: true, text: "Thanks! We will get back to you shortly." });
      form.reset();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <section className="bg-black pb-24 pt-14 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.3em]">{site.showroomName}</p>
        <h1 className="mt-2 text-4xl font-extrabold uppercase">Contact Us</h1>
      </section>

      {cards.length > 0 && (
        <section className="mx-auto -mt-14 grid max-w-6xl gap-5 px-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-white p-6 shadow-lg">
              <Icon className="text-[var(--brand)]" size={30} />
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </section>
      )}

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold">Get in touch</h2>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm">Name *
              <input className={`${box} mt-1`} name="name" required placeholder="Enter your name" /></label>
            <label className="block text-sm">Mobile *
              <input className={`${box} mt-1`} name="phone" required minLength={10} maxLength={15} placeholder="Enter your mobile" /></label>
            <label className="block text-sm">Email
              <input className={`${box} mt-1`} name="email" type="email" required placeholder="Enter your email" /></label>
            <label className="block text-sm">Message
              <textarea className={`${box} mt-1`} name="message" rows={4} maxLength={1000} placeholder="How can we help?" /></label>
            <button disabled={sending} className="rounded-full bg-[var(--brand)] px-8 py-3 font-semibold text-white disabled:opacity-60">
              {sending ? "Sending…" : "Send message"}
            </button>
            {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
          </form>
        </div>

        <div>
          <h2 className="text-3xl font-bold">Location</h2>
          {mapUrl ? (
            <>
              <iframe title="Map" src={mapUrl} loading="lazy" className="mt-6 h-80 w-full rounded-2xl border-0" />
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.showroomName} ${c.address}`)}`}
                target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[var(--brand)]">
                Open in Google Maps →
              </a>
            </>
          ) : (
            <p className="mt-6 text-slate-500">Add your address in the Website Builder to show a map here.</p>
          )}
        </div>
      </section>
    </>
  );
}

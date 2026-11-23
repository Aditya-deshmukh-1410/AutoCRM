import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calculator, ChevronLeft, ChevronRight, Search, Tag } from "lucide-react";
import { BUDGETS, useSite } from "../../lib/publicApi";
import CarCard from "./CarCard";

const sel = "w-full rounded-xl bg-white px-4 py-3.5 text-slate-800 outline-none";

export default function SiteHome() {
  const { slug, site, cars } = useSite();
  const nav = useNavigate();
  const c = site.config;
  const base = `/site/${slug}`;
  const show = (k: string) => (c[k] === "false" ? { display: "none" } : undefined);

  const makes = useMemo(() => [...new Set(cars.map((x) => x.make))].sort(), [cars]);
  const bodies = useMemo(() => [...new Set(cars.map((x) => x.bodyType).filter(Boolean) as string[])].sort(), [cars]);
  const [make, setMake] = useState("");
  const [body, setBody] = useState("");
  const [budget, setBudget] = useState("");
  const strip = useRef<HTMLDivElement>(null);

  const search = () => {
    const p = new URLSearchParams();
    if (make) p.set("make", make);
    if (body) p.set("body", body);
    if (budget) p.set("budget", budget);
    nav(`${base}/stock?${p.toString()}`);
  };

  // EMI calculator
  const [loan, setLoan] = useState("500000");
  const [rate, setRate] = useState("9");
  const [years, setYears] = useState("5");
  const P = Number(loan), n = Number(years) * 12, r = Number(rate) / 12 / 100;
  const emi = P > 0 && n > 0 ? (r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : 0;
  const total = emi * n;
  const money = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");

  const heroPhoto = c.heroImage || cars[0]?.photos[0];
  const aboutPhoto = c.aboutImage || cars[1]?.photos[0] || cars[0]?.photos[0];
  const field = "w-full rounded-xl bg-white px-4 py-3.5 text-slate-800 outline-none";

  return (
    <>
      {/* Hero */}
      <section style={show("showHero")} className="bg-gradient-to-b from-black to-neutral-900 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              {c.heroTitle || `Welcome to ${site.showroomName}`}
            </h1>
            <p className="mt-3 text-lg text-white/70">{c.heroSubtitle || "Find your perfect car with us."}</p>
            {heroPhoto && (
              <img src={heroPhoto} alt="" className="mt-8 aspect-[16/10] w-full max-w-xl rounded-2xl object-cover" />
            )}
          </div>

          <div className="rounded-[2rem] bg-[var(--brand)] p-8">
            <h2 className="text-3xl font-extrabold uppercase leading-tight">Search for the best cars</h2>
            <div className="mt-6 space-y-4">
              <select className={sel} value={make} onChange={(e) => setMake(e.target.value)}>
                <option value="">Select Make</option>
                {makes.map((m) => <option key={m}>{m}</option>)}
              </select>
              <select className={sel} value={body} onChange={(e) => setBody(e.target.value)}>
                <option value="">Select Body Type</option>
                {bodies.map((b) => <option key={b}>{b}</option>)}
              </select>
              <select className={sel} value={budget} onChange={(e) => setBudget(e.target.value)}>
                <option value="">Select Budget</option>
                {BUDGETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={search} className="w-full rounded-xl bg-black py-3.5 font-bold uppercase tracking-wide">
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Welcome */}
      <section style={show("showAbout")} className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2">
        <div>
          <p className="text-3xl text-[var(--brand)]">Welcome to</p>
          <h2 className="text-4xl font-extrabold text-[var(--brand)]">{site.showroomName}</h2>
          <p className="mt-4 line-clamp-5 whitespace-pre-line text-slate-700">
            {c.about || "We offer a wide range of quality pre-owned cars with complete transparency and trusted service."}
          </p>
          <Link to={`${base}/about`} className="mt-6 inline-block rounded-full bg-black px-8 py-3 font-semibold text-white">
            Read More
          </Link>
        </div>
        {aboutPhoto && (
          <div className="mx-auto aspect-square w-full max-w-sm rounded-full border-[10px] border-[var(--brand)] p-1">
            <img src={aboutPhoto} alt="" className="h-full w-full rounded-full object-cover" />
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section style={show("showQuick")} className="grid text-center text-lg font-semibold text-white sm:grid-cols-3">
        <Link to={`${base}/contact`} className="flex items-center justify-center gap-3 bg-black py-7"><Tag /> Contact Us</Link>
        <a href="#emi" className="flex items-center justify-center gap-3 bg-[var(--brand)] py-7"><Calculator /> EMI Calculator</a>
        <Link to={`${base}/stock`} className="flex items-center justify-center gap-3 bg-black py-7"><Search /> Search Used Cars</Link>
      </section>

      {/* Cars in stock */}
      <section style={show("showStock")} className="mx-auto max-w-6xl px-5 py-16">
        <div className="relative rounded-[2.5rem] bg-black px-6 pb-14 pt-10">
          <h2 className="text-center text-4xl font-extrabold uppercase text-white">Our cars in stock</h2>
          {cars.length === 0 ? (
            <p className="mt-8 text-center text-white/60">New cars are coming soon.</p>
          ) : (
            <div className="relative mt-8">
              <div ref={strip} className="flex gap-6 overflow-x-auto scroll-smooth px-1 pb-10 [scrollbar-width:none]">
                {cars.slice(0, 10).map((car) => (
                  <div key={car.id} className="w-72 shrink-0">
                    <CarCard car={car} to={`${base}/stock/${car.id}`} phone={c.phone} />
                  </div>
                ))}
              </div>
              <button onClick={() => strip.current?.scrollBy({ left: -320 })}
                className="absolute -left-3 top-1/2 bg-[var(--brand)] p-2 text-white"><ChevronLeft /></button>
              <button onClick={() => strip.current?.scrollBy({ left: 320 })}
                className="absolute -right-3 top-1/2 bg-[var(--brand)] p-2 text-white"><ChevronRight /></button>
            </div>
          )}
        </div>
        <div className="mt-6 text-center">
          <Link to={`${base}/stock`} className="rounded-full bg-[var(--brand)] px-8 py-3 font-semibold text-white">View all cars</Link>
        </div>
      </section>

      {/* EMI calculator */}
      <section id="emi" style={show("showEmi")} className="bg-slate-100 py-16">
        <div className="mx-auto max-w-3xl rounded-[2rem] bg-black p-8 text-white">
          <h2 className="text-3xl font-extrabold uppercase">EMI Calculator</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <label className="text-sm">Loan amount (₹)
              <input className={field + " mt-1"} type="number" min={0} value={loan} onChange={(e) => setLoan(e.target.value)} /></label>
            <label className="text-sm">Interest rate (% / year)
              <input className={field + " mt-1"} type="number" min={0} step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
            <label className="text-sm">Tenure (years)
              <input className={field + " mt-1"} type="number" min={1} max={10} value={years} onChange={(e) => setYears(e.target.value)} /></label>
          </div>
          <div className="mt-6 grid gap-4 rounded-2xl bg-white/10 p-5 text-center sm:grid-cols-3">
            <div><p className="text-sm text-white/60">Monthly EMI</p><p className="text-2xl font-extrabold text-[var(--brand)]">{money(emi)}</p></div>
            <div><p className="text-sm text-white/60">Total interest</p><p className="text-xl font-bold">{money(Math.max(total - P, 0))}</p></div>
            <div><p className="text-sm text-white/60">Total payable</p><p className="text-xl font-bold">{money(total)}</p></div>
          </div>
        </div>
      </section>
    </>
  );
}

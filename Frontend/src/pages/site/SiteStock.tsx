import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { BUDGETS, useSite } from "../../lib/publicApi";
import CarCard from "./CarCard";

const RANGES: Record<string, [number, number]> = {
  u3: [0, 300000], "3-6": [300000, 600000], "6-10": [600000, 1000000], "10-20": [1000000, 2000000], "20+": [2000000, Infinity],
};
const sel = "rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm";

export default function SiteStock() {
  const { slug, site, cars } = useSite();
  const [params, setParams] = useSearchParams();
  const get = (k: string) => params.get(k) || "";
  const setP = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p, { replace: true });
  };

  const uniq = (f: (c: (typeof cars)[number]) => string | null) =>
    [...new Set(cars.map(f).filter(Boolean) as string[])].sort();
  const makes = useMemo(() => uniq((c) => c.make), [cars]);
  const bodies = useMemo(() => uniq((c) => c.bodyType), [cars]);
  const fuels = useMemo(() => uniq((c) => c.fuel), [cars]);
  const gears = useMemo(() => uniq((c) => c.transmission), [cars]);

  const list = useMemo(() => {
    const q = get("q").toLowerCase();
    const [lo, hi] = RANGES[get("budget")] ?? [0, Infinity];
    const out = cars.filter((c) =>
      (!get("make") || c.make === get("make")) &&
      (!get("body") || c.bodyType === get("body")) &&
      (!get("fuel") || c.fuel === get("fuel")) &&
      (!get("gear") || c.transmission === get("gear")) &&
      c.price >= lo && c.price < hi &&
      (!q || `${c.make} ${c.model} ${c.variant ?? ""}`.toLowerCase().includes(q)));
    const s = get("sort");
    if (s === "price_asc") out.sort((a, b) => a.price - b.price);
    if (s === "price_desc") out.sort((a, b) => b.price - a.price);
    if (s === "year_desc") out.sort((a, b) => b.year - a.year);
    if (s === "km_asc") out.sort((a, b) => (a.kmDriven ?? 1e9) - (b.kmDriven ?? 1e9));
    return out;
  }, [cars, params]);

  const filter = (k: string, label: string, opts: string[]) => (
    <select className={sel} value={get(k)} onChange={(e) => setP(k, e.target.value)}>
      <option value="">{label}</option>
      {opts.map((o) => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <>
      <section className="bg-black py-14 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.3em]">{site.showroomName}</p>
        <h1 className="mt-2 text-4xl font-extrabold uppercase">Car Stock</h1>
      </section>

      <section className="border-b bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-4">
          <input className={sel + " min-w-[180px] flex-1"} placeholder="Search make or model"
            value={get("q")} onChange={(e) => setP("q", e.target.value)} />
          {filter("make", "Make", makes)}
          {filter("body", "Body type", bodies)}
          {filter("fuel", "Fuel", fuels)}
          {filter("gear", "Transmission", gears)}
          <select className={sel} value={get("budget")} onChange={(e) => setP("budget", e.target.value)}>
            <option value="">Budget</option>
            {BUDGETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className={sel} value={get("sort")} onChange={(e) => setP("sort", e.target.value)}>
            <option value="">Best match</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="year_desc">Newest year</option>
            <option value="km_asc">Lowest km</option>
          </select>
          {params.toString() && (
            <button onClick={() => setParams({}, { replace: true })} className="text-sm font-medium text-[var(--brand)]">Clear</button>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <p className="mb-6 text-slate-600">Total {list.length} Results Found</p>
        {list.length === 0 ? (
          <p className="py-16 text-center text-slate-500">No cars match your search.</p>
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((car) => (
              <CarCard key={car.id} car={car} to={`/site/${slug}/stock/${car.id}`} phone={site.config.phone} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

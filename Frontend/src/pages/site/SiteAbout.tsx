import { Link } from "react-router-dom";
import { useSite } from "../../lib/publicApi";

export default function SiteAbout() {
  const { slug, site, cars } = useSite();
  const c = site.config;
  const base = `/site/${slug}`;
  const photo = c.aboutImage || cars[0]?.photos[0];

  return (
    <>
      <section className="bg-black py-14 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.3em]">{site.showroomName}</p>
        <h1 className="mt-2 text-4xl font-extrabold uppercase">About Us</h1>
      </section>

      <section className="mx-auto grid max-w-6xl items-start gap-10 px-5 py-14 lg:grid-cols-[1fr_1.3fr]">
        {photo && (
          <div className="rounded-[2rem] bg-slate-200 p-4">
            <img src={photo} alt="" className="aspect-[3/4] w-full rounded-[1.5rem] object-cover" />
          </div>
        )}
        <div className={photo ? "" : "lg:col-span-2"}>
          <p className="text-2xl uppercase text-[var(--brand)]">Welcome to</p>
          <h2 className="text-4xl font-extrabold uppercase text-[var(--brand)]">{site.showroomName}</h2>
          <p className="mt-5 whitespace-pre-line leading-relaxed text-slate-700">
            {c.about || "We offer a wide range of quality pre-owned cars with complete transparency and trusted service."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={`${base}/stock`} className="rounded-full bg-black px-7 py-3 font-semibold text-white">Browse our cars</Link>
            <Link to={`${base}/contact`} className="rounded-full bg-[var(--brand)] px-7 py-3 font-semibold text-white">Contact us</Link>
            <Link to={`${base}/contact`} className="rounded-full border border-black/20 px-7 py-3 font-semibold">Contact us</Link>
          </div>
        </div>
      </section>
    </>
  );
}

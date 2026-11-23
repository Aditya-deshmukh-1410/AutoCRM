import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import type { PublicCar, Site } from "../../lib/publicApi";

const NAV = [
  ["", "Home"], ["stock", "Car Stock"], ["sell-car", "Sell Your Car"], ["about", "About Us"], ["contact", "Contact Us"],
];

export default function SiteShell({ slug, site, cars }: { slug: string; site: Site; cars: PublicCar[] }) {
  const [menu, setMenu] = useState(false);
  const c = site.config;
  const base = `/site/${slug}`;
  const color = c.primaryColor || "#c4161c";
  const link = ({ isActive }: { isActive: boolean }) =>
    `block py-2 text-[15px] font-medium transition ${isActive ? "text-[var(--brand)]" : "text-white hover:text-[var(--brand)]"}`;

  return (
    <div
      className={`site-root flex min-h-screen flex-col bg-white text-slate-900 ${c.corners === "sharp" ? "sharp" : ""}`}
      style={{
        "--brand": color,
        fontFamily: c.fontStyle === "classic" ? "Georgia, 'Times New Roman', serif" : undefined,
      } as React.CSSProperties}
    >
      <style>{`.site-root.sharp [class*='rounded']:not([class*='rounded-full']){border-radius:6px!important}`}</style>

      <header className="sticky top-0 z-40 bg-black text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <NavLink to={base} className="flex items-center gap-3 text-xl font-extrabold tracking-tight">
            {c.logoUrl && <img src={c.logoUrl} alt="" className="h-10" />}
            {site.showroomName}
          </NavLink>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map(([p, label]) => (
              <NavLink key={label} to={p ? `${base}/${p}` : base} end={!p} className={link}>{label}</NavLink>
            ))}
            <NavLink to={`${base}/stock`} className="rounded-full border border-white/40 px-4 py-1.5 text-sm">
              Cars in Stock: <b className="text-[var(--brand)]">{cars.length}</b>
            </NavLink>
          </nav>

          <button className="lg:hidden" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
        </div>
        {menu && (
          <nav className="border-t border-white/10 px-5 pb-3 lg:hidden" onClick={() => setMenu(false)}>
            {NAV.map(([p, label]) => (
              <NavLink key={label} to={p ? `${base}/${p}` : base} end={!p} className={link}>{label}</NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet context={{ slug, site, cars }} />
      </main>

      {c.showFooter !== "false" && (
        <footer className="bg-black text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">
            <div>
              <p className="text-xl font-extrabold">{site.showroomName}</p>
              {c.heroSubtitle && <p className="mt-2 text-sm text-white/60">{c.heroSubtitle}</p>}
              <div className="mt-4 flex gap-3">
                {c.facebook && <a href={c.facebook} target="_blank" rel="noreferrer" className="text-sm underline">Facebook</a>}
                {c.instagram && <a href={c.instagram} target="_blank" rel="noreferrer" className="text-sm underline">Instagram</a>}
              </div>
            </div>
            <div>
              <p className="font-semibold">QUICK LINKS</p>
              <ul className="mt-3 space-y-1.5 text-sm text-white/70">
                {NAV.map(([p, label]) => (
                  <li key={label}><NavLink to={p ? `${base}/${p}` : base}>{label}</NavLink></li>
                ))}
              </ul>
            </div>
            <div className="text-sm text-white/70">
              <p className="font-semibold text-white">CONTACT</p>
              {c.address && <p className="mt-3">{c.address}</p>}
              {c.phone && <p className="mt-2">{c.phone}</p>}
              {c.email && <p className="mt-2">{c.email}</p>}
              {c.hours && <p className="mt-2">{c.hours}</p>}
            </div>
          </div>
          <p className="border-t border-white/10 py-4 text-center text-xs text-white/50">
            © {new Date().getFullYear()} {site.showroomName}. All rights reserved.
          </p>
        </footer>
      )}
    </div>
  );
}

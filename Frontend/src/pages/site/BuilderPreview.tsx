import { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import type { PublicCar, Site } from "../../lib/publicApi";
import SiteShell from "./SiteShell";
import SiteHome from "./SiteHome";
import SiteStock from "./SiteStock";

type Payload = { slug: string; site: Site; cars: PublicCar[]; page: string };

/** Shown inside the builder's preview frame. It displays whatever the builder sends. */
export default function BuilderPreview() {
  const [data, setData] = useState<Payload | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "preview") return;
      setData(e.data.payload);
    };
    const blockLinks = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("a")) e.preventDefault();
    };
    window.addEventListener("message", onMessage);
    document.addEventListener("click", blockLinks, true);
    window.parent.postMessage({ type: "preview-ready" }, window.location.origin);
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", blockLinks, true);
    };
  }, []);

  const page = data?.page;
  useEffect(() => {
    if (page) navigate(page === "stock" ? "/builder-preview/stock" : "/builder-preview", { replace: true });
  }, [page, navigate]);

  if (!data) return <p className="p-10 text-center text-slate-400">Loading preview…</p>;

  return (
    <Routes>
      <Route element={<SiteShell slug={data.slug} site={data.site} cars={data.cars} />}>
        <Route index element={<SiteHome />} />
        <Route path="stock" element={<SiteStock />} />
      </Route>
    </Routes>
  );
}

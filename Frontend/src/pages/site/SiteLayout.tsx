import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getJson, type PublicCar, type Site } from "../../lib/publicApi";
import SiteShell from "./SiteShell";

export default function SiteLayout() {
  const { slug = "" } = useParams();
  const [site, setSite] = useState<Site | null>(null);
  const [cars, setCars] = useState<PublicCar[]>([]);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    getJson<Site>(`/public/${slug}`).then(setSite).catch(() => setMissing(true));
    getJson<PublicCar[]>(`/public/${slug}/cars`).then(setCars).catch(() => setCars([]));
  }, [slug]);

  if (missing) return <h2 className="p-16 text-center text-xl">This website is not available.</h2>;
  if (!site) return <p className="p-16 text-center text-slate-500">Loading…</p>;
  return <SiteShell slug={slug} site={site} cars={cars} />;
}

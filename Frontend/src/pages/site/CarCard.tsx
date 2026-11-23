import { Link } from "react-router-dom";
import { Calendar, Car as CarIcon, Cog, Fuel, Gauge, MessageCircle, Phone } from "lucide-react";
import { priceText, type PublicCar } from "../../lib/publicApi";

export default function CarCard({ car, to, phone }: { car: PublicCar; to: string; phone?: string }) {
  const digits = (phone || "").replace(/\D/g, "");
  const row = (icon: React.ReactNode, text: string) => (
    <li className="flex items-center gap-3 text-sm text-slate-700">{icon}{text}</li>
  );
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col rounded-2xl border border-black/10 bg-white p-4 shadow-md">
        <div className="relative">
          <Link to={to} className="block aspect-[4/3] overflow-hidden rounded-xl bg-black">
            {car.photos[0] ? (
              <img src={car.photos[0]} alt={`${car.make} ${car.model}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-white/30"><CarIcon size={48} /></div>
            )}
          </Link>
          {car.status.toLowerCase() === "reserved" && (
            <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white">Reserved</span>
          )}
          {digits && (
            <div className="absolute bottom-2 right-2 flex flex-col gap-2">
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white"><MessageCircle size={18} /></a>
              <a href={`tel:${digits}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-white"><Phone size={18} /></a>
            </div>
          )}
        </div>

        <h3 className="mt-4 font-bold text-[var(--brand)]">{car.make} {car.model} {car.variant}</h3>
        <ul className="mt-3 space-y-2">
          {row(<Cog size={16} />, car.transmission ?? "-")}
          {row(<Fuel size={16} />, car.fuel ?? "-")}
          {row(<Calendar size={16} />, `Year - ${car.year}`)}
          {row(<Gauge size={16} />, car.kmDriven != null ? `${car.kmDriven.toLocaleString("en-IN")} KMS` : "-")}
          {car.bodyType && row(<CarIcon size={16} />, car.bodyType)}
        </ul>
        <p className="mt-4 text-center text-3xl font-extrabold text-[var(--brand)]">{priceText(car.price)}</p>
      </div>
      <Link to={to} className="mx-auto -mt-5 rounded-full bg-black px-8 py-3 text-sm font-semibold text-white">
        More Details
      </Link>
    </div>
  );
}

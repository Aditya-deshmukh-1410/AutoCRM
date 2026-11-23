import type { ReactNode } from "react";
import { Activity, CarFront, Users } from "lucide-react";
import heroImg from "../assets/showroom-hero.png";

const features = [
  { icon: Users, title: "Customers and leads", text: "Keep customer details and lead records organized." },
  { icon: CarFront, title: "Vehicles and test drives", text: "Manage inventory records and test-drive details." },
  { icon: Activity, title: "Sales and activities", text: "Record sales, finance details, and dealership activity." },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-screen overflow-hidden lg:grid-cols-[43%_57%]">
      {/* Left brand panel */}
      <aside className="hidden h-screen min-h-0 flex-col bg-plum-950 px-12 py-8 text-white lg:flex">
        <h1 className="font-extrabold leading-[1.1] tracking-tight" style={{ fontSize: "clamp(30px, 3.3vw, 50px)" }}>
          A clearer view of your <span className="text-brand-300">dealership.</span>
        </h1>
        <p className="mt-4 max-w-[480px] text-[15px] font-light leading-relaxed text-white/70">
          Manage customer, lead, vehicle, test-drive, sales, finance, activity, and user records in one dealership CRM.
        </p>

        <ul className="mt-6 space-y-3.5">
          {features.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                <Icon size={17} className="text-white/80" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-[13px] text-white/65">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Image card — fills the remaining height, never scrolls */}
        <div className="mt-6 min-h-0 flex-1 rounded-2xl border border-white/10 bg-white/5 p-3">
          <img src={heroImg} alt="AutoCRM dealership dashboard" className="h-full w-full rounded-xl object-cover" />
        </div>
      </aside>

      {/* Right form panel (scrolls only on very short screens as a safety net) */}
      <main className="flex h-screen items-center justify-center overflow-y-auto px-6 py-4">
        <div className="w-full max-w-[540px]">{children}</div>
      </main>
    </div>
  );
}

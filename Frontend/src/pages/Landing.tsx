import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Menu,
  Users,
  X,
} from "lucide-react";

import { Button } from "../components/ui/button";

import heroVideo from "../assets/autocrm-hero.mp4.asset.json";
import heroPoster from "../assets/autocrm-hero-local-poster.jpg";
import showroomHero from "../assets/indian-retail-showroom-hero-final.jpg";
import inventoryImage from "../assets/inventory-management.jpg";

type FeatureKey = "customers" | "inventory" | "sales";

const featureDetails: Record<
  FeatureKey,
  {
    title: string;
    copy: string;
    eyebrow: string;
    image: string;
  }
> = {
  customers: {
    title: "Customers & Leads",
    copy: "Keep customer details and lead records organized for your dealership team.",
    eyebrow: "Customer management",
    image: showroomHero,
  },

  inventory: {
    title: "Inventory Management",
    copy: "Review vehicle records and their current inventory status in one workspace.",
    eyebrow: "Vehicle inventory",
    image: inventoryImage,
  },

  sales: {
    title: "Sales & Finance",
    copy: "Record vehicle sales and the finance details associated with those sales.",
    eyebrow: "Dealership records",
    image: showroomHero,
  },
};

function AutoLogo() {
  return (
    <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
      <span className="font-display text-base font-extrabold">A</span>
    </span>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] =
    useState<FeatureKey>("customers");
  const [videoFailed, setVideoFailed] = useState(false);

  const currentFeature = featureDetails[activeFeature];

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">

      {/* ================= HEADER ================= */}

      <header className="absolute inset-x-0 top-0 z-30 px-5 pt-4 lg:px-10">
        <nav className="mx-auto flex h-14 max-w-[1180px] items-center justify-between border-b border-foreground/10">

          {/* Logo */}
          <a
            className="flex items-center gap-3"
            href="#top"
            aria-label="AutoCRM home"
          >
            <AutoLogo />

            <span className="font-display text-base font-extrabold">
              AutoCRM
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 text-sm font-semibold text-muted-foreground md:flex">
            <a
              className="transition-colors hover:text-primary"
              href="#features"
            >
              Features
            </a>

            <a
              className="transition-colors hover:text-primary"
              href="#dealership-records"
            >
              Modules
            </a>

            <a
              className="transition-colors hover:text-primary"
              href="#about"
            >
              About
            </a>

            <a
              className="transition-colors hover:text-primary"
              href="/showroom"
            >
              Vehicle showroom
            </a>
          </div>

          {/* Desktop Login / Signup */}
          <div className="hidden items-center gap-5 md:flex">

            <a
              className="text-sm font-semibold text-muted-foreground hover:text-primary"
              href="/login"
            >
              Login
            </a>

            <Button
              asChild
              className="h-10 bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90"
            >
              <a href="/signup">
                Get Started
                <ArrowUpRight />
              </a>
            </Button>

          </div>

          {/* Mobile Menu Button */}
          <Button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            size="icon"
            variant="ghost"
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </nav>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="mx-auto flex max-w-[1180px] flex-col gap-4 border-b border-border bg-background/95 px-4 py-5 text-sm font-semibold backdrop-blur-xl md:hidden">

            <a
              href="#features"
              onClick={() => setMenuOpen(false)}
            >
              Features
            </a>

            <a
              href="#dealership-records"
              onClick={() => setMenuOpen(false)}
            >
              Modules
            </a>

            <a
              href="#about"
              onClick={() => setMenuOpen(false)}
            >
              About
            </a>

            <a
              href="/showroom"
              onClick={() => setMenuOpen(false)}
            >
              Vehicle showroom
            </a>

            <a
              href="/login"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </a>

            <Button asChild className="w-fit">
              <a
                href="/signup"
                onClick={() => setMenuOpen(false)}
              >
                Get Started
                <ArrowUpRight />
              </a>
            </Button>

          </div>
        )}
      </header>


      {/* ================= HERO SECTION ================= */}

      <section
        id="top"
        className="relative flex min-h-[92svh] items-center overflow-hidden px-5 pb-14 pt-24 sm:px-8 lg:px-16"
      >

        <img
          alt="Welcoming Indian automotive dealership showroom"
          className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
          height={1080}
          src={showroomHero}
          width={1920}
        />

        <div className="launch-scrim absolute inset-0" />

        <div className="relative z-10 mx-auto w-full max-w-[1180px]">

          <div className="max-w-[520px]">

            <p className="crm-rise mb-4 flex items-center gap-3 text-xs font-bold uppercase text-primary">
              <span className="h-px w-8 bg-primary" />
              Built for India’s automotive retail
            </p>

            <h1 className="font-display text-[clamp(2.4rem,4.4vw,4.25rem)] font-extrabold leading-[1.02]">

              <span className="crm-title-line block">
                Dealership CRM.
              </span>

              <span className="crm-title-line crm-title-line-delay mt-1 block text-primary">
                Built for your daily work.
              </span>

            </h1>

            <p className="crm-rise mt-5 max-w-md text-base leading-7 text-muted-foreground">
              Manage customer and lead records, vehicles, test drives, sales,
              finance details, activities, and dealership users in one place.
            </p>

            <div className="crm-rise mt-7 flex flex-wrap gap-3">

              <Button
                asChild
                className="h-11 bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90"
              >
                <a href="/signup">
                  Get Started
                  <ArrowUpRight />
                </a>
              </Button>

              <Button
                asChild
                className="h-11 border-primary/20 bg-background/80 px-6 font-bold"
                variant="outline"
              >
                <a href="#platform">
                  <ArrowRight />
                  Explore Modules
                </a>
              </Button>

            </div>

            <div className="crm-rise mt-6 flex flex-wrap gap-x-7 gap-y-2 text-sm font-semibold text-muted-foreground">

              <span className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                Customer and vehicle records
              </span>

              <span className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                Dealership sales and activity records
              </span>

            </div>

          </div>
        </div>

        <a
          className="absolute bottom-5 left-1/2 z-10 grid size-10 -translate-x-1/2 place-items-center rounded-full border border-primary/20 bg-background/80 text-primary backdrop-blur"
          href="#platform"
          aria-label="Discover AutoCRM"
        >
          <ChevronDown className="size-5" />
        </a>

      </section>


      {/* ================= PLATFORM SECTION ================= */}

      <section
        id="platform"
        className="section-grid flex min-h-svh items-center px-5 py-12 sm:px-8"
      >

        <div className="mx-auto w-full max-w-[1120px]">

          <div className="crm-scroll-reveal text-center">

            <p className="text-xs font-bold uppercase text-primary">
              Dealership records in one workspace
            </p>

            <h2 className="mt-2 font-display text-[clamp(2rem,3.5vw,3.35rem)] font-extrabold leading-[1.04]">
              Dealership CRM{" "}
              <span className="text-primary">
                for Everyday Operations
              </span>
            </h2>

          </div>


          <div className="crm-scroll-reveal mt-7 grid items-stretch gap-5 md:grid-cols-[0.7fr_1.55fr]">

            <article className="flex flex-col justify-center rounded-lg border border-border bg-card p-6 shadow-sm">

              <p className="text-xs font-bold uppercase text-primary">
                Why AutoCRM
              </p>

              <h3 className="mt-2 font-display text-2xl font-extrabold">
                Move every enquiry forward.
              </h3>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Give your team a clear place to manage the records used in
                dealership sales and follow-up.
              </p>

              <ul className="mt-5 grid gap-3 text-sm font-semibold">

                {[
                  "Organize customer and lead records",
                  "Review vehicles and test drives",
                  "Record sales, finance, and activities",
                ].map((item) => (
                  <li
                    className="flex items-center gap-3"
                    key={item}
                  >
                    <Check className="size-4 text-primary" />
                    {item}
                  </li>
                ))}

              </ul>

            </article>


            <div className="relative aspect-video min-w-0 overflow-hidden rounded-lg bg-muted shadow-lg">

              <img
                alt="AutoCRM dealership workspace preview"
                className="absolute inset-0 h-full w-full object-cover"
                src={heroPoster}
              />

              {!videoFailed && (
                <video
                  aria-label="AutoCRM dealership command center"
                  autoPlay
                  className="absolute inset-0 h-full w-full object-cover"
                  loop
                  muted
                  onError={() => setVideoFailed(true)}
                  playsInline
                  preload="metadata"
                  poster={heroPoster}
                  src={heroVideo.url}
                />
              )}

            </div>

          </div>


          <a
            aria-label="Continue to features"
            className="mx-auto mt-5 grid size-10 place-items-center rounded-full border border-border bg-card text-primary shadow-sm hover:translate-y-1"
            href="#features"
          >
            <ChevronDown className="size-5" />
          </a>

        </div>

      </section>


      {/* ================= FEATURES SECTION ================= */}

      <section
        id="features"
        className="feature-stage flex min-h-svh items-center px-5 py-12 text-plum-foreground sm:px-8"
      >

        <div className="mx-auto w-full max-w-[1160px]">

          <div className="crm-scroll-reveal text-center">

            <p className="text-xs font-bold uppercase text-plum-accent">
              Built around dealership work
            </p>

            <h2 className="mt-2 font-display text-[clamp(2rem,3.8vw,3.6rem)] font-extrabold leading-tight">
              Dealership tools in one place{" "}
              <span className="text-plum-accent">
                for daily operations.
              </span>
            </h2>

          </div>


          <div className="crm-scroll-reveal mt-8 grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">

            {/* Feature Buttons */}

            <div className="flex flex-col gap-3">

              {(Object.keys(featureDetails) as FeatureKey[]).map((key) => {

                const feature = featureDetails[key];
                const active = key === activeFeature;

                return (
                  <Button
                    aria-pressed={active}
                    className={`feature-choice h-auto min-h-20 w-full whitespace-normal rounded-lg p-5 text-left ${
                      active
                        ? "feature-choice-active"
                        : "feature-choice-idle"
                    }`}
                    key={key}
                    onClick={() => setActiveFeature(key)}
                    variant="ghost"
                  >

                    <span className="block w-full">

                      <span className="block text-[10px] font-bold uppercase text-plum-accent">
                        {feature.eyebrow}
                      </span>

                      <span className="mt-1 flex items-center justify-between gap-4">

                        <strong className="font-display text-xl font-extrabold">
                          {feature.title}
                        </strong>

                        <ArrowRight className="size-4 shrink-0" />

                      </span>

                      {active && (
                        <span className="mt-2 block max-w-md text-sm font-normal leading-6 text-plum-muted">
                          {feature.copy}
                        </span>
                      )}

                    </span>

                  </Button>
                );
              })}

            </div>


            {/* Feature Image */}

            <div className="feature-media relative min-h-[320px] overflow-hidden rounded-xl border border-plum-border">

              <img
                alt={`${currentFeature.title} for automotive dealerships`}
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                height={900}
                key={activeFeature}
                src={currentFeature.image}
                width={1200}
              />

              <div className="feature-vignette absolute inset-0" />

              <div className="absolute right-5 top-5 rounded-lg border border-plum-border bg-plum-panel/80 p-4 backdrop-blur-md">

                <p className="text-[10px] font-bold uppercase text-plum-accent">
                  Module preview
                </p>

                <p className="mt-1 font-display text-lg font-extrabold">
                  {currentFeature.title}
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ================= DEALERSHIP RECORDS SECTION ================= */}

      <section
        id="dealership-records"
        className="flex min-h-svh items-center bg-card px-5 py-12 sm:px-8"
      >

        <div className="mx-auto grid w-full max-w-[1100px] items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">

          <div className="crm-scroll-left overflow-hidden rounded-xl bg-secondary p-4">

            <img
              alt="Dealership vehicle inventory"
              className="aspect-[4/3] w-full rounded-lg object-cover"
              height={900}
              loading="lazy"
              src={inventoryImage}
              width={1200}
            />

          </div>


          <div className="crm-scroll-right">

            <p className="text-xs font-bold uppercase text-primary">
              Dealership records
            </p>

            <h2 className="mt-3 font-display text-[clamp(2rem,3.5vw,3.4rem)] font-extrabold leading-tight">
              Keep day-to-day work in view.
            </h2>

            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Use dedicated pages for customers, leads, vehicles, test drives,
              sales, finance records, activities, and dealership users.
            </p>


            <ul className="mt-7 grid gap-3 text-sm font-semibold text-foreground">
              {["Customers and leads", "Vehicles and test drives", "Sales, finance, and activities"].map((item) => (
                <li key={item} className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
                  <Check className="size-4 shrink-0 text-primary" />{item}
                </li>
              ))}
            </ul>

          </div>

        </div>

      </section>


      {/* ================= DEALERSHIP WORKFLOW SECTION ================= */}

      <section className="flex min-h-svh items-center bg-plum px-5 py-12 text-plum-foreground sm:px-8">

        <div className="mx-auto grid w-full max-w-[1100px] items-center gap-10 md:grid-cols-2">

          <div className="crm-scroll-left">

            <p className="text-xs font-bold uppercase text-plum-accent">
              Dealership management
            </p>

            <h2 className="mt-3 font-display text-[clamp(2rem,3.5vw,3.4rem)] font-extrabold leading-tight">
              Manage the customer-to-sale workflow.
            </h2>

            <p className="mt-5 text-base leading-7 text-plum-muted">
              Keep customer and lead information alongside vehicles, test
              drives, sales, finance details, and activity records.
            </p>


            <ul className="mt-7 grid gap-4 text-sm font-semibold">

              <li className="flex items-center gap-3">
                <Users className="text-plum-accent" />
                Customer and lead management
              </li>

              <li className="flex items-center gap-3">
                <Check className="text-plum-accent" />
                Vehicle and test-drive records
              </li>

              <li className="flex items-center gap-3">
                <Users className="text-plum-accent" />
                Sales, finance, and activity records
              </li>

            </ul>


            <Button
              asChild
              className="mt-8 h-11 bg-plum-accent px-6 font-bold text-plum hover:bg-plum-accent/90"
            >
              <a href="/signup">
                Get Started
                <ArrowRight />
              </a>
            </Button>

          </div>


          <div className="crm-scroll-right overflow-hidden rounded-xl border border-plum-border bg-plum-panel p-3">

            <img
              alt="Dealership vehicle inventory"
              className="aspect-[4/3] w-full rounded-lg object-cover"
              height={900}
              loading="lazy"
              src={inventoryImage}
              width={1200}
            />

          </div>

        </div>

      </section>


      {/* ================= GET STARTED SECTION ================= */}


<section
  id="get-started"
  className="section-grid relative flex items-center px-5 py-12 sm:px-8"
>
  <div className="crm-scroll-reveal relative mx-auto w-full max-w-[1000px]">

   <div className="relative overflow-hidden rounded-2xl bg-[#7B3F8F] px-6 py-10 text-center text-white shadow-xl sm:px-10 sm:py-12">

      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 size-48 rounded-full border border-white/10" />

      <div className="relative z-10 mx-auto max-w-2xl">

        {/* Icon */}
        <div className="mx-auto grid size-10 place-items-center rounded-full border border-white/20 bg-white/10">
          <Check className="size-4" />
        </div>

        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
          Dealership CRM
        </p>

        <h2 className="mt-2 font-display text-[clamp(2rem,3.5vw,3rem)] font-extrabold leading-tight">
          Bring your dealership records together.
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/70">
          Manage customers, leads, vehicles, test drives, sales, finance,
          activities, and dealership users with AutoCRM.
        </p>

        {/* Buttons */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">

          <Button
            asChild
           className="h-10 rounded-lg bg-white px-6 text-sm font-bold text-[#7B3F8F] shadow-md hover:bg-white/90"
          >
            <a href="/signup">
              Get Started
              <ArrowUpRight />
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-10 rounded-lg border-white/25 bg-white/10 px-5 text-sm font-bold text-white hover:bg-white/20 hover:text-white"
          >
            <a href="/login">
              Login
              <ArrowRight />
            </a>
          </Button>

        </div>

      </div>

    </div>

  </div>
</section>


{/* ================= FOOTER ================= */}

<footer
  id="about"
  className="border-t border-border bg-background px-5 py-10 sm:px-8"
>
  <div className="mx-auto flex max-w-[1100px] flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">

    {/* Brand */}
    <div className="flex items-center gap-3">
      <AutoLogo />

      <div>
        <p className="font-display text-sm font-extrabold text-foreground">
          AutoCRM
        </p>

        <p className="text-xs text-muted-foreground">
          Dealership customer and sales management.
        </p>
      </div>
    </div>


    {/* Help */}
    <div className="text-left sm:text-right">

      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Need help?
      </p>

      <a
        href="mailto:autocrm2026@gmail.com"
       className="mt-1 inline-block text-sm font-medium text-[#7B3F8F] transition-colors hover:underline"
      >
        autocrm2026@gmail.com
      </a>

    </div>

  </div>


  {/* Copyright */}
  <div className="mx-auto mt-8 max-w-[1100px] border-t border-border pt-5 text-center text-xs text-muted-foreground">
    © 2026 AutoCRM. All rights reserved.
  </div>
</footer>

    </main>
  );
}

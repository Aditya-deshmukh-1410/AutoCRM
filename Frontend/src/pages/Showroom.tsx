import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarClock, CarFront, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { FeedbackMessage } from "../components/Feedback";

type PublicVehicle = {
  vehicleId: number;
  make: string;
  model: string;
  variant: string | null;
  year: number | null;
  price: number | null;
  kilometers: number | null;
  fuelType: string | null;
  transmission: string | null;
  color: string | null;
  status: string | null;
  dealershipName: string | null;
  dealershipLogoUrl: string | null;
  category: string | null;
  bodyType: string | null;
  ownerType: string | null;
  description: string | null;
  registrationAt: string | null;
  registrationType: string | null;
  insuranceType: string | null;
  sellerNote: string | null;
};

type PublicVehicleImage = {
  vehicleImageId: number;
};

const API_BASE_URL = "";

function PublicVehicleRequestForm({
  vehicle,
  mode,
  onClose,
  onSuccess,
}: {
  vehicle: PublicVehicle;
  mode: "enquiry" | "test-drive";
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);

  const submitEnquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const endpoint = mode === "enquiry" ? "enquiries" : "test-drives";
      const response = await fetch(`${API_BASE_URL}/api/public/vehicles/${vehicle.vehicleId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), ...(mode === "test-drive" ? { scheduledDateTime } : {}) }),
      });
      const responseText = await response.text();
      let responseBody: unknown = null;
      if (responseText) {
        try { responseBody = JSON.parse(responseText); } catch { responseBody = null; }
      }
      if (!response.ok) {
        const body = responseBody as Record<string, unknown> | null;
        const fieldMessage = body && Object.values(body).find((value): value is string => typeof value === "string");
        throw new Error(fieldMessage ?? `We couldn't ${mode === "enquiry" ? "send your enquiry" : "request a test drive"} (HTTP ${response.status}). Please try again.`);
      }
      const body = responseBody as { message?: unknown } | null;
      onSuccess(typeof body?.message === "string" ? body.message : mode === "enquiry" ? "Thanks. The dealership will contact you." : "Thanks. The dealership will confirm your test-drive appointment.");
      setName("");
      setPhone("");
      setEmail("");
      setScheduledDateTime("");
    } catch (submitError) {
      setFeedback({
        message: submitError instanceof Error ? submitError.message : mode === "enquiry" ? "We couldn't send your enquiry. Please try again." : "We couldn't request a test drive. Please try again.",
        success: false,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="request-heading" className="my-auto w-full max-w-lg rounded-xl border border-border bg-white p-5 shadow-xl sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 id="request-heading" className="font-display text-xl font-bold">{mode === "enquiry" ? "Enquire about this vehicle" : "Request a test drive"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{vehicle.make} {vehicle.model} · {formatPrice(vehicle.price)}</p>
        </div>
        <button type="button" onClick={onClose} disabled={submitting} aria-label="Close enquiry form" className="rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50">Close</button>
      </div>
      <form onSubmit={(event) => void submitEnquiry(event)} className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Name
        <input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Phone
          <input required maxLength={30} type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Email
          <input required maxLength={254} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" />
        </label>
      </div>
      {mode === "test-drive" && <label className="block text-xs font-medium text-muted-foreground">Preferred date and time<input required type="datetime-local" value={scheduledDateTime} onChange={(event) => setScheduledDateTime(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" /></label>}
      <button type="submit" disabled={submitting} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
        {submitting && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />}
        {submitting ? "Sending…" : mode === "enquiry" ? "Send enquiry" : "Request test drive"}
      </button>
      {feedback && <p role="alert" className="text-sm text-red-700">{feedback.message}</p>}
      <button type="button" onClick={onClose} disabled={submitting} className="ml-3 inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50">Cancel</button>
      </form>
      </section>
    </div>
  );
}

function displayValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "—" : value;
}

function formatPrice(price: number | null) {
  if (price === null) return "Price on request";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function statusStyle(status: string | null) {
  switch (status) {
    case "AVAILABLE":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "RESERVED":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "SOLD":
      return "border-brand-600/20 bg-brand-50 text-brand-700";
    default:
      return "border-border bg-secondary text-secondary-foreground";
  }
}

async function loadPublicVehicles(): Promise<PublicVehicle[]> {
  const response = await fetch(`${API_BASE_URL}/api/public/vehicles`);
  const responseText = await response.text();
  let responseBody: unknown = null;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = null;
    }
  }

  if (!response.ok) {
    const body = responseBody as { error?: unknown; message?: unknown } | null;
    const message = body && typeof body === "object"
      ? typeof body.error === "string" ? body.error : typeof body.message === "string" ? body.message : null
      : null;
    throw new Error(message || `The showroom could not be loaded (HTTP ${response.status}).`);
  }

  if (!Array.isArray(responseBody)) {
    throw new Error("The showroom response was not in the expected format.");
  }

  return responseBody as PublicVehicle[];
}

async function loadPublicVehiclePhoto(vehicleId: number): Promise<string | null> {
  const metadataResponse = await fetch(`${API_BASE_URL}/api/public/vehicles/${vehicleId}/images`);
  if (!metadataResponse.ok) return null;

  const metadataBody: unknown = await metadataResponse.json();
  if (!Array.isArray(metadataBody)) return null;

  const firstImage = metadataBody.find((item): item is PublicVehicleImage =>
    typeof item === "object" && item !== null &&
    "vehicleImageId" in item && typeof item.vehicleImageId === "number"
  );
  if (!firstImage) return null;

  const imageResponse = await fetch(
    `${API_BASE_URL}/api/public/vehicles/${vehicleId}/images/${firstImage.vehicleImageId}`
  );
  if (!imageResponse.ok) return null;

  const contentType = imageResponse.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!contentType || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) return null;

  const imageBlob = await imageResponse.blob();
  return imageBlob.size > 0 ? URL.createObjectURL(imageBlob) : null;
}

function PublicVehiclePhoto({ vehicleId }: { vehicleId: number }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    loadPublicVehiclePhoto(vehicleId)
      .then((url) => {
        if (!active) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setPhotoUrl(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [vehicleId]);

  return (
    <div className="grid aspect-[16/9] place-items-center overflow-hidden border-b border-border bg-[#faf8fb] text-brand-600" aria-label={photoUrl && !failed ? "Vehicle photo" : "No public vehicle photo available"}>
      {photoUrl && !failed ? (
        <img src={photoUrl} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex flex-col items-center gap-2 text-sm font-medium text-muted-foreground" role="status" aria-live="polite">
          {loading ? <LoaderCircle size={30} className="animate-spin text-primary" aria-hidden="true" /> : <CarFront size={34} aria-hidden="true" />}
          <span>{loading ? "Loading photo…" : failed ? "Photo unavailable" : "No photo available"}</span>
        </div>
      )}
    </div>
  );
}

export default function Showroom() {
  const [vehicles, setVehicles] = useState<PublicVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<PublicVehicle | null>(null);
  const [requestMode, setRequestMode] = useState<"enquiry" | "test-drive">("enquiry");
  const [enquiryConfirmation, setEnquiryConfirmation] = useState("");
  const [search, setSearch] = useState("");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [transmission, setTransmission] = useState("");

  const loadVehicles = useCallback(async () => {
    try {
      setVehicles(await loadPublicVehicles());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The showroom could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  const retryLoading = () => {
    setLoading(true);
    setError("");
    void loadVehicles();
  };

  useEffect(() => {
    let active = true;
    loadPublicVehicles()
      .then((data) => {
        if (active) setVehicles(data);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "The showroom could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const fuelTypes = [...new Set(vehicles.map((vehicle) => vehicle.fuelType).filter((value): value is string => Boolean(value?.trim())))].sort();
  const transmissions = [...new Set(vehicles.map((vehicle) => vehicle.transmission).filter((value): value is string => Boolean(value?.trim())))].sort();
  const normalizedSearch = search.trim().toLowerCase();
  const minimum = minimumPrice === "" ? null : Number(minimumPrice);
  const maximum = maximumPrice === "" ? null : Number(maximumPrice);
  const invalidPriceRange = minimum !== null && maximum !== null &&
    Number.isFinite(minimum) && Number.isFinite(maximum) && minimum > maximum;
  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch = !normalizedSearch || `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(normalizedSearch);
    const matchesMinimum = invalidPriceRange || minimum === null || (vehicle.price !== null && vehicle.price >= minimum);
    const matchesMaximum = invalidPriceRange || maximum === null || (vehicle.price !== null && vehicle.price <= maximum);
    return matchesSearch && matchesMinimum && matchesMaximum &&
      (!fuelType || vehicle.fuelType === fuelType) &&
      (!transmission || vehicle.transmission === transmission);
  });

  const clearFilters = () => {
    setSearch("");
    setMinimumPrice("");
    setMaximumPrice("");
    setFuelType("");
    setTransmission("");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3 rounded-md font-display font-extrabold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
            <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">A</span>
            <span>AutoCRM</span>
          </Link>
          <nav aria-label="Public navigation" className="flex items-center gap-2 sm:gap-4">
            <Link to="/" className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">Home</Link>
            <Link to="/login" className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">Login</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-12">
        <section className="mb-7 border-b border-brand-600/10 pb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">AutoCRM vehicle showroom</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Vehicles available to browse</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Explore vehicles that participating dealerships have chosen to publish.</p>
        </section>

        {enquiryConfirmation && <div className="mb-5"><FeedbackMessage message={enquiryConfirmation} tone="success" /></div>}

        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-3 rounded-xl border border-border bg-white text-sm font-medium text-muted-foreground" role="status" aria-live="polite">
            <LoaderCircle size={20} className="animate-spin text-primary" aria-hidden="true" />
            Loading published vehicles…
          </div>
        ) : error ? (
          <FeedbackMessage
            message={error}
            action={{ label: "Retry", onClick: () => void retryLoading() }}
            className="bg-white"
          />
        ) : vehicles.length === 0 ? (
          <div className="rounded-xl border border-border bg-white px-6 py-14 text-center">
            <CarFront size={30} className="mx-auto text-primary" aria-hidden="true" />
            <h2 className="mt-4 font-display text-lg font-bold">No vehicles are published right now</h2>
            <p className="mt-2 text-sm text-muted-foreground">Please check back later for dealership listings.</p>
          </div>
        ) : (
          <>
            <section aria-label="Search and filter published vehicles" className="mb-6 rounded-xl border border-brand-600/15 bg-white p-4 shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)] sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <label className="block text-xs font-semibold text-muted-foreground sm:col-span-2 xl:col-span-1">
                  Search make or model
                  <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. Honda City" className="input mt-1 h-10 w-full" />
                </label>
                <label className="block text-xs font-semibold text-muted-foreground">
                  Minimum price
                  <input type="number" min="0" step="1" value={minimumPrice} onChange={(event) => setMinimumPrice(event.target.value)} placeholder="No minimum" className="input mt-1 h-10 w-full" />
                </label>
                <label className="block text-xs font-semibold text-muted-foreground">
                  Maximum price
                  <input type="number" min="0" step="1" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} placeholder="No maximum" className="input mt-1 h-10 w-full" />
                </label>
                <label className="block text-xs font-semibold text-muted-foreground">
                  Fuel type
                  <select value={fuelType} onChange={(event) => setFuelType(event.target.value)} className="input mt-1 h-10 w-full">
                    <option value="">All fuel types</option>
                    {fuelTypes.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted-foreground">
                  Transmission
                  <select value={transmission} onChange={(event) => setTransmission(event.target.value)} className="input mt-1 h-10 w-full">
                    <option value="">All transmissions</option>
                    {transmissions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              </div>
              {invalidPriceRange && (
                <p role="alert" className="mt-3 text-sm font-medium text-red-700">
                  Maximum price must be greater than or equal to minimum price.
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-sm font-medium text-muted-foreground" aria-live="polite">Showing <span className="font-bold text-foreground">{filteredVehicles.length}</span> of {vehicles.length} published vehicles</p>
                <button type="button" onClick={clearFilters} disabled={!search && !minimumPrice && !maximumPrice && !fuelType && !transmission} className="rounded-md px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent">Clear filters</button>
              </div>
            </section>

            {filteredVehicles.length === 0 ? (
              <div className="rounded-xl border border-border bg-white px-6 py-14 text-center">
                <CarFront size={30} className="mx-auto text-primary" aria-hidden="true" />
                <h2 className="mt-4 font-display text-lg font-bold">No vehicles match these filters</h2>
                <p className="mt-2 text-sm text-muted-foreground">Adjust your search or clear the filters to see published vehicles.</p>
                <button type="button" onClick={clearFilters} className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">Clear filters</button>
              </div>
            ) : (
              <section aria-label="Published vehicles" aria-busy={loading} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredVehicles.map((vehicle) => (
              <article key={vehicle.vehicleId} className="overflow-hidden rounded-xl border border-brand-600/15 bg-white shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)]">
                <PublicVehiclePhoto vehicleId={vehicle.vehicleId} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-bold leading-snug">{vehicle.make} {vehicle.model}</h2>
                      {vehicle.variant && <p className="mt-1 text-sm text-muted-foreground">{vehicle.variant}</p>}
                    </div>
                    {vehicle.status && <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(vehicle.status)}`}>{vehicle.status.replaceAll("_", " ")}</span>}
                  </div>
                  {vehicle.dealershipName && <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs font-semibold text-muted-foreground">{vehicle.dealershipLogoUrl && <img src={`${API_BASE_URL}${vehicle.dealershipLogoUrl}`} alt="" className="size-7 rounded-full border object-contain p-0.5" />}<span>{vehicle.dealershipName}</span></div>}
                  <p className="mt-4 font-display text-xl font-extrabold text-primary">{formatPrice(vehicle.price)}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm">
                    <div><dt className="text-xs text-muted-foreground">Year</dt><dd className="mt-0.5 font-semibold">{displayValue(vehicle.year)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Mileage</dt><dd className="mt-0.5 font-semibold">{vehicle.kilometers === null ? "—" : `${new Intl.NumberFormat("en-IN").format(vehicle.kilometers)} km`}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Category</dt><dd className="mt-0.5 font-semibold">{displayValue(vehicle.category)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Body type</dt><dd className="mt-0.5 font-semibold">{displayValue(vehicle.bodyType)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Owner</dt><dd className="mt-0.5 font-semibold">{displayValue(vehicle.ownerType)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Fuel</dt><dd className="mt-0.5 font-semibold">{displayValue(vehicle.fuelType)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Transmission</dt><dd className="mt-0.5 font-semibold">{displayValue(vehicle.transmission)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Insurance</dt><dd className="mt-0.5 font-semibold">{displayValue(vehicle.insuranceType)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Registration</dt><dd className="mt-0.5 font-semibold">{displayValue(vehicle.registrationType)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Registered at</dt><dd className="mt-0.5 font-semibold">{displayValue(vehicle.registrationAt)}</dd></div>
                    <div className="col-span-2"><dt className="text-xs text-muted-foreground">Color</dt><dd className="mt-0.5 font-semibold">{displayValue(vehicle.color)}</dd></div>
                  </dl>
                  {vehicle.description && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{vehicle.description}</p>}
                  {vehicle.sellerNote && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{vehicle.sellerNote}</p>}
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => { setEnquiryConfirmation(""); setRequestMode("enquiry"); setSelectedVehicle(vehicle); }} className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">I&apos;m Interested</button>
                    <button type="button" onClick={() => { setEnquiryConfirmation(""); setRequestMode("test-drive"); setSelectedVehicle(vehicle); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-600 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"><CalendarClock size={16} aria-hidden="true" /> Book test drive</button>
                  </div>
                </div>
              </article>
            ))}
              </section>
            )}
          </>
        )}
      </div>
      {selectedVehicle && <PublicVehicleRequestForm vehicle={selectedVehicle} mode={requestMode} onClose={() => setSelectedVehicle(null)} onSuccess={(message) => { setSelectedVehicle(null); setEnquiryConfirmation(message); }} />}
    </main>
  );
}

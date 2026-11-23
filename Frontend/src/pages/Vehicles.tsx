import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CarFront, LoaderCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Field from "../components/Field";
import { Button } from "../components/ui/button";
import { FeedbackMessage, SuccessToast } from "../components/Feedback";
import { handleUnauthorizedResponse } from "../lib/unauthorized";
import AuditHistoryLink from "../components/AuditHistoryLink";
import PageHeader from "../components/PageHeader";

type VehicleStatus = "AVAILABLE" | "RESERVED" | "SOLD";
type FuelType = "PETROL" | "DIESEL" | "CNG" | "ELECTRIC" | "HYBRID";
type Transmission = "MANUAL" | "AUTOMATIC";
type CategoryOption = { optionId: number; optionType: "LEAD_SOURCE" | "VEHICLE_CATEGORY"; value: string; active: boolean };

type Vehicle = {
  vehicleId: number;
  make: string;
  model: string;
  variant: string | null;
  category: string | null;
  bodyType: string | null;
  ownerType: string | null;
  description: string | null;
  year: number;
  fuelType: FuelType;
  transmission: Transmission;
  kilometers: number;
  price: number;
  color: string | null;
  registrationNumber: string;
  registrationAt: string | null;
  registrationType: string | null;
  insuranceType: string | null;
  sellerNote: string | null;
  status: VehicleStatus;
  publiclyVisible: boolean;
  tenantId: number;
};

type VehicleImageResponse = {
  vehicleImageId: number;
  contentType: string;
  fileSize: number;
  createdAt: string;
};

type VehiclePhotoView = VehicleImageResponse & {
  previewUrl: string | null;
  previewError?: string;
};

type VehicleInspection = {
  inspectionId: number;
  vehicleId: number;
  inspectionDate: string;
  inspectorEmail: string | null;
  inspectionStatus: string | null;
  conditionSummary: string | null;
  identifiedDefects: string | null;
  mechanicalCondition: string | null;
  bodyCondition: string | null;
  odometerReading: number | null;
  accidentHistory: string | null;
  serviceHistory: string | null;
  documentStatus: string | null;
  certificationStatus: string | null;
  warrantyInformation: string | null;
  notes: string | null;
};

type InspectionForm = {
  inspectionDate: string;
  inspectionStatus: string;
  conditionSummary: string;
  identifiedDefects: string;
  mechanicalCondition: string;
  bodyCondition: string;
  odometerReading: string;
  accidentHistory: string;
  serviceHistory: string;
  documentStatus: string;
  certificationStatus: string;
  warrantyInformation: string;
  notes: string;
};

const EMPTY_INSPECTION_FORM: InspectionForm = {
  inspectionDate: new Date().toISOString().slice(0, 10),
  inspectionStatus: "",
  conditionSummary: "",
  identifiedDefects: "",
  mechanicalCondition: "",
  bodyCondition: "",
  odometerReading: "",
  accidentHistory: "",
  serviceHistory: "",
  documentStatus: "",
  certificationStatus: "",
  warrantyInformation: "",
  notes: "",
};

function VehicleThumbnail({
  photo,
  loading,
  broken,
  unavailableMessage,
  onBroken,
}: {
  photo?: VehiclePhotoView;
  loading: boolean;
  broken: boolean;
  unavailableMessage?: string;
  onBroken: () => void;
}) {
  return (
    <span role="img" title={loading ? "Loading vehicle photo" : photo?.previewUrl && !broken ? "Vehicle photo" : unavailableMessage ?? (photo ? "Vehicle photo unavailable" : "No vehicle photo")} className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-brand-600/10 bg-[#faf8fb] text-brand-600" aria-label={loading ? "Loading vehicle photo" : photo?.previewUrl && !broken ? "Vehicle photo" : unavailableMessage ?? (photo ? "Vehicle photo unavailable" : "No vehicle photo")}>
      {loading ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : photo?.previewUrl && !broken ? (
        <img src={photo.previewUrl} alt="" className="size-full object-cover" onError={onBroken} />
      ) : <CarFront size={20} aria-hidden="true" />}
    </span>
  );
}

type SelectedVehiclePhoto = {
  selectionId: number;
  file: File;
  previewUrl: string;
};

type VehicleForm = {
  make: string;
  model: string;
  variant: string;
  category: string;
  bodyType: string;
  ownerType: string;
  description: string;
  year: string;
  fuelType: FuelType | "";
  transmission: Transmission | "";
  kilometers: string;
  price: string;
  color: string;
  registrationNumber: string;
  registrationAt: string;
  registrationType: string;
  insuranceType: string;
  sellerNote: string;
  status: VehicleStatus | "";
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: string | FormData;
};

const API_BASE_URL = "";
const MAX_VEHICLE_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VEHICLE_IMAGES = 10;
const VEHICLE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FUEL_TYPES: FuelType[] = ["PETROL", "DIESEL", "CNG", "ELECTRIC", "HYBRID"];
const TRANSMISSIONS: Transmission[] = ["MANUAL", "AUTOMATIC"];
const VEHICLE_STATUSES: VehicleStatus[] = ["AVAILABLE", "RESERVED", "SOLD"];
const BODY_TYPES = ["Hatchback", "Sedan", "SUV/MUV", "Convertible", "Coupe", "Station Wagon", "Minivan/Van", "Truck"];
const OWNER_TYPES = ["First", "Second", "Third", "Fourth or more"];
const REGISTRATION_TYPES = ["Individual", "Corporate"];
const INSURANCE_TYPES = ["Comprehensive", "Third Party", "No Insurance"];
const EMPTY_FORM: VehicleForm = {
  make: "",
  model: "",
  variant: "",
  category: "",
  bodyType: "",
  ownerType: "",
  description: "",
  year: "",
  fuelType: "",
  transmission: "",
  kilometers: "",
  price: "",
  color: "",
  registrationNumber: "",
  registrationAt: "",
  registrationType: "",
  insuranceType: "",
  sellerNote: "",
  status: "",
};

const STATUS_STYLES: Record<VehicleStatus, string> = {
  AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RESERVED: "border-amber-200 bg-amber-50 text-amber-800",
  SOLD: "border-brand-300 bg-brand-50 text-brand-700",
};

function getStoredRole() {
  try {
    const storedUser: unknown = JSON.parse(localStorage.getItem("autocrm_user") ?? "null");
    return typeof storedUser === "object" && storedUser !== null && "role" in storedUser && typeof storedUser.role === "string"
      ? storedUser.role.toUpperCase()
      : "";
  } catch { return ""; }
}

async function vehicleRequest<T>(path: string, token: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(typeof options.body === "string" ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body,
  });

  if (handleUnauthorizedResponse(response)) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const responseText = await response.text();
  let responseBody: unknown = responseText;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }
  }

  if (!response.ok) {
    const body = responseBody as { error?: unknown } | string | null;
    const message =
      typeof body === "object" && body !== null && typeof body.error === "string"
        ? body.error
        : typeof body === "string" && body.trim()
          ? body
          : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return responseBody as T;
}

function uploadVehicleImage(vehicleId: number, file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);
  return vehicleRequest<VehicleImageResponse>(`/api/vehicles/${vehicleId}/images`, token, {
    method: "POST",
    body: formData,
  });
}

async function getVehicleImageBlob(vehicleId: number, imageId: number, token: string) {
  const response = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/images/${imageId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (handleUnauthorizedResponse(response)) {
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    const responseText = await response.text();
    let message = responseText;
    try {
      const body: unknown = JSON.parse(responseText);
      if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // Keep a plain-text error response as the useful message.
    }
    throw new Error(message || `Photo request failed (${response.status}).`);
  }

  return response.blob();
}

async function loadVehiclePhotoViews(
  vehicleId: number,
  token: string,
  firstOnly: boolean,
  imageUrls: Map<number, string>,
): Promise<VehiclePhotoView[]> {
  const metadata = await vehicleRequest<VehicleImageResponse[]>(`/api/vehicles/${vehicleId}/images`, token);
  if (!Array.isArray(metadata)) throw new Error("The vehicle photo list response was not valid.");
  const images = firstOnly ? metadata.slice(0, 1) : metadata;
  return Promise.all(images.map(async (image) => {
    try {
      let previewUrl = imageUrls.get(image.vehicleImageId);
      if (!previewUrl) {
        const blob = await getVehicleImageBlob(vehicleId, image.vehicleImageId, token);
        if (blob.size === 0) throw new Error("The photo file is empty.");
        previewUrl = URL.createObjectURL(blob);
        imageUrls.set(image.vehicleImageId, previewUrl);
      }
      return { ...image, previewUrl };
    } catch (photoError) {
      return {
        ...image,
        previewUrl: null,
        previewError: photoError instanceof Error ? photoError.message : "Photo preview could not be loaded.",
      };
    }
  }));
}

function isSupportedVehiclePhoto(file: File) {
  return file.type
    ? VEHICLE_IMAGE_TYPES.includes(file.type)
    : /\.(jpe?g|png|webp)$/i.test(file.name);
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price);
}

export default function Vehicles() {
  const canManagePublication = getStoredRole() === "ADMIN";
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publicationUpdatingId, setPublicationUpdatingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<VehicleForm>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageInputKey, setImageInputKey] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);
  const [imageError, setImageError] = useState("");
  const imagePreviewUrlRef = useRef<string | null>(null);
  const [createPhotos, setCreatePhotos] = useState<SelectedVehiclePhoto[]>([]);
  const createPhotoUrlsRef = useRef<string[]>([]);
  const nextPhotoSelectionId = useRef(0);
  const [photoUploadProgress, setPhotoUploadProgress] = useState("");
  const [vehiclePhotos, setVehiclePhotos] = useState<Record<number, VehiclePhotoView[]>>({});
  const [vehiclePhotoLoading, setVehiclePhotoLoading] = useState<Record<number, boolean>>({});
  const [vehiclePhotoErrors, setVehiclePhotoErrors] = useState<Record<number, string>>({});
  const [detailPhotos, setDetailPhotos] = useState<VehiclePhotoView[]>([]);
  const [detailPhotosLoading, setDetailPhotosLoading] = useState(false);
  const [detailPhotosError, setDetailPhotosError] = useState("");
  const [detailPhotosVehicleId, setDetailPhotosVehicleId] = useState<number | null>(null);
  const [detailPhotoRouteError, setDetailPhotoRouteError] = useState<{ vehicleId: number; message: string } | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);
  const [detailVehicleLoadError, setDetailVehicleLoadError] = useState<{ vehicleId: number; message: string } | null>(null);
  const [detailReloadToken, setDetailReloadToken] = useState(0);
  const [inspections, setInspections] = useState<VehicleInspection[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);
  const [inspectionsError, setInspectionsError] = useState("");
  const [inspectionsVehicleId, setInspectionsVehicleId] = useState<number | null>(null);
  const [inspectionReloadToken, setInspectionReloadToken] = useState(0);
  const [inspectionFormOpen, setInspectionFormOpen] = useState(false);
  const [inspectionForm, setInspectionForm] = useState<InspectionForm>(EMPTY_INSPECTION_FORM);
  const [inspectionSaving, setInspectionSaving] = useState(false);
  const [inspectionError, setInspectionError] = useState("");
  const [inspectionNotice, setInspectionNotice] = useState("");
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Set<number>>(() => new Set());
  const vehicleImageUrlsRef = useRef<Map<number, string>>(new Map());
  const { vehicleId: routeVehicleId } = useParams();
  const navigate = useNavigate();
  const isDetailsRoute = routeVehicleId !== undefined;
  const requestedVehicleId = Number(routeVehicleId);
  const hasValidRequestedVehicleId = Number.isSafeInteger(requestedVehicleId) && requestedVehicleId > 0;

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("autocrm_token");
    if (!token) return () => { active = false; };
    void vehicleRequest<CategoryOption[]>("/api/dealership-settings", token)
      .then((options) => { if (active) setVehicleCategories(options.filter((option) => option.optionType === "VEHICLE_CATEGORY" && option.active)); })
      .catch((settingsError: unknown) => { if (active) setError(settingsError instanceof Error ? settingsError.message : "Could not load vehicle categories."); });
    return () => { active = false; };
  }, []);

  const clearImageSelection = () => {
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    imagePreviewUrlRef.current = null;
    setImagePreviewUrl("");
    setImageFile(null);
  };

  const clearCreatePhotos = () => {
    createPhotoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    createPhotoUrlsRef.current = [];
    setCreatePhotos([]);
  };

  const closeForm = () => {
    clearImageSelection();
    clearCreatePhotos();
    setImageError("");
    setPhotoUploadProgress("");
    if (!isDetailsRoute) {
      setDetailPhotos([]);
      setDetailPhotosError("");
      setDetailPhotosVehicleId(null);
    }
    setFormOpen(false);
  };

  const loadVehicleThumbnail = async (vehicleId: number, token: string) => {
    setVehiclePhotoLoading((current) => ({ ...current, [vehicleId]: true }));
    setVehiclePhotoErrors((current) => ({ ...current, [vehicleId]: "" }));
    try {
      const images = await loadVehiclePhotoViews(vehicleId, token, true, vehicleImageUrlsRef.current);
      setVehiclePhotos((current) => ({ ...current, [vehicleId]: images }));
      if (images[0]) setBrokenPhotoIds((current) => new Set([...current].filter((id) => id !== images[0].vehicleImageId)));
    } catch (photoError) {
      setVehiclePhotoErrors((current) => ({
        ...current,
        [vehicleId]: photoError instanceof Error ? photoError.message : "Vehicle photo could not be loaded.",
      }));
    } finally {
      setVehiclePhotoLoading((current) => ({ ...current, [vehicleId]: false }));
    }
  };

  const loadDetailPhotos = async (vehicleId: number) => {
    setDetailPhotosLoading(true);
    setDetailPhotosError("");
    setDetailPhotos([]);
    setDetailPhotosVehicleId(null);
    setDetailPhotoRouteError(null);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const images = await loadVehiclePhotoViews(vehicleId, token, false, vehicleImageUrlsRef.current);
      setDetailPhotos(images);
      setDetailPhotosVehicleId(vehicleId);
      setVehiclePhotos((current) => ({ ...current, [vehicleId]: images.slice(0, 1) }));
      setBrokenPhotoIds((current) => new Set([...current].filter((id) => !images.some((image) => image.vehicleImageId === id))));
      if (images.some((image) => image.previewError)) setDetailPhotosError("One or more photos could not be previewed.");
      setVehiclePhotoErrors((current) => ({ ...current, [vehicleId]: "" }));
    } catch (photoError) {
      const message = photoError instanceof Error ? photoError.message : "Vehicle photos could not be loaded.";
      setDetailPhotosError(message);
      setDetailPhotoRouteError({ vehicleId, message });
    } finally {
      setDetailPhotosLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (isDetailsRoute) {
      return () => { active = false; };
    }

    const loadVehicles = async () => {
      try {
        const token = localStorage.getItem("autocrm_token");
        if (!token) throw new Error("Your session has expired. Please log in again.");

        const data = await vehicleRequest<Vehicle[]>("/api/vehicles", token);
        if (!Array.isArray(data)) throw new Error("The vehicle list response was not valid.");
        if (active) {
          setVehicles(data);
          setVehiclePhotoLoading(Object.fromEntries(data.map((vehicle) => [vehicle.vehicleId, true])));
        }
      } catch (requestError) {
        if (active) {
          setLoadError(requestError instanceof Error ? requestError.message : "Failed to load vehicles.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadVehicles();
    return () => { active = false; };
  }, [isDetailsRoute]);

  useEffect(() => () => {
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    createPhotoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    vehicleImageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (!isDetailsRoute || !hasValidRequestedVehicleId) return;
    let active = true;
    const loadVehicleDetails = async () => {
      try {
        const token = localStorage.getItem("autocrm_token");
        if (!token) throw new Error("Your session has expired. Please log in again.");
        const vehicle = await vehicleRequest<Vehicle>(`/api/vehicles/${requestedVehicleId}`, token);
        if (!active) return;
        setDetailVehicle(vehicle);
        setDetailVehicleLoadError(null);
        try {
          const photos = await loadVehiclePhotoViews(vehicle.vehicleId, token, false, vehicleImageUrlsRef.current);
          if (!active) return;
          setDetailPhotos(photos);
          setDetailPhotosVehicleId(vehicle.vehicleId);
          setVehiclePhotos((current) => ({ ...current, [vehicle.vehicleId]: photos.slice(0, 1) }));
          setBrokenPhotoIds((current) => new Set([...current].filter((id) => !photos.some((photo) => photo.vehicleImageId === id))));
          setDetailPhotosError(photos.some((photo) => photo.previewError) ? "One or more photos could not be previewed." : "");
          setDetailPhotoRouteError(null);
        } catch (photoError) {
          if (!active) return;
          const message = photoError instanceof Error ? photoError.message : "Vehicle photos could not be loaded.";
          setDetailPhotos([]);
          setDetailPhotosVehicleId(vehicle.vehicleId);
          setDetailPhotosError(message);
          setDetailPhotoRouteError({ vehicleId: vehicle.vehicleId, message });
        }
      } catch (requestError) {
        if (active) setDetailVehicleLoadError({
          vehicleId: requestedVehicleId,
          message: requestError instanceof Error ? requestError.message : "Failed to load vehicle details.",
        });
      }
    };
    void loadVehicleDetails();
    return () => { active = false; };
  }, [isDetailsRoute, hasValidRequestedVehicleId, requestedVehicleId, detailReloadToken]);

  useEffect(() => {
    if (!isDetailsRoute || !hasValidRequestedVehicleId || detailVehicle?.vehicleId !== requestedVehicleId) return;
    let active = true;
    const loadInspections = async () => {
      setInspectionsLoading(true);
      setInspectionsError("");
      try {
        const token = localStorage.getItem("autocrm_token");
        if (!token) throw new Error("Your session has expired. Please log in again.");
        const data = await vehicleRequest<VehicleInspection[]>(`/api/vehicle-inspections/vehicle/${requestedVehicleId}`, token);
        if (!Array.isArray(data)) throw new Error("The inspection history response was not valid.");
        if (active) {
          setInspections(data);
          setInspectionsVehicleId(requestedVehicleId);
        }
      } catch (requestError) {
        if (active) setInspectionsError(requestError instanceof Error ? requestError.message : "Inspection history could not be loaded.");
      } finally {
        if (active) setInspectionsLoading(false);
      }
    };
    void loadInspections();
    return () => { active = false; };
  }, [isDetailsRoute, hasValidRequestedVehicleId, requestedVehicleId, detailVehicle?.vehicleId, inspectionReloadToken]);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("autocrm_token");
    if (!token || vehicles.length === 0) return () => { active = false; };

    vehicles.forEach((vehicle) => {
      void loadVehiclePhotoViews(vehicle.vehicleId, token, true, vehicleImageUrlsRef.current)
        .then((images) => {
          if (active) {
            setVehiclePhotos((current) => ({ ...current, [vehicle.vehicleId]: images }));
            if (images[0]) setBrokenPhotoIds((current) => new Set([...current].filter((id) => id !== images[0].vehicleImageId)));
            setVehiclePhotoErrors((current) => ({ ...current, [vehicle.vehicleId]: "" }));
          }
        })
        .catch((photoError: unknown) => {
          if (active) setVehiclePhotoErrors((current) => ({
            ...current,
            [vehicle.vehicleId]: photoError instanceof Error ? photoError.message : "Vehicle photo could not be loaded.",
          }));
        })
        .finally(() => {
          if (active) setVehiclePhotoLoading((current) => ({ ...current, [vehicle.vehicleId]: false }));
        });
    });

    return () => { active = false; };
  }, [vehicles]);

  const openCreateForm = () => {
    setError("");
    setNotice("");
    setImageError("");
    clearImageSelection();
    clearCreatePhotos();
    setPhotoUploadProgress("");
    setDetailPhotos([]);
    setDetailPhotosError("");
    setImageInputKey((key) => key + 1);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = async (vehicleId: number) => {
    setError("");
    setNotice("");
    setImageError("");
    clearImageSelection();
    clearCreatePhotos();
    setPhotoUploadProgress("");
    setDetailPhotos([]);
    setDetailPhotosError("");
    setDetailPhotosLoading(true);
    setImageInputKey((key) => key + 1);
    setEditingId(vehicleId);
    setFormLoading(true);
    setFormOpen(true);

    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const vehicle = await vehicleRequest<Vehicle>(`/api/vehicles/${vehicleId}`, token);
      setForm({
        make: vehicle.make,
        model: vehicle.model,
        variant: vehicle.variant ?? "",
        category: vehicle.category ?? "",
        bodyType: vehicle.bodyType ?? "",
        ownerType: vehicle.ownerType ?? "",
        description: vehicle.description ?? "",
        year: String(vehicle.year),
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        kilometers: String(vehicle.kilometers),
        price: String(vehicle.price),
        color: vehicle.color ?? "",
        registrationNumber: vehicle.registrationNumber,
        registrationAt: vehicle.registrationAt ?? "",
        registrationType: vehicle.registrationType ?? "",
        insuranceType: vehicle.insuranceType ?? "",
        sellerNote: vehicle.sellerNote ?? "",
        status: vehicle.status,
      });
      await loadDetailPhotos(vehicleId);
    } catch (requestError) {
      setDetailPhotosLoading(false);
      setFormOpen(false);
      setError(requestError instanceof Error ? requestError.message : "Failed to load vehicle.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleInspectionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentDetailVehicle) return;
    setInspectionError("");
    setInspectionNotice("");
    setInspectionSaving(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const body = JSON.stringify({
        vehicleId: currentDetailVehicle.vehicleId,
        inspectionDate: inspectionForm.inspectionDate,
        inspectionStatus: inspectionForm.inspectionStatus.trim() || null,
        conditionSummary: inspectionForm.conditionSummary.trim() || null,
        identifiedDefects: inspectionForm.identifiedDefects.trim() || null,
        mechanicalCondition: inspectionForm.mechanicalCondition.trim() || null,
        bodyCondition: inspectionForm.bodyCondition.trim() || null,
        odometerReading: inspectionForm.odometerReading.trim() ? Number(inspectionForm.odometerReading) : null,
        accidentHistory: inspectionForm.accidentHistory.trim() || null,
        serviceHistory: inspectionForm.serviceHistory.trim() || null,
        documentStatus: inspectionForm.documentStatus.trim() || null,
        certificationStatus: inspectionForm.certificationStatus.trim() || null,
        warrantyInformation: inspectionForm.warrantyInformation.trim() || null,
        notes: inspectionForm.notes.trim() || null,
      });
      const created = await vehicleRequest<VehicleInspection>("/api/vehicle-inspections", token, { method: "POST", body });
      if (created.vehicleId !== currentDetailVehicle.vehicleId || !created.inspectionId) {
        throw new Error("The inspection was saved, but the returned record could not be matched to this vehicle. Retry loading the history.");
      }
      setInspectionNotice("Inspection record saved. The recorded observations do not represent an independent certification.");
      setInspectionForm(EMPTY_INSPECTION_FORM);
      setInspectionFormOpen(false);
      setInspectionReloadToken((value) => value + 1);
    } catch (requestError) {
      setInspectionError(requestError instanceof Error ? requestError.message : "Inspection record could not be saved.");
    } finally {
      setInspectionSaving(false);
    }
  };

  const handleImageUpload = async () => {
    if (editingId === null || !imageFile) return;

    if (detailPhotos.length >= MAX_VEHICLE_IMAGES) {
      setImageError(`A vehicle can have no more than ${MAX_VEHICLE_IMAGES} photos.`);
      return;
    }

    setImageError("");
    setNotice("");
    setImageUploading(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const uploadedImage = await uploadVehicleImage(editingId, imageFile, token);

      clearImageSelection();
      setImageInputKey((key) => key + 1);
      setNotice(`Vehicle photo uploaded (${uploadedImage.contentType}, ${Math.round(uploadedImage.fileSize / 1024)} KB).`);
      await loadDetailPhotos(editingId);
    } catch (requestError) {
      setImageError(requestError instanceof Error ? requestError.message : "Failed to upload vehicle photo.");
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageDelete = async (photo: VehiclePhotoView) => {
    if (editingId === null) return;
    setImageError("");
    setDeletingPhotoId(photo.vehicleImageId);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      await vehicleRequest<unknown>(`/api/vehicles/${editingId}/images/${photo.vehicleImageId}`, token, { method: "DELETE" });
      const cachedUrl = vehicleImageUrlsRef.current.get(photo.vehicleImageId);
      if (cachedUrl) URL.revokeObjectURL(cachedUrl);
      vehicleImageUrlsRef.current.delete(photo.vehicleImageId);
      setBrokenPhotoIds((current) => new Set([...current].filter((id) => id !== photo.vehicleImageId)));
      setNotice("Vehicle photo removed.");
      await loadDetailPhotos(editingId);
      await loadVehicleThumbnail(editingId, token);
    } catch (requestError) {
      setImageError(requestError instanceof Error ? requestError.message : "Could not remove the vehicle photo.");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.fuelType || !form.transmission || !form.status) {
      setError("Choose a fuel type, transmission, and inventory status.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const body = JSON.stringify({
        make: form.make.trim(),
        model: form.model.trim(),
        variant: form.variant.trim() || null,
        category: form.category.trim() || null,
        bodyType: form.bodyType || null,
        ownerType: form.ownerType || null,
        description: form.description.trim() || null,
        year: Number(form.year),
        fuelType: form.fuelType,
        transmission: form.transmission,
        kilometers: Number(form.kilometers),
        price: Number(form.price),
        color: form.color.trim() || null,
        registrationNumber: form.registrationNumber.trim(),
        registrationAt: form.registrationAt.trim() || null,
        registrationType: form.registrationType || null,
        insuranceType: form.insuranceType || null,
        sellerNote: form.sellerNote.trim() || null,
        status: form.status,
      });

      if (editingId === null) {
        const created = await vehicleRequest<Vehicle>("/api/vehicles", token, { method: "POST", body });
        setVehicles((current) => [created, ...current]);
        setVehiclePhotoLoading((current) => ({ ...current, [created.vehicleId]: true }));
        if (createPhotos.length === 0) {
          setNotice("Vehicle added to inventory.");
        } else {
          let uploadedCount = 0;
          const uploadFailures: string[] = [];

          for (let index = 0; index < createPhotos.length; index += 1) {
            const photo = createPhotos[index];
            setPhotoUploadProgress(`Vehicle created. Uploading photo ${index + 1} of ${createPhotos.length}…`);
            try {
              await uploadVehicleImage(created.vehicleId, photo.file, token);
              uploadedCount += 1;
            } catch (uploadError) {
              const message = uploadError instanceof Error ? uploadError.message : "Upload failed.";
              uploadFailures.push(`${photo.file.name}: ${message}`);
              if (message.includes("Your session has expired.")) {
                createPhotos.slice(index + 1).forEach((remainingPhoto) => {
                  uploadFailures.push(`${remainingPhoto.file.name}: not attempted because sign-in is required.`);
                });
                break;
              }
            }
          }

          setNotice(`Vehicle added successfully. ${uploadedCount} of ${createPhotos.length} photos uploaded.`);
          if (uploadFailures.length > 0) {
            setError(`Photo upload incomplete: ${uploadFailures.join("; ")}. Edit this vehicle to retry the failed photos.`);
          }
          if (uploadedCount > 0) void loadVehicleThumbnail(created.vehicleId, token);
        }
      } else {
        const updated = await vehicleRequest<Vehicle>(`/api/vehicles/${editingId}`, token, { method: "PUT", body });
        setVehicles((current) => current.map((vehicle) => vehicle.vehicleId === editingId ? updated : vehicle));
        setDetailVehicle((current) => current?.vehicleId === editingId ? updated : current);
        setNotice("Vehicle details updated.");
      }

      closeForm();
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save vehicle.");
    } finally {
      setSaving(false);
      setPhotoUploadProgress("");
    }
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!window.confirm(`Delete ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})? This action cannot be undone.`)) return;

    setError("");
    setNotice("");
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const result = await vehicleRequest<string>(`/api/vehicles/${vehicle.vehicleId}`, token, { method: "DELETE" });
      setVehicles((current) => current.filter((item) => item.vehicleId !== vehicle.vehicleId));
      setNotice(typeof result === "string" && result ? result : "Vehicle deleted successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to delete vehicle.");
    }
  };

  const handlePublicationChange = async (vehicle: Vehicle) => {
    setError("");
    setNotice("");
    setPublicationUpdatingId(vehicle.vehicleId);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const updated = await vehicleRequest<Vehicle>(`/api/vehicles/${vehicle.vehicleId}/publication`, token, {
        method: "PUT",
        body: JSON.stringify({ publiclyVisible: !vehicle.publiclyVisible }),
      });
      setVehicles((current) => current.map((item) => item.vehicleId === vehicle.vehicleId
        ? { ...item, publiclyVisible: updated.publiclyVisible }
        : item));
      setNotice(`Vehicle ${updated.publiclyVisible ? "published to" : "removed from"} the public showroom.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update vehicle publication.");
    } finally {
      setPublicationUpdatingId(null);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredVehicles = vehicles.filter((vehicle) => [
    String(vehicle.vehicleId), vehicle.make, vehicle.model, vehicle.variant ?? "",
    String(vehicle.year), vehicle.category ?? "", vehicle.fuelType, vehicle.transmission, String(vehicle.kilometers),
    vehicle.color ?? "", vehicle.registrationNumber, vehicle.status,
  ].some((value) => value.toLowerCase().includes(normalizedSearch)));
  const currentDetailVehicle = detailVehicle?.vehicleId === requestedVehicleId ? detailVehicle : null;
  const currentDetailLoadError = detailVehicleLoadError?.vehicleId === requestedVehicleId ? detailVehicleLoadError.message : "";
  const currentDetailPhotoError = detailPhotoRouteError?.vehicleId === requestedVehicleId ? detailPhotoRouteError.message : "";
  const currentDetailPhotos = detailPhotosVehicleId === requestedVehicleId ? detailPhotos : [];
  const currentDetailPhotosLoading = Boolean(currentDetailVehicle && detailPhotosVehicleId !== requestedVehicleId && !currentDetailPhotoError);

  return (
    <main className="crm-management-page bg-background text-foreground">

      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        {isDetailsRoute ? (
          <>
            <PageHeader title="Vehicle details" description="Review the inventory record, vehicle photos, inspection history, and showroom status." actions={<><Button variant="outline" onClick={() => navigate("/vehicles")} className="h-10 border-brand-600/20 px-3 font-semibold text-brand-700 hover:bg-brand-50">Back to Inventory</Button>{currentDetailVehicle && <div className="flex flex-wrap items-center gap-2">{canManagePublication && <AuditHistoryLink entityType="VEHICLE" entityId={currentDetailVehicle.vehicleId} />}<Button onClick={() => void openEditForm(currentDetailVehicle.vehicleId)} className="h-10 w-fit bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700"><Pencil size={16} /> Edit vehicle</Button></div>}</>} />

            {!hasValidRequestedVehicleId ? (
              <FeedbackMessage message="This vehicle link is not valid." action={{ label: "Back to Vehicles", onClick: () => navigate("/vehicles") }} />
            ) : currentDetailLoadError ? (
              <FeedbackMessage message={currentDetailLoadError} action={{ label: "Retry", onClick: () => setDetailReloadToken((value) => value + 1) }} />
            ) : !currentDetailVehicle ? (
              <div role="status" className="flex items-center justify-center gap-2 rounded-xl border border-brand-600/15 bg-white px-5 py-16 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading vehicle details…</div>
            ) : (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
                <section className="overflow-hidden rounded-xl border border-brand-600/15 bg-white p-4 shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)] sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-bold text-plum-950">Vehicle photos</h2>
                    <span className="text-xs text-muted-foreground">{currentDetailPhotos.length} photo{currentDetailPhotos.length === 1 ? "" : "s"}</span>
                  </div>
                  {currentDetailPhotosLoading && <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><LoaderCircle size={17} className="animate-spin text-brand-600" /> Loading photos…</div>}
                  {currentDetailPhotoError && <FeedbackMessage message={currentDetailPhotoError} action={{ label: "Retry photos", onClick: () => void loadDetailPhotos(currentDetailVehicle.vehicleId) }} className="mb-3" />}
                  {!currentDetailPhotosLoading && !currentDetailPhotoError && currentDetailPhotos.length === 0 && <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-brand-600/20 bg-[#faf8fb] px-5 text-center text-sm text-muted-foreground">No photos have been uploaded for this vehicle.</div>}
                  {currentDetailPhotos.length > 0 && <div className="grid gap-3 sm:grid-cols-2">
                    {currentDetailPhotos.map((photo, index) => {
                      const broken = brokenPhotoIds.has(photo.vehicleImageId) || !photo.previewUrl;
                      return <figure key={photo.vehicleImageId} className="overflow-hidden rounded-lg border border-brand-600/15 bg-white p-2">
                        {broken ? <div role="img" aria-label={`Vehicle photo ${index + 1} preview unavailable`} className="grid h-56 place-items-center rounded-md bg-[#faf8fb] text-sm text-muted-foreground">Photo preview unavailable</div> : <a href={photo.previewUrl ?? undefined} target="_blank" rel="noreferrer" aria-label={`Open vehicle photo ${index + 1} in a new tab`}><img src={photo.previewUrl ?? undefined} alt={`Vehicle photo ${index + 1}`} onError={() => setBrokenPhotoIds((current) => new Set(current).add(photo.vehicleImageId))} className="h-56 w-full rounded-md bg-[#faf8fb] object-contain" /></a>}
                        <figcaption className="px-1 pt-2 text-xs text-muted-foreground">{photo.contentType} · {(photo.fileSize / 1024).toFixed(0)} KB</figcaption>
                      </figure>;
                    })}
                  </div>}
                </section>

                <section className="rounded-xl border border-brand-600/15 bg-white p-4 shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)] sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-600/10 pb-4">
                    <div><h2 className="font-display text-xl font-extrabold text-plum-950">{currentDetailVehicle.year} {currentDetailVehicle.make} {currentDetailVehicle.model}</h2>{currentDetailVehicle.variant && <p className="mt-1 text-sm text-muted-foreground">{currentDetailVehicle.variant}</p>}</div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[currentDetailVehicle.status]}`}>{titleCase(currentDetailVehicle.status)}</span>
                  </div>
                  <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                    <div className="border-b border-brand-600/10 py-3"><dt className="text-xs font-semibold text-muted-foreground">Price</dt><dd className="mt-1 font-semibold text-plum-900">{formatPrice(currentDetailVehicle.price)}</dd></div>
                    <div className="border-b border-brand-600/10 py-3"><dt className="text-xs font-semibold text-muted-foreground">Mileage</dt><dd className="mt-1 text-sm text-ink-soft">{currentDetailVehicle.kilometers.toLocaleString("en-IN")} km</dd></div>
                    <div className="border-b border-brand-600/10 py-3"><dt className="text-xs font-semibold text-muted-foreground">Fuel type</dt><dd className="mt-1 text-sm text-ink-soft">{titleCase(currentDetailVehicle.fuelType)}</dd></div>
                    <div className="border-b border-brand-600/10 py-3"><dt className="text-xs font-semibold text-muted-foreground">Transmission</dt><dd className="mt-1 text-sm text-ink-soft">{titleCase(currentDetailVehicle.transmission)}</dd></div>
                    <div className="border-b border-brand-600/10 py-3"><dt className="text-xs font-semibold text-muted-foreground">Registration</dt><dd className="mt-1 text-sm text-ink-soft">{currentDetailVehicle.registrationNumber}</dd></div>
                    <div className="border-b border-brand-600/10 py-3"><dt className="text-xs font-semibold text-muted-foreground">Color</dt><dd className="mt-1 text-sm text-ink-soft">{currentDetailVehicle.color || "—"}</dd></div>
                    <div className="py-3 sm:col-span-2"><dt className="text-xs font-semibold text-muted-foreground">Vehicle ID</dt><dd className="mt-1 text-sm text-ink-soft">{currentDetailVehicle.vehicleId}</dd></div>
                  </dl>
                </section>
              </div>
            )}

            {currentDetailVehicle && <section className="mt-6 rounded-xl border border-brand-600/15 bg-white p-4 shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-600/10 pb-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-plum-950">Inspection reports</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Review observations recorded by dealership staff. No result is inferred when a field is blank.</p>
                </div>
                <Button type="button" onClick={() => {
                  setInspectionError("");
                  setInspectionNotice("");
                  setInspectionForm({ ...EMPTY_INSPECTION_FORM, inspectionDate: new Date().toISOString().slice(0, 10) });
                  setInspectionFormOpen((open) => !open);
                }} className="h-10 bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700">
                  <Plus size={16} /> {inspectionFormOpen ? "Close inspection form" : "Add inspection"}
                </Button>
              </div>

              {inspectionNotice && <div className="mt-4"><SuccessToast message={inspectionNotice} onDismiss={() => setInspectionNotice("")} /></div>}
              {inspectionError && !inspectionFormOpen && <FeedbackMessage message={inspectionError} onDismiss={() => setInspectionError("")} className="mt-4" />}

              {inspectionFormOpen && <form onSubmit={(event) => void handleInspectionSubmit(event)} className="mt-5 rounded-lg border border-brand-600/10 bg-[#faf8fb] p-4 sm:p-5">
                <h3 className="mb-4 font-display text-base font-bold text-plum-950">Record vehicle observations</h3>
                {inspectionError && <FeedbackMessage message={inspectionError} onDismiss={() => setInspectionError("")} className="mb-4" />}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Inspection date" type="date" required value={inspectionForm.inspectionDate} onChange={(event) => setInspectionForm((form) => ({ ...form, inspectionDate: event.target.value }))} />
                  <Field label="Recorded status" value={inspectionForm.inspectionStatus} onChange={(event) => setInspectionForm((form) => ({ ...form, inspectionStatus: event.target.value }))} placeholder="Enter the recorded status" />
                  <Field label="Odometer reading (km)" type="number" min="0" step="1" value={inspectionForm.odometerReading} onChange={(event) => setInspectionForm((form) => ({ ...form, odometerReading: event.target.value }))} placeholder="Optional" />
                  <label className="block sm:col-span-2 lg:col-span-3"><span className="label">Condition summary</span><textarea className="input min-h-20 resize-y" value={inspectionForm.conditionSummary} onChange={(event) => setInspectionForm((form) => ({ ...form, conditionSummary: event.target.value }))} placeholder="Record the observed condition; leave blank if not assessed." /></label>
                  <label className="block sm:col-span-2 lg:col-span-3"><span className="label">Identified defects</span><textarea className="input min-h-20 resize-y" value={inspectionForm.identifiedDefects} onChange={(event) => setInspectionForm((form) => ({ ...form, identifiedDefects: event.target.value }))} placeholder="List specific defects observed. Leave blank if not recorded." /></label>
                  <label className="block"><span className="label">Mechanical condition / findings</span><textarea className="input min-h-20 resize-y" value={inspectionForm.mechanicalCondition} onChange={(event) => setInspectionForm((form) => ({ ...form, mechanicalCondition: event.target.value }))} /></label>
                  <label className="block"><span className="label">Body condition / findings</span><textarea className="input min-h-20 resize-y" value={inspectionForm.bodyCondition} onChange={(event) => setInspectionForm((form) => ({ ...form, bodyCondition: event.target.value }))} /></label>
                  <label className="block"><span className="label">Accident history notes</span><textarea className="input min-h-20 resize-y" value={inspectionForm.accidentHistory} onChange={(event) => setInspectionForm((form) => ({ ...form, accidentHistory: event.target.value }))} /></label>
                  <label className="block"><span className="label">Service / repair history notes</span><textarea className="input min-h-20 resize-y" value={inspectionForm.serviceHistory} onChange={(event) => setInspectionForm((form) => ({ ...form, serviceHistory: event.target.value }))} /></label>
                  <Field label="Document status (as recorded)" value={inspectionForm.documentStatus} onChange={(event) => setInspectionForm((form) => ({ ...form, documentStatus: event.target.value }))} />
                  <Field label="Certification status (as recorded)" value={inspectionForm.certificationStatus} onChange={(event) => setInspectionForm((form) => ({ ...form, certificationStatus: event.target.value }))} />
                  <label className="block"><span className="label">Warranty information</span><textarea className="input min-h-20 resize-y" value={inspectionForm.warrantyInformation} onChange={(event) => setInspectionForm((form) => ({ ...form, warrantyInformation: event.target.value }))} /></label>
                  <label className="block sm:col-span-2 lg:col-span-3"><span className="label">Additional notes</span><textarea className="input min-h-20 resize-y" value={inspectionForm.notes} onChange={(event) => setInspectionForm((form) => ({ ...form, notes: event.target.value }))} /></label>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Document and certification text is recorded information only. Uploaded vehicle photos are not linked to individual inspection records; document verification is not provided.</p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" disabled={inspectionSaving} onClick={() => { setInspectionFormOpen(false); setInspectionError(""); }} className="border-brand-600/20 text-brand-700">Cancel</Button>
                  <Button type="submit" disabled={inspectionSaving} className="bg-brand-600 text-white hover:bg-brand-700">{inspectionSaving && <LoaderCircle size={16} className="animate-spin" />}{inspectionSaving ? "Saving…" : "Save inspection"}</Button>
                </div>
              </form>}

              {inspectionsLoading && <div role="status" className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><LoaderCircle size={17} className="animate-spin text-brand-600" /> Loading inspection history…</div>}
              {inspectionsError && <FeedbackMessage message={inspectionsError} action={{ label: "Retry", onClick: () => setInspectionReloadToken((value) => value + 1) }} className="mt-4" />}
              {!inspectionsLoading && !inspectionsError && inspectionsVehicleId === currentDetailVehicle.vehicleId && inspections.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No inspection records are available for this vehicle.</p>}
              {!inspectionsLoading && !inspectionsError && inspectionsVehicleId === currentDetailVehicle.vehicleId && inspections.length > 0 && <div className="mt-5 space-y-4">
                {inspections.map((inspection) => {
                  const details: Array<[string, string | number | null]> = [
                    ["Recorded status", inspection.inspectionStatus],
                    ["Condition summary", inspection.conditionSummary],
                    ["Identified defects", inspection.identifiedDefects],
                    ["Mechanical condition / findings", inspection.mechanicalCondition],
                    ["Body condition / findings", inspection.bodyCondition],
                    ["Odometer reading", inspection.odometerReading === null ? null : `${inspection.odometerReading.toLocaleString("en-IN")} km`],
                    ["Accident history notes", inspection.accidentHistory],
                    ["Service / repair history notes", inspection.serviceHistory],
                    ["Document status (not verified)", inspection.documentStatus],
                    ["Certification status (not verified)", inspection.certificationStatus],
                    ["Warranty information", inspection.warrantyInformation],
                    ["Additional notes", inspection.notes],
                  ];
                  return <article key={inspection.inspectionId} className="rounded-lg border border-brand-600/10 bg-[#fdfcfe] p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-brand-600/10 pb-3">
                      <div><h3 className="font-display font-bold text-plum-950">Inspection dated {inspection.inspectionDate || "Not recorded"}</h3><p className="mt-1 text-xs text-muted-foreground">Record #{inspection.inspectionId}{inspection.inspectorEmail ? ` · Recorded by ${inspection.inspectorEmail}` : ""}</p></div>
                      {inspection.inspectionStatus && <span className="rounded-full border border-brand-600/15 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{inspection.inspectionStatus}</span>}
                    </div>
                    <dl className="mt-2 grid gap-x-5 sm:grid-cols-2 lg:grid-cols-3">{details.map(([label, value]) => <div key={label} className="border-b border-brand-600/5 py-2.5"><dt className="text-xs font-semibold text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{value === null || value === "" ? "Not recorded" : value}</dd></div>)}</dl>
                    <p className="mt-3 text-xs text-muted-foreground">No inspection-specific evidence is linked to this record. Vehicle-level photos appear in the photos section above and are not represented as inspection evidence.</p>
                  </article>;
                })}
              </div>}
            </section>}
          </>
        ) : (
          <>
        <PageHeader title="Inventory" description="Manage dealership vehicles, photos, inspections, availability, and public showroom visibility." actions={<Button onClick={openCreateForm} size="lg" className="h-11 w-fit rounded-lg bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"><Plus size={17} /> Add Vehicle</Button>} />

        <section className="overflow-hidden rounded-xl border border-brand-600/15 bg-white shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)]">
          <div className="border-b border-brand-600/10 px-4 py-4 sm:px-6">
            <label className="input-wrap h-10 w-full bg-[#faf8fb] sm:ml-auto sm:max-w-sm">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search inventory</span>
              <input className="input" type="search" placeholder="Search inventory" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
          </div>

          {error && !formOpen && vehicles.length > 0 && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mx-5 my-4 sm:mx-6" />}

          {loading ? (
            <div role="status" className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading inventory…</div>
          ) : loadError ? (
            <div className="px-5 py-10"><FeedbackMessage message={loadError} action={{ label: "Retry", onClick: () => window.location.reload() }} /></div>
          ) : vehicles.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><CarFront size={22} /></span>
              <h3 className="mt-4 font-display text-lg font-bold text-plum-950">No vehicles in inventory</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Add a vehicle record to start managing your dealership inventory.</p>
              <Button onClick={openCreateForm} className="mt-5 rounded-lg bg-brand-600 font-semibold text-white hover:bg-brand-700"><Plus size={16} /> Add Vehicle</Button>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="px-5 py-14 text-center"><h3 className="font-display text-lg font-bold text-plum-950">No matching vehicles</h3><p className="mt-1 text-sm text-muted-foreground">Try another make, model, registration, or status.</p></div>
          ) : (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[1050px] border-collapse text-left">
                  <thead className="bg-[#faf7fb] text-xs font-bold uppercase tracking-[0.08em] text-brand-700">
                    <tr><th className="px-5 py-3.5 sm:px-6">Vehicle</th><th className="px-5 py-3.5">Registration</th><th className="px-5 py-3.5">Fuel / Transmission</th><th className="px-5 py-3.5">Kilometers</th><th className="px-5 py-3.5">Price</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-brand-600/10 text-sm">
                    {filteredVehicles.map((vehicle) => (
                      <tr key={vehicle.vehicleId} onClick={() => navigate(`/vehicles/${vehicle.vehicleId}`)} className="cursor-pointer transition hover:bg-[#fdfafd]">
                        <td className="px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><VehicleThumbnail photo={vehiclePhotos[vehicle.vehicleId]?.[0]} loading={Boolean(vehiclePhotoLoading[vehicle.vehicleId])} broken={Boolean(vehiclePhotos[vehicle.vehicleId]?.[0] && brokenPhotoIds.has(vehiclePhotos[vehicle.vehicleId][0].vehicleImageId))} unavailableMessage={vehiclePhotoErrors[vehicle.vehicleId] ? "Vehicle photo could not be loaded" : undefined} onBroken={() => { const photo = vehiclePhotos[vehicle.vehicleId]?.[0]; if (photo) setBrokenPhotoIds((current) => new Set(current).add(photo.vehicleImageId)); }} /><div className="min-w-0"><Link to={`/vehicles/${vehicle.vehicleId}`} onClick={(event) => event.stopPropagation()} className="font-semibold text-foreground underline-offset-2 hover:text-brand-700 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">{vehicle.year} {vehicle.make} {vehicle.model}</Link><p className="mt-0.5 text-xs text-muted-foreground">{[vehicle.category, vehicle.variant, vehicle.color].filter(Boolean).join(" · ") || "—"} · ID {vehicle.vehicleId}</p></div></div></td>
                        <td className="px-5 py-4 font-medium text-ink-soft">{vehicle.registrationNumber}</td>
                        <td className="px-5 py-4 text-ink-soft">{titleCase(vehicle.fuelType)} · {titleCase(vehicle.transmission)}</td>
                        <td className="px-5 py-4 text-ink-soft">{vehicle.kilometers.toLocaleString("en-IN")} km</td>
                        <td className="px-5 py-4 font-semibold text-plum-900">{formatPrice(vehicle.price)}</td>
                        <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[vehicle.status]}`}>{titleCase(vehicle.status)}</span></td>
                        <td className="px-5 py-4"><div className="flex justify-end gap-2">{canManagePublication && <Button variant="outline" disabled={publicationUpdatingId !== null} onClick={(event) => { event.stopPropagation(); void handlePublicationChange(vehicle); }} className="h-9 border-brand-600/20 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50">{publicationUpdatingId === vehicle.vehicleId && <LoaderCircle size={15} className="animate-spin" />}{vehicle.publiclyVisible ? "Unpublish" : "Publish"}</Button>}<Button variant="outline" size="icon" onClick={(event) => { event.stopPropagation(); void openEditForm(vehicle.vehicleId); }} aria-label={`Edit ${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button><Button variant="outline" size="icon" onClick={(event) => { event.stopPropagation(); void handleDelete(vehicle); }} aria-label={`Delete ${vehicle.registrationNumber}`} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-brand-600/10 sm:hidden">
                {filteredVehicles.map((vehicle) => (
                  <article key={vehicle.vehicleId} onClick={() => navigate(`/vehicles/${vehicle.vehicleId}`)} className="cursor-pointer p-4 transition hover:bg-[#fdfafd]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3"><VehicleThumbnail photo={vehiclePhotos[vehicle.vehicleId]?.[0]} loading={Boolean(vehiclePhotoLoading[vehicle.vehicleId])} broken={Boolean(vehiclePhotos[vehicle.vehicleId]?.[0] && brokenPhotoIds.has(vehiclePhotos[vehicle.vehicleId][0].vehicleImageId))} unavailableMessage={vehiclePhotoErrors[vehicle.vehicleId] ? "Vehicle photo could not be loaded" : undefined} onBroken={() => { const photo = vehiclePhotos[vehicle.vehicleId]?.[0]; if (photo) setBrokenPhotoIds((current) => new Set(current).add(photo.vehicleImageId)); }} /><div className="min-w-0"><Link to={`/vehicles/${vehicle.vehicleId}`} onClick={(event) => event.stopPropagation()} className="font-semibold text-foreground underline-offset-2 hover:text-brand-700 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">{vehicle.year} {vehicle.make} {vehicle.model}</Link><p className="mt-0.5 text-xs text-muted-foreground">{vehicle.registrationNumber} · ID {vehicle.vehicleId}</p></div></div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[vehicle.status]}`}>{titleCase(vehicle.status)}</span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fuel / Transmission</dt><dd className="text-ink-soft">{titleCase(vehicle.fuelType)} · {titleCase(vehicle.transmission)}</dd></div>
                      <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kilometers</dt><dd className="text-ink-soft">{vehicle.kilometers.toLocaleString("en-IN")} km</dd></div>
                      <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Price</dt><dd className="font-semibold text-plum-900">{formatPrice(vehicle.price)}</dd></div>
                      <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Category / Variant / Color</dt><dd className="text-ink-soft">{[vehicle.category, vehicle.variant, vehicle.color].filter(Boolean).join(" · ") || "—"}</dd></div>
                    </dl>
                    <div className="mt-3 flex justify-end gap-2">{canManagePublication && <Button variant="outline" disabled={publicationUpdatingId !== null} onClick={(event) => { event.stopPropagation(); void handlePublicationChange(vehicle); }} className="h-9 border-brand-600/20 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50">{publicationUpdatingId === vehicle.vehicleId && <LoaderCircle size={15} className="animate-spin" />}{vehicle.publiclyVisible ? "Unpublish" : "Publish"}</Button>}<Button variant="outline" size="icon" onClick={(event) => { event.stopPropagation(); void openEditForm(vehicle.vehicleId); }} aria-label={`Edit ${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button><Button variant="outline" size="icon" onClick={(event) => { event.stopPropagation(); void handleDelete(vehicle); }} aria-label={`Delete ${vehicle.registrationNumber}`} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button></div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
          </>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#200024]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !formLoading && !imageUploading) closeForm(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="vehicle-form-title" className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Inventory record</p><h2 id="vehicle-form-title" className="mt-1 font-display text-2xl font-extrabold text-plum-950">{editingId === null ? "Add vehicle" : "Edit vehicle"}</h2></div>
              <Button variant="ghost" size="icon" onClick={closeForm} disabled={saving || formLoading || imageUploading} aria-label="Close form" className="text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={19} /></Button>
            </div>

            {error && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mb-4" />}

            {formLoading ? (
              <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading vehicle…</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Make" required value={form.make} onChange={(event) => setForm({ ...form, make: event.target.value })} />
                  <Field label="Model" required value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
                  <Field label="Variant" value={form.variant} onChange={(event) => setForm({ ...form, variant: event.target.value })} />
                  <label className="block"><span className="label">Vehicle category <span className="font-normal text-muted-foreground">(optional)</span></span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="h-11 w-full rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"><option value="">Uncategorized</option>{!vehicleCategories.some((option) => option.value === form.category) && form.category && <option value={form.category}>{form.category} (existing value)</option>}{vehicleCategories.map((option) => <option key={option.optionId} value={option.value}>{option.value}</option>)}</select></label>
                  <label className="block"><span className="label">Body type</span><select value={form.bodyType} onChange={(event) => setForm({ ...form, bodyType: event.target.value })} className="h-11 w-full rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"><option value="">Select body type</option>{BODY_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label className="block"><span className="label">Owner</span><select value={form.ownerType} onChange={(event) => setForm({ ...form, ownerType: event.target.value })} className="h-11 w-full rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"><option value="">Select owner count</option>{OWNER_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
                  <Field label="Year" type="number" required min={1900} step={1} value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} />
                  <label className="block"><span className="label">Fuel type</span><select required value={form.fuelType} onChange={(event) => setForm({ ...form, fuelType: event.target.value as FuelType | "" })} className="h-11 w-full rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"><option value="" disabled>Select fuel type</option>{FUEL_TYPES.map((fuel) => <option key={fuel} value={fuel}>{titleCase(fuel)}</option>)}</select></label>
                  <label className="block"><span className="label">Transmission</span><select required value={form.transmission} onChange={(event) => setForm({ ...form, transmission: event.target.value as Transmission | "" })} className="h-11 w-full rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"><option value="" disabled>Select transmission</option>{TRANSMISSIONS.map((transmission) => <option key={transmission} value={transmission}>{titleCase(transmission)}</option>)}</select></label>
                  <Field label="Kilometers" type="number" required min={0} step={1} value={form.kilometers} onChange={(event) => setForm({ ...form, kilometers: event.target.value })} />
                  <Field label="Price (₹)" type="number" required min={0.01} step="any" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
                  <Field label="Color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
                  <Field label="Registration number" required value={form.registrationNumber} onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })} />
                  <Field label="Registered at" value={form.registrationAt} onChange={(event) => setForm({ ...form, registrationAt: event.target.value })} placeholder="MH-03" />
                  <label className="block"><span className="label">Registration type</span><select value={form.registrationType} onChange={(event) => setForm({ ...form, registrationType: event.target.value })} className="h-11 w-full rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"><option value="">Select registration type</option>{REGISTRATION_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label className="block"><span className="label">Insurance</span><select value={form.insuranceType} onChange={(event) => setForm({ ...form, insuranceType: event.target.value })} className="h-11 w-full rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"><option value="">Select insurance</option>{INSURANCE_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label className="block sm:col-span-2"><span className="label">Inventory status</span><select required value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as VehicleStatus | "" })} className="h-11 w-full rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"><option value="" disabled>Select status</option>{VEHICLE_STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label>
                </div>
                <label className="block"><span className="label">Vehicle description</span><textarea maxLength={2000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input min-h-20 resize-y" placeholder="Describe the vehicle for your dealership website." /></label>
                <label className="block"><span className="label">Seller’s note</span><textarea maxLength={3000} rows={4} value={form.sellerNote} onChange={(event) => setForm({ ...form, sellerNote: event.target.value })} className="input min-h-24 resize-y" placeholder="Condition, modifications, service history, accident history…" /></label>
                <p className="text-xs text-muted-foreground">Vehicle ID and tenant assignment are managed by the backend.</p>
                {editingId === null && (
                  <section aria-labelledby="new-vehicle-photos-title" className="space-y-3 rounded-lg border border-brand-600/15 bg-[#faf8fb] p-4">
                    <div>
                      <h3 id="new-vehicle-photos-title" className="text-sm font-semibold text-plum-950">Vehicle photos <span className="font-normal text-muted-foreground">(optional, up to 10)</span></h3>
                      <p className="mt-1 text-xs text-muted-foreground">Choose JPG, PNG, or WebP images up to 5 MB each. They will upload after the vehicle is created.</p>
                    </div>
                    {imageError && <FeedbackMessage message={imageError} onDismiss={() => setImageError("")} />}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      aria-label="Select vehicle photos"
                      disabled={saving}
                      onChange={(event) => {
                        setImageError("");
                        const selectedFiles = Array.from(event.target.files ?? []);
                        event.target.value = "";
                        if (selectedFiles.length === 0) return;

                        if (createPhotos.length + selectedFiles.length > MAX_VEHICLE_IMAGES) {
                          setImageError(`A vehicle can have no more than ${MAX_VEHICLE_IMAGES} photos. You can add ${MAX_VEHICLE_IMAGES - createPhotos.length} more.`);
                          return;
                        }

                        const acceptedFiles: File[] = [];
                        const rejectedFiles: string[] = [];
                        selectedFiles.forEach((file) => {
                          if (!isSupportedVehiclePhoto(file)) rejectedFiles.push(`${file.name}: choose a JPG, PNG, or WebP image`);
                          else if (file.size > MAX_VEHICLE_IMAGE_SIZE) rejectedFiles.push(`${file.name}: each photo must be 5 MB or smaller`);
                          else acceptedFiles.push(file);
                        });

                        const additions = acceptedFiles.map((file) => {
                          const previewUrl = URL.createObjectURL(file);
                          createPhotoUrlsRef.current.push(previewUrl);
                          return { selectionId: ++nextPhotoSelectionId.current, file, previewUrl };
                        });
                        if (additions.length > 0) setCreatePhotos((current) => [...current, ...additions]);
                        if (rejectedFiles.length > 0) setImageError(rejectedFiles.join("; "));
                      }}
                      className="min-w-0 w-full text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700 hover:file:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                    />
                    {createPhotos.length > 0 && (
                      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Selected vehicle photos">
                        {createPhotos.map((photo) => (
                          <li key={photo.selectionId} className="flex min-w-0 items-center gap-3 rounded-lg border border-brand-600/10 bg-white p-2.5">
                            <img src={photo.previewUrl} alt={`Preview of ${photo.file.name}`} className="size-16 shrink-0 rounded-md border border-brand-600/10 object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink" title={photo.file.name}>{photo.file.name}</p>
                              <p className="text-xs text-muted-foreground">{(photo.file.size / 1024).toFixed(0)} KB</p>
                            </div>
                            <Button type="button" variant="outline" onClick={() => {
                              URL.revokeObjectURL(photo.previewUrl);
                              createPhotoUrlsRef.current = createPhotoUrlsRef.current.filter((url) => url !== photo.previewUrl);
                              setCreatePhotos((current) => current.filter((item) => item.selectionId !== photo.selectionId));
                            }} disabled={saving} aria-label={`Remove ${photo.file.name}`} className="shrink-0 border-brand-600/20 px-2.5 text-brand-700 hover:bg-brand-50">Remove</Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
                {editingId !== null && (
                  <section aria-labelledby="vehicle-photo-title" className="space-y-3 rounded-lg border border-brand-600/15 bg-[#faf8fb] p-4">
                    <div>
                      <h3 id="vehicle-photo-title" className="text-sm font-semibold text-plum-950">Add a vehicle photo</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Choose a JPEG, PNG, or WebP image up to 5 MB. Each vehicle can have up to {MAX_VEHICLE_IMAGES} photos.</p>
                    </div>
                    {imageError && <FeedbackMessage message={imageError} onDismiss={() => setImageError("")} />}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        key={imageInputKey}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        aria-label="Choose vehicle photo"
                        disabled={imageUploading || deletingPhotoId !== null || detailPhotos.length >= MAX_VEHICLE_IMAGES}
                        onChange={(event) => {
                          setImageError("");
                          clearImageSelection();
                          const selectedFile = event.target.files?.[0];
                          if (!selectedFile) return;
                          const hasSupportedType = selectedFile.type
                            ? VEHICLE_IMAGE_TYPES.includes(selectedFile.type)
                            : /\.(jpe?g|png|webp)$/i.test(selectedFile.name);
                          if (!hasSupportedType) {
                            setImageError("Choose a JPG, PNG, or WebP image.");
                            return;
                          }
                          if (selectedFile.size > MAX_VEHICLE_IMAGE_SIZE) {
                            setImageError("Each photo must be 5 MB or smaller.");
                            return;
                          }
                          setImageFile(selectedFile);
                          const previewUrl = URL.createObjectURL(selectedFile);
                          imagePreviewUrlRef.current = previewUrl;
                          setImagePreviewUrl(previewUrl);
                        }}
                        className="min-w-0 flex-1 text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700 hover:file:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                      />
                      <Button type="button" onClick={() => void handleImageUpload()} disabled={!imageFile || imageUploading || saving || deletingPhotoId !== null || detailPhotos.length >= MAX_VEHICLE_IMAGES} className="h-10 shrink-0 bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700">
                        {imageUploading && <LoaderCircle size={16} className="animate-spin" />}
                        {imageUploading ? "Uploading…" : "Upload photo"}
                      </Button>
                    </div>
                    {imageFile && <p className="text-xs text-muted-foreground">Selected: {imageFile.name}</p>}
                    {imagePreviewUrl && <img src={imagePreviewUrl} alt={`Preview of ${imageFile?.name ?? "selected vehicle photo"}`} className="max-h-48 w-auto rounded-lg border border-brand-600/15 object-contain" />}
                  </section>
                )}
                {editingId !== null && (
                  <section aria-labelledby="vehicle-photo-gallery-title" className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 id="vehicle-photo-gallery-title" className="text-sm font-semibold text-plum-950">Uploaded photos</h3>
                      <span className="text-xs text-muted-foreground">{detailPhotos.length} of {MAX_VEHICLE_IMAGES}</span>
                    </div>
                    {detailPhotosLoading && <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle size={16} className="animate-spin text-brand-600" /> Loading vehicle photos…</div>}
                    {detailPhotosError && <FeedbackMessage message={detailPhotosError} action={{ label: "Retry", onClick: () => void loadDetailPhotos(editingId) }} />}
                    {!detailPhotosLoading && !detailPhotosError && detailPhotos.length === 0 && <p className="rounded-lg border border-dashed border-brand-600/20 px-4 py-6 text-center text-sm text-muted-foreground">No photos have been uploaded for this vehicle.</p>}
                    {detailPhotos.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {detailPhotos.map((photo, index) => {
                          const broken = brokenPhotoIds.has(photo.vehicleImageId);
                          return (
                            <figure key={photo.vehicleImageId} className="overflow-hidden rounded-lg border border-brand-600/15 bg-white p-2">
                              {photo.previewUrl && !broken ? (
                                <a href={photo.previewUrl} target="_blank" rel="noreferrer" aria-label={`Open vehicle photo ${index + 1} in a new tab`}>
                                  <img src={photo.previewUrl} alt={`Vehicle photo ${index + 1}`} onError={() => setBrokenPhotoIds((current) => new Set(current).add(photo.vehicleImageId))} className="h-48 w-full rounded-md bg-[#faf8fb] object-contain" />
                                </a>
                              ) : (
                                <div role="img" aria-label={`Vehicle photo ${index + 1} preview unavailable`} className="grid h-48 place-items-center rounded-md bg-[#faf8fb] text-sm text-muted-foreground">Photo preview unavailable</div>
                              )}
                              <figcaption className="flex items-center justify-between gap-2 px-1 pt-2 text-xs text-muted-foreground"><span>{photo.contentType} · {(photo.fileSize / 1024).toFixed(0)} KB</span><Button type="button" variant="outline" onClick={() => void handleImageDelete(photo)} disabled={deletingPhotoId !== null || imageUploading} aria-label={`Remove vehicle photo ${index + 1}`} className="h-8 border-red-200 px-2 text-red-700 hover:bg-red-50">{deletingPhotoId === photo.vehicleImageId ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}<span>{deletingPhotoId === photo.vehicleImageId ? "Removing…" : "Remove"}</span></Button></figcaption>
                            </figure>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}
                {photoUploadProgress && <p role="status" aria-live="polite" className="text-sm font-medium text-brand-700">{photoUploadProgress}</p>}
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" disabled={saving || imageUploading} onClick={closeForm} className="h-11 border-brand-600 px-5 font-semibold text-brand-600 hover:bg-brand-50">Cancel</Button>
                  <Button type="submit" disabled={saving || imageUploading} className="h-11 bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">{saving && <LoaderCircle size={16} className="animate-spin" />}{saving ? photoUploadProgress ? "Uploading photos…" : "Saving…" : editingId === null ? "Add vehicle" : "Save changes"}</Button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
      <SuccessToast message={notice} onDismiss={() => setNotice("")} />
    </main>
  );
}

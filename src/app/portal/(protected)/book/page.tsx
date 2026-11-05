"use client";

import { useState, useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Package,
  Phone,
  Mail,
  User,
  ChevronLeft,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  getCustomerSites,
  getAvailableBookingDates,
  createPortalBooking,
  type BookingFormState,
} from "../actions";

interface Site {
  id: string;
  name: string;
  address: string | null;
  postcode: string | null;
  zoneId: string | null;
  zone: { id: string; name: string } | null;
}

interface AvailableRoute {
  id: string;
  serviceDate: Date;
  zoneName: string;
  available: number;
}

const EQUIPMENT_OPTIONS = [
  "Laptops",
  "Desktops",
  "Servers",
  "Monitors",
  "Printers",
  "Networking Equipment",
  "Mobile Devices",
  "Storage Media",
  "Other IT Equipment",
];

export default function BookCollectionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<AvailableRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<AvailableRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [noServiceMessage, setNoServiceMessage] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  const [state, formAction, isPending] = useActionState<BookingFormState, FormData>(
    createPortalBooking,
    {}
  );

  // Load sites on mount
  useEffect(() => {
    async function loadSites() {
      const result = await getCustomerSites();
      if (result.success && result.sites) {
        setSites(result.sites);
      }
      setLoading(false);
    }
    loadSites();
  }, []);

  // Load available dates when site is selected
  useEffect(() => {
    if (!selectedSite) {
      setAvailableRoutes([]);
      return;
    }

    async function loadRoutes() {
      setLoadingRoutes(true);
      setNoServiceMessage(null);
      const result = await getAvailableBookingDates(selectedSite!.id);
      if (result.success) {
        setAvailableRoutes(result.routes || []);
        if (result.message) {
          setNoServiceMessage(result.message);
        }
      }
      setLoadingRoutes(false);
    }
    loadRoutes();
  }, [selectedSite]);

  // Handle successful booking
  useEffect(() => {
    if (state.success && state.reference) {
      setStep(4); // Success step
    }
  }, [state.success, state.reference]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <Link
        href="/portal/collections"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          color: "#64748b",
          fontSize: "0.875rem",
          marginBottom: "1rem",
          textDecoration: "none",
        }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Collections
      </Link>

      <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", marginBottom: "0.5rem" }}>
        Book a Collection
      </h1>
      <p style={{ color: "#64748b", marginBottom: "2rem" }}>
        Schedule a collection of IT equipment from one of your sites
      </p>

      {/* Progress Steps */}
      <div style={{ display: "flex", marginBottom: "2rem" }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: step >= s ? "#0d9488" : "#e2e8f0",
                color: step >= s ? "white" : "#64748b",
                fontWeight: "600",
                fontSize: "0.875rem",
              }}
            >
              {step > s ? <CheckCircle className="w-4 h-4" /> : s}
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                color: step >= s ? "#0d9488" : "#64748b",
                marginTop: "0.5rem",
              }}
            >
              {s === 1 ? "Select Site" : s === 2 ? "Choose Date" : "Details"}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Select Site */}
      {step === 1 && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
            Select Collection Site
          </h2>

          {sites.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
              <MapPin className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p>No sites are available for booking.</p>
              <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                Please contact your administrator to set up collection sites.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => {
                    setSelectedSite(site);
                    setSelectedRoute(null);
                    setStep(2);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "1rem",
                    padding: "1rem",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "#0d9488";
                    e.currentTarget.style.backgroundColor = "#f0fdfa";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }}
                >
                  <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div style={{ fontWeight: "600", color: "#0f172a" }}>{site.name}</div>
                    <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
                      {site.address}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                      {site.postcode}
                      {site.zone && (
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            padding: "0.125rem 0.5rem",
                            backgroundColor: "#e0f2fe",
                            color: "#0369a1",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                          }}
                        >
                          {site.zone.name}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Date */}
      {step === 2 && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: "600" }}>
              Select Collection Date
            </h2>
            <button
              onClick={() => setStep(1)}
              style={{
                fontSize: "0.875rem",
                color: "#0d9488",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Change Site
            </button>
          </div>

          <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "0.5rem" }}>
            <span style={{ fontWeight: "500" }}>{selectedSite?.name}</span>
            <span style={{ color: "#64748b", marginLeft: "0.5rem" }}>{selectedSite?.postcode}</span>
          </div>

          {loadingRoutes ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : noServiceMessage ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p>{noServiceMessage}</p>
            </div>
          ) : availableRoutes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p>No available collection dates at this time.</p>
              <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                Please check back later or contact us for alternative arrangements.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {availableRoutes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => {
                    setSelectedRoute(route);
                    setStep(3);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "1rem",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "#0d9488";
                    e.currentTarget.style.backgroundColor = "#f0fdfa";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span style={{ fontWeight: "600", color: "#0f172a" }}>
                      {new Date(route.serviceDate).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.5rem" }}>
                    {route.zoneName}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: route.available <= 2 ? "#b45309" : "#065f46",
                      marginTop: "0.5rem",
                    }}
                  >
                    {route.available} {route.available === 1 ? "space" : "spaces"} available
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Collection Details */}
      {step === 3 && selectedSite && selectedRoute && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: "600" }}>
              Collection Details
            </h2>
            <button
              onClick={() => setStep(2)}
              style={{
                fontSize: "0.875rem",
                color: "#0d9488",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Change Date
            </button>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "0.5rem", flex: 1, minWidth: "150px" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Site</div>
              <div style={{ fontWeight: "500" }}>{selectedSite.name}</div>
            </div>
            <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "0.5rem", flex: 1, minWidth: "150px" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Date</div>
              <div style={{ fontWeight: "500" }}>
                {new Date(selectedRoute.serviceDate).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          <form action={formAction} className="form" style={{ maxWidth: "100%" }}>
            <input type="hidden" name="siteId" value={selectedSite.id} />
            <input type="hidden" name="routeDateId" value={selectedRoute.id} />
            <input type="hidden" name="equipmentCategories" value={selectedEquipment.join(",")} />

            {state.error && (
              <div
                className="wide"
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "0.375rem",
                  color: "#b91c1c",
                  fontSize: "0.875rem",
                }}
              >
                {state.error}
              </div>
            )}

            <div className="field wide">
              <label>Equipment Types</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                {EQUIPMENT_OPTIONS.map((equip) => (
                  <button
                    key={equip}
                    type="button"
                    onClick={() => {
                      setSelectedEquipment((prev) =>
                        prev.includes(equip)
                          ? prev.filter((e) => e !== equip)
                          : [...prev, equip]
                      );
                    }}
                    style={{
                      padding: "0.375rem 0.75rem",
                      borderRadius: "9999px",
                      border: "1px solid",
                      borderColor: selectedEquipment.includes(equip) ? "#0d9488" : "#e2e8f0",
                      backgroundColor: selectedEquipment.includes(equip) ? "#f0fdfa" : "white",
                      color: selectedEquipment.includes(equip) ? "#0d9488" : "#64748b",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    {equip}
                  </button>
                ))}
              </div>
            </div>

            <div className="field wide">
              <label htmlFor="itemEstimate">Estimated Number of Items</label>
              <input
                type="number"
                id="itemEstimate"
                name="itemEstimate"
                min={1}
                placeholder="e.g., 50"
              />
            </div>

            <div className="field wide">
              <label htmlFor="customerInstructions">Collection Instructions</label>
              <textarea
                id="customerInstructions"
                name="customerInstructions"
                rows={3}
                placeholder="Access instructions, special requirements, etc."
              />
            </div>

            <div className="field">
              <label htmlFor="contactName">
                <User className="w-4 h-4 inline mr-1" />
                Site Contact Name
              </label>
              <input
                type="text"
                id="contactName"
                name="contactName"
                defaultValue={selectedSite.name}
                placeholder="Contact name"
              />
            </div>

            <div className="field">
              <label htmlFor="contactPhone">
                <Phone className="w-4 h-4 inline mr-1" />
                Contact Phone
              </label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                placeholder="Phone number"
              />
            </div>

            <div className="field wide">
              <label htmlFor="contactEmail">
                <Mail className="w-4 h-4 inline mr-1" />
                Contact Email
              </label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                placeholder="Email address"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(2)}
                disabled={isPending}
              >
                Back
              </button>
              <button type="submit" className="btn" disabled={isPending}>
                {isPending ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && state.success && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "4rem",
              height: "4rem",
              borderRadius: "50%",
              backgroundColor: "#d1fae5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            Collection Booked
          </h2>
          <p style={{ color: "#64748b", marginBottom: "1rem" }}>
            Your collection has been scheduled successfully.
          </p>
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#f8fafc",
              borderRadius: "0.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#64748b" }}>Reference Number</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0d9488" }}>
              {state.reference}
            </div>
          </div>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1.5rem" }}>
            You will receive a confirmation email with the collection details.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <button
              onClick={() => {
                setStep(1);
                setSelectedSite(null);
                setSelectedRoute(null);
                setSelectedEquipment([]);
              }}
              className="btn btn-secondary"
            >
              Book Another
            </button>
            <Link href="/portal/collections" className="btn">
              View Collections
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

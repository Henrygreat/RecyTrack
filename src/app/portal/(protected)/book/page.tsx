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
  PoundSterling,
  AlertCircle,
  Gift,
} from "lucide-react";
import {
  getCustomerSites,
  getAvailableBookingDates,
  createPortalBooking,
  getBookingPricing,
  type BookingFormState,
  type BookingPricingResult,
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

interface PricingData {
  isFree: boolean;
  freeReason?: string;
  quoteRequired: boolean;
  charges: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    taxAmount: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
}

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

  // Pricing state
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [chargesAccepted, setChargesAccepted] = useState(false);

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

  // Handle successful booking - success is now step 5 for chargeable, step 4 for free
  useEffect(() => {
    if (state.success && state.reference) {
      setStep(pricingData?.isFree === false ? 5 : 4);
    }
  }, [state.success, state.reference, pricingData]);

  // Fetch pricing when date is selected
  async function handleDateSelection(route: AvailableRoute) {
    setSelectedRoute(route);
    setLoadingPricing(true);
    setChargesAccepted(false);
    setPricingData(null);

    try {
      const result = await getBookingPricing({
        siteId: selectedSite!.id,
        routeDateId: route.id,
        equipmentCategories: selectedEquipment,
        itemEstimate: 0,
      });

      if (result.success && result.pricing) {
        setPricingData(result.pricing);
        // If free, skip to details (step 3); if chargeable, show pricing step first (step 3)
        setStep(3);
      } else {
        // Default to free if pricing fails
        setPricingData({ isFree: true, quoteRequired: false, charges: [], subtotal: 0, taxAmount: 0, total: 0, currency: "GBP" });
        setStep(3);
      }
    } catch {
      // Default to free if error
      setPricingData({ isFree: true, quoteRequired: false, charges: [], subtotal: 0, taxAmount: 0, total: 0, currency: "GBP" });
      setStep(3);
    } finally {
      setLoadingPricing(false);
    }
  }

  // Format currency for display (amounts in pence)
  function formatCurrency(amountInPence: number, currency: string = "GBP"): string {
    const amount = amountInPence / 100;
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amount);
  }

  // Determine if we need a pricing step
  const needsPricingStep = pricingData && !pricingData.isFree && pricingData.total > 0;

  // For chargeable collections: Site(1) → Date(2) → Pricing(3) → Details(4) → Success(5)
  // For free collections: Site(1) → Date(2) → Details(3) → Success(4)
  const detailsStep = needsPricingStep ? 4 : 3;
  const successStep = needsPricingStep ? 5 : 4;
  const totalSteps = needsPricingStep ? 4 : 3;

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
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => {
          // Determine step label based on whether pricing step is needed
          let label = "";
          if (s === 1) label = "Select Site";
          else if (s === 2) label = "Choose Date";
          else if (needsPricingStep) {
            if (s === 3) label = "Review Pricing";
            else if (s === 4) label = "Details";
          } else {
            if (s === 3) label = "Details";
          }

          return (
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
                {label}
              </span>
            </div>
          );
        })}
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
          ) : loadingPricing ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
              <p style={{ color: "#64748b" }}>Calculating pricing...</p>
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
                  onClick={() => handleDateSelection(route)}
                  disabled={loadingPricing}
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

      {/* Step 3: Pricing Review (for chargeable collections) */}
      {step === 3 && needsPricingStep && selectedSite && selectedRoute && pricingData && (
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
              Review Collection Charges
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

          {/* Summary */}
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

          {/* Pricing Breakdown */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <PoundSterling className="w-5 h-5 text-amber-600" />
              <h3 style={{ fontWeight: "600", color: "#0f172a" }}>Charges</h3>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: "0.5rem", overflow: "hidden" }}>
              {/* Charge line items */}
              {pricingData.charges.map((charge, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    borderBottom: index < pricingData.charges.length - 1 ? "1px solid #e2e8f0" : "none",
                    backgroundColor: index % 2 === 0 ? "#f8fafc" : "white",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "500", color: "#0f172a" }}>{charge.description}</div>
                    {charge.quantity > 1 && (
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {charge.quantity} x {formatCurrency(charge.unitPrice, pricingData.currency)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: "500", color: "#0f172a" }}>
                    {formatCurrency(charge.lineTotal, pricingData.currency)}
                  </div>
                </div>
              ))}

              {/* Subtotal */}
              {pricingData.taxAmount > 0 && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.75rem 1rem",
                      borderTop: "1px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <div style={{ color: "#64748b" }}>Subtotal</div>
                    <div style={{ fontWeight: "500" }}>{formatCurrency(pricingData.subtotal, pricingData.currency)}</div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.75rem 1rem",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <div style={{ color: "#64748b" }}>VAT</div>
                    <div style={{ fontWeight: "500" }}>{formatCurrency(pricingData.taxAmount, pricingData.currency)}</div>
                  </div>
                </>
              )}

              {/* Total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "1rem",
                  borderTop: "2px solid #e2e8f0",
                  backgroundColor: "#f0fdfa",
                }}
              >
                <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "1.125rem" }}>Total</div>
                <div style={{ fontWeight: "700", color: "#0d9488", fontSize: "1.125rem" }}>
                  {formatCurrency(pricingData.total, pricingData.currency)}
                </div>
              </div>
            </div>
          </div>

          {/* Quote Required Notice */}
          {pricingData.quoteRequired && (
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "1rem",
                backgroundColor: "#fef3c7",
                borderRadius: "0.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <div style={{ fontWeight: "600", color: "#92400e" }}>Quote Required</div>
                <p style={{ fontSize: "0.875rem", color: "#a16207", marginTop: "0.25rem" }}>
                  Due to the nature of this collection, we will provide you with a formal quote before proceeding.
                  You will be contacted within 1-2 business days.
                </p>
              </div>
            </div>
          )}

          {/* Acceptance Checkbox */}
          {!pricingData.quoteRequired && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  cursor: "pointer",
                  padding: "1rem",
                  backgroundColor: chargesAccepted ? "#f0fdfa" : "#f8fafc",
                  borderRadius: "0.5rem",
                  border: `1px solid ${chargesAccepted ? "#0d9488" : "#e2e8f0"}`,
                  transition: "all 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  checked={chargesAccepted}
                  onChange={(e) => setChargesAccepted(e.target.checked)}
                  style={{
                    width: "1.25rem",
                    height: "1.25rem",
                    marginTop: "0.125rem",
                    accentColor: "#0d9488",
                  }}
                />
                <div>
                  <div style={{ fontWeight: "500", color: "#0f172a" }}>
                    I accept the charges for this collection
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
                    By checking this box, you confirm that you have reviewed and accept the charges shown above.
                    An invoice will be generated upon completion of the collection.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              onClick={() => setStep(2)}
              className="btn btn-secondary"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="btn"
              disabled={!pricingData.quoteRequired && !chargesAccepted}
            >
              {pricingData.quoteRequired ? "Request Quote" : "Continue to Details"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 for free / Step 4 for chargeable: Collection Details */}
      {step === detailsStep && selectedSite && selectedRoute && (
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
              onClick={() => setStep(needsPricingStep ? 3 : 2)}
              style={{
                fontSize: "0.875rem",
                color: "#0d9488",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {needsPricingStep ? "Back to Pricing" : "Change Date"}
            </button>
          </div>

          {/* Free Collection Notice */}
          {pricingData?.isFree && (
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "1rem",
                backgroundColor: "#dcfce7",
                borderRadius: "0.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <Gift className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <div style={{ fontWeight: "600", color: "#166534" }}>Free Collection</div>
                <p style={{ fontSize: "0.875rem", color: "#15803d", marginTop: "0.25rem" }}>
                  {pricingData.freeReason || "This collection is provided free of charge."}
                </p>
              </div>
            </div>
          )}

          {/* Chargeable Summary (compact, since already reviewed) */}
          {needsPricingStep && pricingData && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem",
                backgroundColor: "#f0fdfa",
                borderRadius: "0.5rem",
                marginBottom: "1.5rem",
                border: "1px solid #99f6e4",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle className="w-5 h-5 text-teal-600" />
                <span style={{ fontWeight: "500", color: "#0f172a" }}>Charges Accepted</span>
              </div>
              <div style={{ fontWeight: "600", color: "#0d9488" }}>
                {formatCurrency(pricingData.total, pricingData.currency)}
              </div>
            </div>
          )}

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
            {/* Commercial data */}
            <input type="hidden" name="chargesAccepted" value={chargesAccepted ? "true" : "false"} />
            <input type="hidden" name="pricingData" value={pricingData ? JSON.stringify({
              isFree: pricingData.isFree,
              freeReason: pricingData.freeReason,
              subtotal: pricingData.subtotal,
              taxAmount: pricingData.taxAmount,
              total: pricingData.total,
              currency: pricingData.currency,
            }) : ""} />

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
                onClick={() => setStep(needsPricingStep ? 3 : 2)}
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

      {/* Success Step */}
      {step === successStep && state.success && (
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
                setPricingData(null);
                setChargesAccepted(false);
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

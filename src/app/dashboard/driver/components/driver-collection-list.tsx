"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Phone,
  User,
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Navigation,
  Loader2,
} from "lucide-react";
import { changeCollectionStatus } from "@/app/dashboard/collections/actions";
import { CollectionStatusBadge } from "@/components/ui/badge";
import type { CollectionStatus, CollectionZone, Site, Customer, RouteDate } from "@prisma/client";

interface CollectionWithRelations {
  id: string;
  reference: string;
  status: CollectionStatus;
  address: string;
  postcode: string;
  contactName: string | null;
  contactPhone: string | null;
  itemEstimate: number;
  equipmentCategories: string[];
  specialHandling: string | null;
  customerInstructions: string | null;
  customer: { name: string };
  site: { name: string } | null;
  routeDate: (RouteDate & { zone: CollectionZone }) | null;
}

interface DriverCollectionListProps {
  collections: CollectionWithRelations[];
  compact?: boolean;
}

export function DriverCollectionList({ collections, compact = false }: DriverCollectionListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {collections.map((collection) => (
        <DriverCollectionCard key={collection.id} collection={collection} compact={compact} />
      ))}
    </div>
  );
}

function DriverCollectionCard({
  collection,
  compact,
}: {
  collection: CollectionWithRelations;
  compact: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [showException, setShowException] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");

  const handleStatusChange = (newStatus: CollectionStatus) => {
    const formData = new FormData();
    formData.set("id", collection.id);
    formData.set("status", newStatus);

    startTransition(async () => {
      const result = await changeCollectionStatus({}, formData);
      if (result.error) {
        alert(result.error);
      }
      router.refresh();
    });
  };

  const handleException = () => {
    if (!exceptionReason.trim()) {
      alert("Please enter a reason for the exception");
      return;
    }

    const formData = new FormData();
    formData.set("id", collection.id);
    formData.set("status", "EXCEPTION");
    formData.set("reason", exceptionReason);

    startTransition(async () => {
      const result = await changeCollectionStatus({}, formData);
      if (result.error) {
        alert(result.error);
      } else {
        setShowException(false);
        setExceptionReason("");
      }
      router.refresh();
    });
  };

  const openNavigation = () => {
    const address = encodeURIComponent(`${collection.address}, ${collection.postcode}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, "_blank");
  };

  const callContact = () => {
    if (collection.contactPhone) {
      window.open(`tel:${collection.contactPhone}`, "_self");
    }
  };

  // Determine available actions based on current status
  const canStartTransit = collection.status === "ASSIGNED";
  const canMarkCollected = collection.status === "IN_TRANSIT";
  const canReportException = ["IN_TRANSIT", "COLLECTED"].includes(collection.status);

  if (compact) {
    return (
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.5rem",
          padding: "0.75rem",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span className="font-mono" style={{ fontSize: "0.75rem", color: "#64748b" }}>
              {collection.reference}
            </span>
            <div style={{ fontWeight: "500", color: "#0f172a", fontSize: "0.875rem" }}>
              {collection.customer.name}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              {collection.postcode} — {collection.routeDate?.serviceDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </div>
          </div>
          <CollectionStatusBadge status={collection.status} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "0.75rem",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          borderBottom: expanded ? "1px solid #e2e8f0" : "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
          <div>
            <span className="font-mono" style={{ fontSize: "0.75rem", color: "#64748b" }}>
              {collection.reference}
            </span>
            <div style={{ fontWeight: "600", color: "#0f172a", marginTop: "0.125rem" }}>
              {collection.customer.name}
            </div>
            {collection.site && (
              <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{collection.site.name}</div>
            )}
          </div>
          <CollectionStatusBadge status={collection.status} />
        </div>

        {/* Address */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            backgroundColor: "#f8fafc",
            padding: "0.5rem",
            borderRadius: "0.375rem",
            marginTop: "0.75rem",
          }}
        >
          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.875rem", color: "#0f172a" }}>{collection.address}</div>
            <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#0f172a" }}>
              {collection.postcode}
            </div>
          </div>
          <button
            onClick={openNavigation}
            style={{
              padding: "0.5rem",
              backgroundColor: "#0d9488",
              color: "white",
              borderRadius: "0.375rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        {/* Contact */}
        {collection.contactName && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "0.5rem",
              padding: "0.5rem",
              backgroundColor: "#f8fafc",
              borderRadius: "0.375rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <User className="w-4 h-4 text-slate-400" />
              <span style={{ fontSize: "0.875rem", color: "#0f172a" }}>{collection.contactName}</span>
            </div>
            {collection.contactPhone && (
              <button
                onClick={callContact}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.375rem 0.75rem",
                  backgroundColor: "#eff6ff",
                  color: "#3b82f6",
                  borderRadius: "0.375rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                <Phone className="w-4 h-4" />
                Call
              </button>
            )}
          </div>
        )}

        {/* Items estimate */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "0.5rem",
            fontSize: "0.875rem",
            color: "#64748b",
          }}
        >
          <Package className="w-4 h-4" />
          <span>Est. {collection.itemEstimate} items</span>
          {collection.equipmentCategories.length > 0 && (
            <span>— {collection.equipmentCategories.slice(0, 2).join(", ")}</span>
          )}
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.25rem",
            width: "100%",
            marginTop: "0.75rem",
            padding: "0.5rem",
            backgroundColor: "transparent",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            fontSize: "0.75rem",
          }}
        >
          {expanded ? (
            <>
              Less details <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              More details <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "1rem", backgroundColor: "#f8fafc" }}>
          {collection.specialHandling && (
            <div style={{ marginBottom: "0.75rem" }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#dc2626",
                  marginBottom: "0.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <AlertTriangle className="w-3 h-3" />
                Special Handling
              </div>
              <div style={{ fontSize: "0.875rem", color: "#0f172a" }}>
                {collection.specialHandling}
              </div>
            </div>
          )}

          {collection.customerInstructions && (
            <div style={{ marginBottom: "0.75rem" }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#64748b",
                  marginBottom: "0.25rem",
                }}
              >
                Customer Instructions
              </div>
              <div style={{ fontSize: "0.875rem", color: "#0f172a" }}>
                {collection.customerInstructions}
              </div>
            </div>
          )}

          {collection.equipmentCategories.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#64748b",
                  marginBottom: "0.25rem",
                }}
              >
                Equipment Types
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                {collection.equipmentCategories.map((cat) => (
                  <span
                    key={cat}
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.125rem 0.5rem",
                      backgroundColor: "#e2e8f0",
                      borderRadius: "9999px",
                      color: "#475569",
                    }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          padding: "1rem",
          backgroundColor: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          gap: "0.5rem",
        }}
      >
        {canStartTransit && (
          <button
            onClick={() => handleStatusChange("IN_TRANSIT")}
            disabled={isPending}
            style={{
              flex: 1,
              padding: "0.75rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: isPending ? "not-allowed" : "pointer",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Truck className="w-5 h-5" />
                Start Transit
              </>
            )}
          </button>
        )}

        {canMarkCollected && (
          <button
            onClick={() => handleStatusChange("COLLECTED")}
            disabled={isPending}
            style={{
              flex: 1,
              padding: "0.75rem",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: isPending ? "not-allowed" : "pointer",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Mark Collected
              </>
            )}
          </button>
        )}

        {canReportException && !showException && (
          <button
            onClick={() => setShowException(true)}
            disabled={isPending}
            style={{
              padding: "0.75rem",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertTriangle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Exception Form */}
      {showException && (
        <div style={{ padding: "1rem", backgroundColor: "#fef2f2", borderTop: "1px solid #fecaca" }}>
          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#dc2626", marginBottom: "0.5rem" }}>
            Report Exception
          </div>
          <textarea
            value={exceptionReason}
            onChange={(e) => setExceptionReason(e.target.value)}
            placeholder="Describe the issue (e.g., customer unavailable, access denied, wrong address...)"
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #fecaca",
              marginBottom: "0.5rem",
              minHeight: "80px",
              resize: "none",
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => {
                setShowException(false);
                setExceptionReason("");
              }}
              style={{
                flex: 1,
                padding: "0.5rem",
                backgroundColor: "white",
                color: "#64748b",
                border: "1px solid #e2e8f0",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleException}
              disabled={isPending}
              style={{
                flex: 1,
                padding: "0.5rem",
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? "Submitting..." : "Submit Exception"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

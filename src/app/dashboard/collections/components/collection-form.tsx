"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building,
  MapPin,
  Calendar,
  Package,
  User,
  Phone,
  Mail,
  FileText,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { createCollection, type CollectionActionState } from "../actions";
import { EQUIPMENT_CATEGORIES, COLLECTION_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/collections";
import type { Customer, Site, RouteDate, CollectionZone } from "@prisma/client";

interface CollectionFormProps {
  customers: (Customer & { sites: Site[] })[];
  routes: (RouteDate & { zone: CollectionZone; _count: { collections: number } })[];
  initialData?: Partial<{
    customerId: string;
    siteId: string;
    collectionType: string;
    priority: string;
    address: string;
    postcode: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    itemEstimate: number;
    specialHandling: string;
    customerInstructions: string;
    internalNotes: string;
    equipmentCategories: string[];
  }>;
}

export function CollectionForm({ customers, routes, initialData }: CollectionFormProps) {
  const router = useRouter();
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialData?.customerId || "");
  const [selectedSiteId, setSelectedSiteId] = useState(initialData?.siteId || "");
  const [useScheduledRoute, setUseScheduledRoute] = useState(true);

  const [state, formAction, isPending] = useActionState<CollectionActionState, FormData>(
    createCollection,
    {}
  );

  useEffect(() => {
    if (state.success && state.collectionId) {
      router.push("/dashboard/collections");
    }
  }, [state.success, state.collectionId, router]);

  // Get selected customer's sites
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const availableSites = selectedCustomer?.sites || [];

  // Get selected site details
  const selectedSite = availableSites.find((s) => s.id === selectedSiteId);

  // Auto-fill address when site is selected
  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
  };

  return (
    <form action={formAction} className="form">
      {/* Error Display */}
      {state.error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.375rem",
            color: "#b91c1c",
            marginBottom: "1rem",
          }}
        >
          {state.error}
        </div>
      )}

      {/* Customer Selection */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Building className="w-4 h-4 text-teal-600" />
          Customer & Site
        </legend>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="customerId">Customer *</label>
            <select
              id="customerId"
              name="customerId"
              required
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setSelectedSiteId("");
              }}
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.reference})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="siteId">Site (optional)</label>
            <select
              id="siteId"
              name="siteId"
              value={selectedSiteId}
              onChange={(e) => handleSiteChange(e.target.value)}
              disabled={!selectedCustomerId}
            >
              <option value="">No specific site</option>
              {availableSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.reference})
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* Collection Details */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Truck className="w-4 h-4 text-teal-600" />
          Collection Details
        </legend>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="collectionType">Collection Type</label>
            <select id="collectionType" name="collectionType" defaultValue="STANDARD">
              {Object.entries(COLLECTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="priority">Priority</label>
            <select id="priority" name="priority" defaultValue="NORMAL">
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* Location */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <MapPin className="w-4 h-4 text-teal-600" />
          Collection Location
        </legend>

        <div className="field wide">
          <label htmlFor="address">Address *</label>
          <input
            id="address"
            name="address"
            required
            defaultValue={selectedSite?.address || initialData?.address || ""}
            key={selectedSiteId} // Reset when site changes
          />
        </div>

        <div className="field" style={{ maxWidth: "200px" }}>
          <label htmlFor="postcode">Postcode *</label>
          <input
            id="postcode"
            name="postcode"
            required
            defaultValue={selectedSite?.postcode || initialData?.postcode || ""}
            key={`postcode-${selectedSiteId}`}
            style={{ textTransform: "uppercase" }}
          />
        </div>
      </fieldset>

      {/* Contact */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <User className="w-4 h-4 text-teal-600" />
          Site Contact
        </legend>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="field">
            <label htmlFor="contactName">Contact Name</label>
            <input
              id="contactName"
              name="contactName"
              defaultValue={selectedSite?.contactName || initialData?.contactName || ""}
              key={`contact-${selectedSiteId}`}
            />
          </div>

          <div className="field">
            <label htmlFor="contactPhone">Phone</label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={selectedSite?.contactPhone || initialData?.contactPhone || ""}
              key={`phone-${selectedSiteId}`}
            />
          </div>

          <div className="field">
            <label htmlFor="contactEmail">Email</label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={selectedSite?.contactEmail || initialData?.contactEmail || ""}
              key={`email-${selectedSiteId}`}
            />
          </div>
        </div>
      </fieldset>

      {/* Equipment */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Package className="w-4 h-4 text-teal-600" />
          Equipment Details
        </legend>

        <div className="field">
          <label>Equipment Categories</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "0.5rem",
              padding: "0.75rem",
              backgroundColor: "#f8fafc",
              borderRadius: "0.375rem",
              border: "1px solid #e2e8f0",
            }}
          >
            {EQUIPMENT_CATEGORIES.map((category) => (
              <label
                key={category}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name={`equipment_${category}`}
                  defaultChecked={initialData?.equipmentCategories?.includes(category)}
                />
                {category}
              </label>
            ))}
          </div>
        </div>

        <div className="field" style={{ maxWidth: "200px" }}>
          <label htmlFor="itemEstimate">Estimated Item Count</label>
          <input
            id="itemEstimate"
            name="itemEstimate"
            type="number"
            min="0"
            defaultValue={initialData?.itemEstimate || 0}
          />
        </div>
      </fieldset>

      {/* Scheduling */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Calendar className="w-4 h-4 text-teal-600" />
          Scheduling
        </legend>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="radio"
              name="scheduleType"
              checked={useScheduledRoute}
              onChange={() => setUseScheduledRoute(true)}
            />
            Use scheduled route
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="radio"
              name="scheduleType"
              checked={!useScheduledRoute}
              onChange={() => setUseScheduledRoute(false)}
            />
            Request specific date
          </label>
        </div>

        {useScheduledRoute ? (
          <div className="field">
            <label htmlFor="routeDateId">Available Routes</label>
            {routes.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
                No routes available. Please request a specific date.
              </p>
            ) : (
              <select id="routeDateId" name="routeDateId" defaultValue="">
                <option value="">Select a route...</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.zone.name} — {r.serviceDate.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    ({r.capacity - r._count.collections} spaces left)
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div className="field" style={{ maxWidth: "200px" }}>
            <label htmlFor="requestedDate">Preferred Date *</label>
            <input
              id="requestedDate"
              name="requestedDate"
              type="date"
              required={!useScheduledRoute}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
        )}
      </fieldset>

      {/* Instructions */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <FileText className="w-4 h-4 text-teal-600" />
          Instructions & Notes
        </legend>

        <div className="field wide">
          <label htmlFor="specialHandling">
            <AlertTriangle className="w-4 h-4" style={{ display: "inline", marginRight: "0.25rem" }} />
            Special Handling Requirements
          </label>
          <textarea
            id="specialHandling"
            name="specialHandling"
            rows={2}
            placeholder="e.g., Heavy items require two-person lift, fragile equipment, access restrictions..."
            defaultValue={initialData?.specialHandling || ""}
          />
        </div>

        <div className="field wide">
          <label htmlFor="customerInstructions">Customer Instructions</label>
          <textarea
            id="customerInstructions"
            name="customerInstructions"
            rows={2}
            placeholder="Instructions from the customer..."
            defaultValue={selectedSite?.collectionInstructions || initialData?.customerInstructions || ""}
            key={`instructions-${selectedSiteId}`}
          />
        </div>

        <div className="field wide">
          <label htmlFor="internalNotes">Internal Notes (staff only)</label>
          <textarea
            id="internalNotes"
            name="internalNotes"
            rows={2}
            placeholder="Internal notes not visible to customer..."
            defaultValue={initialData?.internalNotes || ""}
          />
        </div>
      </fieldset>

      {/* Actions */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          name="submitAsDraft"
          value="true"
          className="btn btn-secondary"
          disabled={isPending}
        >
          Save as Draft
        </button>
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? "Creating..." : "Create Collection"}
        </button>
      </div>
    </form>
  );
}

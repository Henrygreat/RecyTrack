"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  Truck,
  Clock,
  Map,
} from "lucide-react";
import { createSite, updateSite, type SiteActionState } from "../actions";
import type { Site, CollectionZone } from "@prisma/client";

interface SiteFormProps {
  customerId: string;
  site?: Site;
  zones?: CollectionZone[];
  onSuccess?: (siteId: string) => void;
}

export function SiteForm({ customerId, site, zones = [], onSuccess }: SiteFormProps) {
  const router = useRouter();
  const isEdit = !!site;

  const action = isEdit ? updateSite : createSite;
  const [state, formAction, isPending] = useActionState<SiteActionState, FormData>(
    action,
    {}
  );

  useEffect(() => {
    if (state.success) {
      if (onSuccess && state.siteId) {
        onSuccess(state.siteId);
      } else {
        router.push(`/dashboard/customers/${customerId}?tab=sites`);
      }
    }
  }, [state.success, state.siteId, customerId, router, onSuccess]);

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="customerId" value={customerId} />
      {isEdit && <input type="hidden" name="id" value={site.id} />}

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

      {/* Basic Information */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
          }}
        >
          Site Details
        </legend>

        <div className="field">
          <label htmlFor="name">
            <MapPin className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Site Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={site?.name || ""}
            placeholder="e.g., Head Office, Warehouse A"
          />
        </div>

        <div className="field">
          <label htmlFor="address">Address *</label>
          <textarea
            id="address"
            name="address"
            rows={3}
            required
            defaultValue={site?.address || ""}
            placeholder="e.g., 123 Industrial Estate, London"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div className="field">
            <label htmlFor="postcode">Postcode *</label>
            <input
              id="postcode"
              name="postcode"
              type="text"
              required
              defaultValue={site?.postcode || ""}
              placeholder="e.g., SW1A 1AA"
              style={{ textTransform: "uppercase" }}
            />
          </div>

          <div className="field">
            <label htmlFor="zoneId">
              <Map className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Collection Zone
            </label>
            <select id="zoneId" name="zoneId" defaultValue={site?.zoneId || ""}>
              <option value="">No zone assigned</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="isDefault" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                id="isDefault"
                name="isDefault"
                type="checkbox"
                defaultChecked={site?.isDefault || false}
                value="true"
              />
              Default collection site
            </label>
          </div>
        </div>
      </fieldset>

      {/* Site Contact */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
          }}
        >
          Site Contact
        </legend>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div className="field">
            <label htmlFor="contactName">
              <User className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Contact Name
            </label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              defaultValue={site?.contactName || ""}
              placeholder="e.g., John Smith"
            />
          </div>

          <div className="field">
            <label htmlFor="contactPhone">
              <Phone className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Contact Phone
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={site?.contactPhone || ""}
              placeholder="e.g., 020 1234 5678"
            />
          </div>

          <div className="field">
            <label htmlFor="contactEmail">
              <Mail className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Contact Email
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={site?.contactEmail || ""}
              placeholder="e.g., site@company.com"
            />
          </div>
        </div>
      </fieldset>

      {/* Collection Instructions */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
          }}
        >
          Collection Information
        </legend>

        <div className="field">
          <label htmlFor="collectionInstructions">
            <FileText className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Collection Instructions
          </label>
          <textarea
            id="collectionInstructions"
            name="collectionInstructions"
            rows={3}
            defaultValue={site?.collectionInstructions || ""}
            placeholder="e.g., Report to reception, collection point is at rear loading bay"
          />
        </div>

        <div className="field">
          <label htmlFor="vehicleAccessNotes">
            <Truck className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Vehicle Access Notes
          </label>
          <textarea
            id="vehicleAccessNotes"
            name="vehicleAccessNotes"
            rows={2}
            defaultValue={site?.vehicleAccessNotes || ""}
            placeholder="e.g., Maximum 7.5t vehicle, height restriction 3m"
          />
        </div>

        <div className="field">
          <label htmlFor="openingHours">
            <Clock className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Opening Hours
          </label>
          <input
            id="openingHours"
            name="openingHours"
            type="text"
            defaultValue={site?.openingHours || ""}
            placeholder="e.g., Mon-Fri 08:00-17:00"
          />
        </div>
      </fieldset>

      {/* Actions */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </button>
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? "Saving..." : isEdit ? "Update Site" : "Create Site"}
        </button>
      </div>
    </form>
  );
}

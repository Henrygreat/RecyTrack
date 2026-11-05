"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Package,
  MapPin,
  User,
  FileText,
  ArrowRight,
} from "lucide-react";
import { initiateCustodyTransfer, type CustodyActionState } from "../actions";
import { CUSTODY_EVENT_TYPE_LABELS } from "@/lib/custody";
import type {
  Asset,
  User as PrismaUser,
  WarehouseLocation,
  CustodyEventType,
} from "@prisma/client";

interface CustodyTransferFormProps {
  assets: Pick<Asset, "id" | "assetTag" | "manufacturer" | "model" | "serialNumber">[];
  users: Pick<PrismaUser, "id" | "name" | "email">[];
  locations: Pick<WarehouseLocation, "id" | "name">[];
  preselectedAssetId?: string;
}

export function CustodyTransferForm({
  assets,
  users,
  locations,
  preselectedAssetId,
}: CustodyTransferFormProps) {
  const router = useRouter();
  const [selectedAssetId, setSelectedAssetId] = useState(preselectedAssetId || "");
  const [selectedEventType, setSelectedEventType] = useState<CustodyEventType | "">("");
  const [custodianType, setCustodianType] = useState<"user" | "external">("user");

  const [state, formAction, isPending] = useActionState<CustodyActionState, FormData>(
    initiateCustodyTransfer,
    {}
  );

  useEffect(() => {
    if (state.success && state.eventId) {
      router.push(`/dashboard/custody`);
    }
  }, [state.success, state.eventId, router]);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

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

      {/* Success Display */}
      {state.success && state.reference && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "0.375rem",
            color: "#15803d",
            marginBottom: "1rem",
          }}
        >
          Custody transfer initiated. Reference: <strong>{state.reference}</strong>
        </div>
      )}

      {/* Asset Selection */}
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
          Asset Selection
        </legend>

        <div className="field">
          <label htmlFor="assetId">Asset *</label>
          <select
            id="assetId"
            name="assetId"
            required
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
          >
            <option value="">Select an asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.assetTag} — {asset.manufacturer || "Unknown"} {asset.model || ""}
                {asset.serialNumber && ` (S/N: ${asset.serialNumber})`}
              </option>
            ))}
          </select>
        </div>

        {selectedAsset && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              backgroundColor: "#f8fafc",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              color: "#475569",
            }}
          >
            <strong>Selected:</strong> {selectedAsset.assetTag}
            {selectedAsset.manufacturer && ` — ${selectedAsset.manufacturer}`}
            {selectedAsset.model && ` ${selectedAsset.model}`}
          </div>
        )}
      </fieldset>

      {/* Transfer Type */}
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
          <ArrowRight className="w-4 h-4 text-teal-600" />
          Transfer Details
        </legend>

        <div className="field">
          <label htmlFor="eventType">Transfer Type *</label>
          <select
            id="eventType"
            name="eventType"
            required
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value as CustodyEventType)}
          >
            <option value="">Select transfer type</option>
            {Object.entries(CUSTODY_EVENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Receiving Party */}
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
          Receiving Party
        </legend>

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="custodianTypeSelector"
                value="user"
                checked={custodianType === "user"}
                onChange={() => setCustodianType("user")}
              />
              Internal User
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="custodianTypeSelector"
                value="external"
                checked={custodianType === "external"}
                onChange={() => setCustodianType("external")}
              />
              External Party
            </label>
          </div>
        </div>

        {custodianType === "user" ? (
          <div className="field">
            <label htmlFor="toCustodianUserId">Receiving User</label>
            <select
              id="toCustodianUserId"
              name="toCustodianUserId"
            >
              <option value="">Select receiving user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
            <input type="hidden" name="toCustodianType" value="internal" />
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
            <div className="field">
              <label htmlFor="toCustodianName">Recipient Name</label>
              <input
                type="text"
                id="toCustodianName"
                name="toCustodianName"
                maxLength={100}
                placeholder="Enter recipient name"
              />
            </div>
            <div className="field">
              <label htmlFor="toCustodianType">Recipient Type</label>
              <select id="toCustodianType" name="toCustodianType">
                <option value="external">External</option>
                <option value="customer">Customer</option>
                <option value="contractor">Contractor</option>
                <option value="courier">Courier</option>
              </select>
            </div>
          </div>
        )}
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
          Transfer Location
        </legend>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="toLocationId">Destination Location</label>
            <select id="toLocationId" name="toLocationId">
              <option value="">Select location (optional)</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="toLocationName">Or Enter Location Name</label>
            <input
              type="text"
              id="toLocationName"
              name="toLocationName"
              maxLength={200}
              placeholder="e.g., Customer Site, External Warehouse"
            />
          </div>
        </div>
      </fieldset>

      {/* Notes */}
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
          Additional Information
        </legend>

        <div className="field">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="Enter any additional details about this transfer..."
          />
        </div>
      </fieldset>

      {/* Submit */}
      <div className="form-actions">
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
          className="btn"
          disabled={isPending}
        >
          {isPending ? "Initiating..." : "Initiate Transfer"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Package,
  Building,
  MapPin,
  Wrench,
  HardDrive,
  Warehouse,
  DollarSign,
  FileText,
} from "lucide-react";
import { createAsset, updateAsset, type AssetActionState } from "../actions";
import {
  ASSET_CATEGORY_LABELS,
  PHYSICAL_CONDITION_LABELS,
  FUNCTIONAL_CONDITION_LABELS,
  DATA_BEARING_STATUS_LABELS,
  DISPOSITION_OUTCOME_LABELS,
  STORAGE_TYPES,
  isDataBearing,
} from "@/lib/assets";
import type {
  Customer,
  Site,
  Collection,
  WarehouseLocation,
  Asset,
  AssetCategory,
} from "@prisma/client";

interface AssetFormProps {
  customers: (Customer & { sites: Site[] })[];
  collections: Collection[];
  warehouseLocations: WarehouseLocation[];
  initialData?: Asset;
  mode?: "create" | "edit";
}

export function AssetForm({
  customers,
  collections,
  warehouseLocations,
  initialData,
  mode = "create",
}: AssetFormProps) {
  const router = useRouter();
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialData?.customerId || "");
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "">(
    initialData?.category || ""
  );

  const action = mode === "create" ? createAsset : updateAsset;
  const [state, formAction, isPending] = useActionState<AssetActionState, FormData>(action, {});

  useEffect(() => {
    if (state.success && state.assetId) {
      router.push(`/dashboard/assets/${state.assetId}`);
    }
  }, [state.success, state.assetId, router]);

  // Get selected customer's sites
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const availableSites = selectedCustomer?.sites || [];

  // Filter collections for selected customer
  const customerCollections = selectedCustomerId
    ? collections.filter((c) => c.customerId === selectedCustomerId)
    : collections;

  // Check if selected category is data-bearing
  const showDataFields = selectedCategory && isDataBearing(selectedCategory as AssetCategory);

  return (
    <form action={formAction} className="form">
      {/* Hidden ID for updates */}
      {mode === "edit" && initialData && <input type="hidden" name="id" value={initialData.id} />}

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

      {/* Success Display for Creates */}
      {state.success && state.assetTag && (
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
          Asset created successfully! Asset Tag: <strong>{state.assetTag}</strong>
        </div>
      )}

      {/* Equipment Details */}
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

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              required
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as AssetCategory)}
            >
              <option value="">Select category</option>
              {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {selectedCategory === "OTHER" && (
            <div className="field">
              <label htmlFor="categoryOther">Other Category</label>
              <input
                id="categoryOther"
                name="categoryOther"
                placeholder="Specify category..."
                defaultValue={initialData?.categoryOther || ""}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="manufacturer">Manufacturer</label>
            <input
              id="manufacturer"
              name="manufacturer"
              placeholder="e.g., Dell, HP, Apple..."
              defaultValue={initialData?.manufacturer || ""}
            />
          </div>

          <div className="field">
            <label htmlFor="model">Model</label>
            <input
              id="model"
              name="model"
              placeholder="e.g., Latitude 5520, ProBook 450..."
              defaultValue={initialData?.model || ""}
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr", marginTop: "1rem" }}>
          <div className="field">
            <label htmlFor="serialNumber">Serial Number</label>
            <input
              id="serialNumber"
              name="serialNumber"
              placeholder="Device serial number"
              defaultValue={initialData?.serialNumber || ""}
            />
          </div>

          <div className="field">
            <label htmlFor="customerAssetTag">Customer Asset Tag</label>
            <input
              id="customerAssetTag"
              name="customerAssetTag"
              placeholder="Customer's internal tag"
              defaultValue={initialData?.customerAssetTag || ""}
            />
          </div>
        </div>
      </fieldset>

      {/* Customer & Collection */}
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
          Customer & Source
        </legend>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="field">
            <label htmlFor="customerId">Customer</label>
            <select
              id="customerId"
              name="customerId"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="">No customer assigned</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.reference})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="siteId">Site</label>
            <select
              id="siteId"
              name="siteId"
              disabled={!selectedCustomerId}
              defaultValue={initialData?.siteId || ""}
            >
              <option value="">No specific site</option>
              {availableSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.reference})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="collectionId">Collection</label>
            <select
              id="collectionId"
              name="collectionId"
              defaultValue={initialData?.collectionId || ""}
            >
              <option value="">No collection linked</option>
              {customerCollections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.reference}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* Condition Assessment */}
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
          <Wrench className="w-4 h-4 text-teal-600" />
          Condition Assessment
        </legend>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="physicalCondition">Physical Condition</label>
            <select
              id="physicalCondition"
              name="physicalCondition"
              defaultValue={initialData?.physicalCondition || "FAIR"}
            >
              {Object.entries(PHYSICAL_CONDITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="functionalCondition">Functional Condition</label>
            <select
              id="functionalCondition"
              name="functionalCondition"
              defaultValue={initialData?.functionalCondition || "UNTESTED"}
            >
              {Object.entries(FUNCTIONAL_CONDITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field wide" style={{ marginTop: "1rem" }}>
          <label htmlFor="conditionNotes">Condition Notes</label>
          <textarea
            id="conditionNotes"
            name="conditionNotes"
            rows={2}
            placeholder="Any issues, damage notes, or observations..."
            defaultValue={initialData?.conditionNotes || ""}
          />
        </div>
      </fieldset>

      {/* Data Handling - Show only for data-bearing devices */}
      {showDataFields && (
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
            <HardDrive className="w-4 h-4 text-teal-600" />
            Data Handling
          </legend>

          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div className="field">
              <label htmlFor="dataBearingStatus">Data Status</label>
              <select
                id="dataBearingStatus"
                name="dataBearingStatus"
                defaultValue={initialData?.dataBearingStatus || "NOT_ASSESSED"}
              >
                {Object.entries(DATA_BEARING_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="storageType">Storage Type</label>
              <select
                id="storageType"
                name="storageType"
                defaultValue={initialData?.storageType || ""}
              >
                <option value="">Unknown</option>
                {STORAGE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="storageCapacity">Storage Capacity</label>
              <input
                id="storageCapacity"
                name="storageCapacity"
                placeholder="e.g., 256GB, 1TB"
                defaultValue={initialData?.storageCapacity || ""}
              />
            </div>
          </div>
        </fieldset>
      )}

      {/* Warehouse Location */}
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
          <Warehouse className="w-4 h-4 text-teal-600" />
          Warehouse Location
        </legend>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="warehouseLocationId">Location</label>
            <select
              id="warehouseLocationId"
              name="warehouseLocationId"
              defaultValue={initialData?.warehouseLocationId || ""}
            >
              <option value="">Not assigned</option>
              {warehouseLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="binLocation">Bin / Shelf</label>
            <input
              id="binLocation"
              name="binLocation"
              placeholder="e.g., A1-B2, Shelf 3"
              defaultValue={initialData?.binLocation || ""}
            />
          </div>
        </div>
      </fieldset>

      {/* Valuation & Disposition */}
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
          <DollarSign className="w-4 h-4 text-teal-600" />
          Valuation & Disposition
        </legend>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="field">
            <label htmlFor="estimatedValue">Estimated Value (£)</label>
            <input
              id="estimatedValue"
              name="estimatedValue"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              defaultValue={initialData?.estimatedValue?.toString() || ""}
            />
          </div>

          <div className="field">
            <label htmlFor="weight">Weight (kg)</label>
            <input
              id="weight"
              name="weight"
              type="number"
              step="0.001"
              min="0"
              placeholder="0.00"
              defaultValue={initialData?.weight?.toString() || ""}
            />
          </div>

          <div className="field">
            <label htmlFor="dispositionOutcome">Disposition Plan</label>
            <select
              id="dispositionOutcome"
              name="dispositionOutcome"
              defaultValue={initialData?.dispositionOutcome || "PENDING"}
            >
              {Object.entries(DISPOSITION_OUTCOME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field wide" style={{ marginTop: "1rem" }}>
          <label htmlFor="dispositionNotes">Disposition Notes</label>
          <textarea
            id="dispositionNotes"
            name="dispositionNotes"
            rows={2}
            placeholder="Special handling, destination, recycling instructions..."
            defaultValue={initialData?.dispositionNotes || ""}
          />
        </div>
      </fieldset>

      {/* Internal Notes */}
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
          Internal Notes
        </legend>

        <div className="field wide">
          <textarea
            id="internalNotes"
            name="internalNotes"
            rows={3}
            placeholder="Internal notes for staff only..."
            defaultValue={initialData?.internalNotes || ""}
          />
        </div>
      </fieldset>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "flex-end",
          paddingTop: "1rem",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </button>
        <button type="submit" className="btn" disabled={isPending}>
          {isPending
            ? mode === "create"
              ? "Registering..."
              : "Saving..."
            : mode === "create"
            ? "Register Asset"
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

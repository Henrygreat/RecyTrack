"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { createStorageMedia, updateStorageMedia } from "../../actions";
import type { MediaType } from "@prisma/client";

type Asset = {
  id: string;
  assetTag: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  customer: { id: string; name: string; reference: string } | null;
  _count?: { storageMedia: number };
};

type WarehouseLocation = {
  id: string;
  code: string;
  name: string;
};

type MediaData = {
  id: string;
  assetId: string;
  mediaType: MediaType;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  capacity: string | null;
  interface: string | null;
  isDataBearing: boolean;
  containsSensitiveData: boolean;
  dataClassification: string | null;
  isRemovable: boolean;
  warehouseLocationId: string | null;
  binLocation: string | null;
  notes: string | null;
};

interface StorageMediaFormProps {
  assets: Asset[];
  warehouseLocations: WarehouseLocation[];
  preSelectedAssetId?: string;
  initialData?: MediaData;
  mode?: "create" | "edit";
}

const mediaTypes: { value: MediaType; label: string }[] = [
  { value: "HDD", label: "Hard Disk Drive (HDD)" },
  { value: "SSD", label: "Solid State Drive (SSD)" },
  { value: "NVME", label: "NVMe Drive" },
  { value: "USB", label: "USB Flash Drive" },
  { value: "MEMORY_CARD", label: "Memory Card (SD, CF, etc.)" },
  { value: "EMBEDDED", label: "Embedded Storage (eMMC)" },
  { value: "OPTICAL", label: "Optical Disc (CD/DVD/Blu-ray)" },
  { value: "TAPE", label: "Magnetic Tape" },
  { value: "OTHER", label: "Other" },
];

const dataClassifications = [
  { value: "", label: "Not classified" },
  { value: "PUBLIC", label: "Public" },
  { value: "INTERNAL", label: "Internal" },
  { value: "CONFIDENTIAL", label: "Confidential" },
  { value: "HIGHLY_CONFIDENTIAL", label: "Highly Confidential" },
];

export function StorageMediaForm({
  assets,
  warehouseLocations,
  preSelectedAssetId,
  initialData,
  mode = "create",
}: StorageMediaFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    assetId: initialData?.assetId || preSelectedAssetId || "",
    mediaType: initialData?.mediaType || ("HDD" as MediaType),
    manufacturer: initialData?.manufacturer || "",
    model: initialData?.model || "",
    serialNumber: initialData?.serialNumber || "",
    capacity: initialData?.capacity || "",
    interface: initialData?.interface || "",
    isDataBearing: initialData?.isDataBearing ?? true,
    containsSensitiveData: initialData?.containsSensitiveData ?? false,
    dataClassification: initialData?.dataClassification || "",
    isRemovable: initialData?.isRemovable ?? false,
    warehouseLocationId: initialData?.warehouseLocationId || "",
    binLocation: initialData?.binLocation || "",
    notes: initialData?.notes || "",
  });

  const selectedAsset = assets.find((a) => a.id === formData.assetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "create") {
        const result = await createStorageMedia({
          assetId: formData.assetId,
          mediaType: formData.mediaType,
          manufacturer: formData.manufacturer || undefined,
          model: formData.model || undefined,
          serialNumber: formData.serialNumber || undefined,
          capacity: formData.capacity || undefined,
          interface: formData.interface || undefined,
          isDataBearing: formData.isDataBearing,
          containsSensitiveData: formData.containsSensitiveData,
          dataClassification: formData.dataClassification || undefined,
          isRemovable: formData.isRemovable,
          warehouseLocationId: formData.warehouseLocationId || undefined,
          binLocation: formData.binLocation || undefined,
          notes: formData.notes || undefined,
        });

        if (!result.success) {
          setError(result.error || "Failed to create storage media");
          return;
        }

        router.push(`/dashboard/destruction/media/${result.media?.id}`);
      } else if (initialData) {
        const result = await updateStorageMedia(initialData.id, {
          manufacturer: formData.manufacturer || undefined,
          model: formData.model || undefined,
          serialNumber: formData.serialNumber || undefined,
          capacity: formData.capacity || undefined,
          interface: formData.interface || undefined,
          isDataBearing: formData.isDataBearing,
          containsSensitiveData: formData.containsSensitiveData,
          dataClassification: formData.dataClassification || undefined,
          warehouseLocationId: formData.warehouseLocationId || null,
          binLocation: formData.binLocation || undefined,
          notes: formData.notes || undefined,
        });

        if (!result.success) {
          setError(result.error || "Failed to update storage media");
          return;
        }

        router.push(`/dashboard/destruction/media/${initialData.id}`);
      }

      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Asset Selection */}
      {mode === "create" && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Parent Asset <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.assetId}
            onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Select an asset...</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.assetTag} - {asset.category}
                {asset.manufacturer && ` (${asset.manufacturer}`}
                {asset.model && ` ${asset.model}`}
                {asset.manufacturer && ")"}
                {asset._count && asset._count.storageMedia > 0 && ` [${asset._count.storageMedia} media]`}
              </option>
            ))}
          </select>
          {selectedAsset?.customer && (
            <p className="mt-1 text-xs text-slate-500">
              Customer: {selectedAsset.customer.name}
            </p>
          )}
        </div>
      )}

      {/* Media Type */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Media Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.mediaType}
          onChange={(e) => setFormData({ ...formData, mediaType: e.target.value as MediaType })}
          required
          disabled={mode === "edit"}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50"
        >
          {mediaTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Manufacturer & Model */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Manufacturer</label>
          <input
            type="text"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            placeholder="e.g., Seagate, Samsung, Western Digital"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Model</label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            placeholder="e.g., ST1000DM010, 870 EVO"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Serial Number */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Serial Number</label>
        <input
          type="text"
          value={formData.serialNumber}
          onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
          placeholder="Drive serial number"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          The serial number is important for verification during destruction
        </p>
      </div>

      {/* Capacity & Interface */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Capacity</label>
          <input
            type="text"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            placeholder="e.g., 500GB, 1TB, 256GB"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Interface</label>
          <input
            type="text"
            value={formData.interface}
            onChange={(e) => setFormData({ ...formData, interface: e.target.value })}
            placeholder="e.g., SATA III, NVMe, USB 3.0"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Data Classification */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="mb-3 font-medium text-slate-900">Data Classification</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.isDataBearing}
              onChange={(e) => setFormData({ ...formData, isDataBearing: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700">This media is data-bearing</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.containsSensitiveData}
              onChange={(e) =>
                setFormData({ ...formData, containsSensitiveData: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700">Contains sensitive/confidential data</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.isRemovable}
              onChange={(e) => setFormData({ ...formData, isRemovable: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700">
              Removable media (can be tracked independently)
            </span>
          </label>

          <div className="pt-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Data Classification Level
            </label>
            <select
              value={formData.dataClassification}
              onChange={(e) => setFormData({ ...formData, dataClassification: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {dataClassifications.map((cls) => (
                <option key={cls.value} value={cls.value}>
                  {cls.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Warehouse Location
          </label>
          <select
            value={formData.warehouseLocationId}
            onChange={(e) => setFormData({ ...formData, warehouseLocationId: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">No location assigned</option>
            {warehouseLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.code} - {loc.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Bin/Shelf Location
          </label>
          <input
            type="text"
            value={formData.binLocation}
            onChange={(e) => setFormData({ ...formData, binLocation: e.target.value })}
            placeholder="e.g., Bin A-3, Shelf 2"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Additional notes about this storage media..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || (mode === "create" && !formData.assetId)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Register Media" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

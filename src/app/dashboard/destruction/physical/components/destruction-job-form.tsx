"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import { createDestructionJob } from "../../actions";
import type { DestructionMethod, MediaType } from "@prisma/client";

type StorageMedia = {
  id: string;
  reference: string;
  mediaType: MediaType;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  capacity: string | null;
  asset: {
    id: string;
    assetTag: string;
    category: string;
    customer: { id: string; name: string } | null;
  };
};

type Member = {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

interface DestructionJobFormProps {
  availableMedia: StorageMedia[];
  members: Member[];
  preSelectedMediaId?: string;
}

const destructionMethods: { value: DestructionMethod; label: string; description: string }[] = [
  {
    value: "SHRED",
    label: "Shredding",
    description: "Mechanical shredding into small particles",
  },
  {
    value: "CRUSH",
    label: "Crushing",
    description: "Physical crushing to destroy platters/chips",
  },
  {
    value: "DISINTEGRATE",
    label: "Disintegration",
    description: "Industrial disintegration into fine particles",
  },
  {
    value: "DEGAUSS",
    label: "Degaussing",
    description: "Magnetic field erasure (HDDs only)",
  },
  {
    value: "INCINERATE",
    label: "Incineration",
    description: "High-temperature destruction",
  },
  {
    value: "PUNCTURE",
    label: "Puncturing",
    description: "Physical puncturing of platters",
  },
  {
    value: "MELT",
    label: "Melting",
    description: "High-temperature melting",
  },
  {
    value: "DISSOLVE",
    label: "Chemical Dissolution",
    description: "Chemical destruction of media",
  },
  {
    value: "OTHER",
    label: "Other Method",
    description: "Other approved destruction method",
  },
];

const reasonCategories = [
  { value: "ERASURE_FAILED", label: "Erasure Failed" },
  { value: "DRIVE_FAILURE", label: "Drive Failure" },
  { value: "CUSTOMER_REQUEST", label: "Customer Request" },
  { value: "COMPLIANCE", label: "Compliance Requirement" },
  { value: "DAMAGED", label: "Physical Damage" },
  { value: "SSD_NO_CRYPTO", label: "SSD Without Crypto Erase" },
  { value: "OTHER", label: "Other" },
];

export function DestructionJobForm({
  availableMedia,
  members,
  preSelectedMediaId,
}: DestructionJobFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    storageMediaId: preSelectedMediaId || "",
    destructionReason: "",
    reasonCategory: "",
    destructionMethod: "" as DestructionMethod | "",
    methodDescription: "",
    equipmentUsed: "",
    scheduledDate: "",
    destructionLocation: "",
    requiresWitness: true,
    witnessCount: 1,
  });

  const selectedMedia = availableMedia.find((m) => m.id === formData.storageMediaId);
  const selectedMethod = destructionMethods.find((m) => m.value === formData.destructionMethod);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.destructionMethod) {
      setError("Please select a destruction method");
      setLoading(false);
      return;
    }

    try {
      const result = await createDestructionJob({
        storageMediaId: formData.storageMediaId,
        destructionReason: formData.destructionReason,
        reasonCategory: formData.reasonCategory || undefined,
        destructionMethod: formData.destructionMethod as DestructionMethod,
        methodDescription: formData.methodDescription || undefined,
        equipmentUsed: formData.equipmentUsed || undefined,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate) : undefined,
        destructionLocation: formData.destructionLocation || undefined,
        requiresWitness: formData.requiresWitness,
        witnessCount: formData.witnessCount,
      });

      if (!result.success) {
        setError(result.error || "Failed to schedule destruction");
        return;
      }

      router.push(`/dashboard/destruction/physical/${result.job?.id}`);
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

      {/* Warning */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Physical destruction is irreversible</p>
          <p className="mt-1">
            Ensure data erasure has been attempted first unless the media is damaged or
            destruction is specifically required by the customer or compliance.
          </p>
        </div>
      </div>

      {/* Media Selection */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Storage Media <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.storageMediaId}
          onChange={(e) => setFormData({ ...formData, storageMediaId: e.target.value })}
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">Select storage media...</option>
          {availableMedia.map((media) => (
            <option key={media.id} value={media.id}>
              {media.reference} - {media.mediaType}
              {media.capacity && ` (${media.capacity})`}
              {media.serialNumber && ` - S/N: ${media.serialNumber}`}
              {` - Asset: ${media.asset.assetTag}`}
            </option>
          ))}
        </select>
        {selectedMedia && (
          <div className="mt-2 rounded-lg bg-slate-50 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Type:</span>{" "}
                <span className="font-medium">{selectedMedia.mediaType}</span>
              </div>
              {selectedMedia.serialNumber && (
                <div>
                  <span className="text-slate-500">Serial:</span>{" "}
                  <span className="font-mono font-medium">{selectedMedia.serialNumber}</span>
                </div>
              )}
              {selectedMedia.asset.customer && (
                <div className="col-span-2">
                  <span className="text-slate-500">Customer:</span>{" "}
                  <span className="font-medium">{selectedMedia.asset.customer.name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Destruction Reason */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Reason for Destruction <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.reasonCategory}
          onChange={(e) => setFormData({ ...formData, reasonCategory: e.target.value })}
          className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">Select reason category...</option>
          {reasonCategories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <textarea
          value={formData.destructionReason}
          onChange={(e) => setFormData({ ...formData, destructionReason: e.target.value })}
          required
          rows={2}
          placeholder="Describe why physical destruction is required..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Destruction Method */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Destruction Method <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.destructionMethod}
          onChange={(e) =>
            setFormData({ ...formData, destructionMethod: e.target.value as DestructionMethod })
          }
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">Select destruction method...</option>
          {destructionMethods.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
        {selectedMethod && (
          <p className="mt-1 text-xs text-slate-500">{selectedMethod.description}</p>
        )}
      </div>

      {/* Equipment & Method Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Equipment Used
          </label>
          <input
            type="text"
            value={formData.equipmentUsed}
            onChange={(e) => setFormData({ ...formData, equipmentUsed: e.target.value })}
            placeholder="e.g., SEM Model 0101, Proton T-4"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Destruction Location
          </label>
          <input
            type="text"
            value={formData.destructionLocation}
            onChange={(e) => setFormData({ ...formData, destructionLocation: e.target.value })}
            placeholder="e.g., Warehouse Bay A, External Facility"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {formData.destructionMethod === "OTHER" && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Method Description
          </label>
          <textarea
            value={formData.methodDescription}
            onChange={(e) => setFormData({ ...formData, methodDescription: e.target.value })}
            rows={2}
            placeholder="Describe the destruction method..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      )}

      {/* Schedule */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Scheduled Date
        </label>
        <input
          type="date"
          value={formData.scheduledDate}
          onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Witness Requirements */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="mb-3 font-medium text-slate-900">Witness Requirements</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.requiresWitness}
              onChange={(e) =>
                setFormData({ ...formData, requiresWitness: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700">
              Witness verification required for destruction
            </span>
          </label>

          {formData.requiresWitness && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Number of Witnesses Required
              </label>
              <select
                value={formData.witnessCount}
                onChange={(e) =>
                  setFormData({ ...formData, witnessCount: parseInt(e.target.value) })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value={1}>1 witness</option>
                <option value={2}>2 witnesses</option>
                <option value={3}>3 witnesses</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Witnesses can be added after scheduling
              </p>
            </div>
          )}
        </div>
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
          disabled={
            loading ||
            !formData.storageMediaId ||
            !formData.destructionReason ||
            !formData.destructionMethod
          }
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Schedule Destruction
        </button>
      </div>
    </form>
  );
}

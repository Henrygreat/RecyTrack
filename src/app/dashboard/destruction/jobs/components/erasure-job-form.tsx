"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { createErasureJob } from "../../actions";
import type { MediaType, ErasureMethodCategory, EvidenceType } from "@prisma/client";

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

type ErasureMethod = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: ErasureMethodCategory;
  supportedMediaTypes: MediaType[];
  toolName: string | null;
  toolVersion: string | null;
  procedureRef: string | null;
  requiresEvidence: boolean;
  requiredEvidenceTypes: EvidenceType[];
  complianceStandards: string[];
  verificationMethod: string | null;
};

type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
} | null;

interface ErasureJobFormProps {
  availableMedia: StorageMedia[];
  methods: ErasureMethod[];
  currentUser: CurrentUser;
  preSelectedMediaId?: string;
}

export function ErasureJobForm({
  availableMedia,
  methods,
  currentUser,
  preSelectedMediaId,
}: ErasureJobFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    storageMediaId: preSelectedMediaId || "",
    erasureMethodId: "",
    toolUsed: "",
    toolVersion: "",
    procedureFollowed: "",
  });

  const selectedMedia = availableMedia.find((m) => m.id === formData.storageMediaId);
  const selectedMethod = methods.find((m) => m.id === formData.erasureMethodId);

  // Filter methods based on selected media type
  const compatibleMethods = selectedMedia
    ? methods.filter((m) => m.supportedMediaTypes.includes(selectedMedia.mediaType))
    : methods;

  // Auto-fill tool info when method is selected
  const handleMethodChange = (methodId: string) => {
    const method = methods.find((m) => m.id === methodId);
    setFormData({
      ...formData,
      erasureMethodId: methodId,
      toolUsed: method?.toolName || "",
      toolVersion: method?.toolVersion || "",
      procedureFollowed: method?.procedureRef || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createErasureJob({
        storageMediaId: formData.storageMediaId,
        erasureMethodId: formData.erasureMethodId,
        assignedTechnicianUserId: currentUser?.id,
        assignedTechnicianName: currentUser?.name || currentUser?.email,
        toolUsed: formData.toolUsed || undefined,
        toolVersion: formData.toolVersion || undefined,
        procedureFollowed: formData.procedureFollowed || undefined,
      });

      if (!result.success) {
        setError(result.error || "Failed to create erasure job");
        return;
      }

      router.push(`/dashboard/destruction/jobs/${result.job?.id}`);
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

      {/* Media Selection */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Storage Media <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.storageMediaId}
          onChange={(e) => {
            setFormData({ ...formData, storageMediaId: e.target.value, erasureMethodId: "" });
          }}
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
              {selectedMedia.manufacturer && (
                <div>
                  <span className="text-slate-500">Make:</span>{" "}
                  <span className="font-medium">{selectedMedia.manufacturer}</span>
                </div>
              )}
              {selectedMedia.model && (
                <div>
                  <span className="text-slate-500">Model:</span>{" "}
                  <span className="font-medium">{selectedMedia.model}</span>
                </div>
              )}
              {selectedMedia.asset.customer && (
                <div>
                  <span className="text-slate-500">Customer:</span>{" "}
                  <span className="font-medium">{selectedMedia.asset.customer.name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Method Selection */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Erasure Method <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.erasureMethodId}
          onChange={(e) => handleMethodChange(e.target.value)}
          required
          disabled={!selectedMedia}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50"
        >
          <option value="">Select erasure method...</option>
          {compatibleMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name} ({method.code}) - {method.category}
            </option>
          ))}
        </select>
        {selectedMedia && compatibleMethods.length === 0 && (
          <p className="mt-1 text-sm text-amber-600">
            No erasure methods configured for {selectedMedia.mediaType} media
          </p>
        )}
        {selectedMethod && (
          <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
              <div className="text-sm">
                {selectedMethod.description && (
                  <p className="text-blue-800">{selectedMethod.description}</p>
                )}
                {selectedMethod.complianceStandards.length > 0 && (
                  <p className="mt-1 text-blue-600">
                    Standards: {selectedMethod.complianceStandards.join(", ")}
                  </p>
                )}
                {selectedMethod.verificationMethod && (
                  <p className="mt-1 text-blue-600">
                    Verification: {selectedMethod.verificationMethod}
                  </p>
                )}
                {selectedMethod.requiredEvidenceTypes.length > 0 && (
                  <p className="mt-1 text-blue-600">
                    Required evidence: {selectedMethod.requiredEvidenceTypes.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tool Details */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="mb-3 font-medium text-slate-900">Tool/Procedure Details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Tool/Software Used
            </label>
            <input
              type="text"
              value={formData.toolUsed}
              onChange={(e) => setFormData({ ...formData, toolUsed: e.target.value })}
              placeholder="e.g., Blancco, DBAN, hdparm"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Tool Version
            </label>
            <input
              type="text"
              value={formData.toolVersion}
              onChange={(e) => setFormData({ ...formData, toolVersion: e.target.value })}
              placeholder="e.g., 7.2.1, 2024.1"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Procedure Reference
          </label>
          <input
            type="text"
            value={formData.procedureFollowed}
            onChange={(e) => setFormData({ ...formData, procedureFollowed: e.target.value })}
            placeholder="e.g., SOP-DATA-001, NIST SP 800-88 Rev.1"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Technician Info */}
      <div className="rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          <span className="font-medium">Assigned Technician:</span>{" "}
          {currentUser?.name || currentUser?.email || "Unknown"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          You will be assigned as the technician for this erasure job
        </p>
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
          disabled={loading || !formData.storageMediaId || !formData.erasureMethodId}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Erasure Job
        </button>
      </div>
    </form>
  );
}

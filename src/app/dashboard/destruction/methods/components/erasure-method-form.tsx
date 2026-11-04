"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Info, Plus, X } from "lucide-react";
import { createErasureMethod, updateErasureMethod } from "../../actions";
import type { ErasureMethodCategory, MediaType, EvidenceType } from "@prisma/client";

const CATEGORIES: { value: ErasureMethodCategory; label: string; description: string }[] = [
  { value: "CLEAR", label: "Clear", description: "Logical overwrite - protects against simple recovery" },
  { value: "PURGE", label: "Purge", description: "Advanced overwrite - protects against laboratory recovery" },
  { value: "CRYPTO_ERASE", label: "Cryptographic Erase", description: "Cryptographic key destruction" },
  { value: "BLOCK_ERASE", label: "Block Erase", description: "Factory block erase (SSD/NVMe)" },
  { value: "SECURE_ERASE", label: "Secure Erase", description: "ATA Secure Erase command" },
  { value: "SANITIZE", label: "Sanitize", description: "NVMe Sanitize command" },
  { value: "DEGAUSS", label: "Degauss", description: "Magnetic field erasure" },
  { value: "OTHER", label: "Other", description: "Other approved method" },
];

const MEDIA_TYPES: { value: MediaType; label: string }[] = [
  { value: "HDD", label: "HDD (Hard Disk Drive)" },
  { value: "SSD", label: "SSD (Solid State Drive)" },
  { value: "NVME", label: "NVMe (NVMe SSD)" },
  { value: "USB", label: "USB Flash Drive" },
  { value: "MEMORY_CARD", label: "Memory Card (SD, CF, etc.)" },
  { value: "EMBEDDED", label: "Embedded (eMMC, soldered)" },
  { value: "OPTICAL", label: "Optical (CD, DVD, Blu-ray)" },
  { value: "TAPE", label: "Magnetic Tape" },
  { value: "OTHER", label: "Other" },
];

const EVIDENCE_TYPES: { value: EvidenceType; label: string }[] = [
  { value: "LOG_FILE", label: "Log File" },
  { value: "SCREENSHOT", label: "Screenshot" },
  { value: "REPORT", label: "Report" },
  { value: "PHOTO", label: "Photo" },
  { value: "VIDEO", label: "Video" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "HASH_VERIFICATION", label: "Hash Verification" },
  { value: "SERIAL_CONFIRMATION", label: "Serial Confirmation" },
  { value: "OTHER", label: "Other" },
];

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
  requiresVerification: boolean;
  complianceStandards: string[];
  verificationMethod: string | null;
  verificationCriteria: string | null;
  isActive: boolean;
  sortOrder: number;
};

interface ErasureMethodFormProps {
  method?: ErasureMethod;
  mode: "create" | "edit";
}

export function ErasureMethodForm({ method, mode }: ErasureMethodFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newStandard, setNewStandard] = useState("");

  const [formData, setFormData] = useState({
    name: method?.name || "",
    code: method?.code || "",
    description: method?.description || "",
    category: method?.category || ("CLEAR" as ErasureMethodCategory),
    supportedMediaTypes: method?.supportedMediaTypes || ([] as MediaType[]),
    toolName: method?.toolName || "",
    toolVersion: method?.toolVersion || "",
    procedureRef: method?.procedureRef || "",
    requiresEvidence: method?.requiresEvidence ?? true,
    requiredEvidenceTypes: method?.requiredEvidenceTypes || ([] as EvidenceType[]),
    requiresVerification: method?.requiresVerification ?? true,
    complianceStandards: method?.complianceStandards || ([] as string[]),
    verificationMethod: method?.verificationMethod || "",
    verificationCriteria: method?.verificationCriteria || "",
    sortOrder: method?.sortOrder || 0,
  });

  const handleMediaTypeToggle = (mediaType: MediaType) => {
    setFormData((prev) => ({
      ...prev,
      supportedMediaTypes: prev.supportedMediaTypes.includes(mediaType)
        ? prev.supportedMediaTypes.filter((t) => t !== mediaType)
        : [...prev.supportedMediaTypes, mediaType],
    }));
  };

  const handleEvidenceTypeToggle = (evidenceType: EvidenceType) => {
    setFormData((prev) => ({
      ...prev,
      requiredEvidenceTypes: prev.requiredEvidenceTypes.includes(evidenceType)
        ? prev.requiredEvidenceTypes.filter((t) => t !== evidenceType)
        : [...prev.requiredEvidenceTypes, evidenceType],
    }));
  };

  const handleAddStandard = () => {
    if (newStandard.trim() && !formData.complianceStandards.includes(newStandard.trim())) {
      setFormData((prev) => ({
        ...prev,
        complianceStandards: [...prev.complianceStandards, newStandard.trim()],
      }));
      setNewStandard("");
    }
  };

  const handleRemoveStandard = (standard: string) => {
    setFormData((prev) => ({
      ...prev,
      complianceStandards: prev.complianceStandards.filter((s) => s !== standard),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("Method name is required");
      setLoading(false);
      return;
    }

    if (!formData.code.trim()) {
      setError("Method code is required");
      setLoading(false);
      return;
    }

    if (formData.supportedMediaTypes.length === 0) {
      setError("At least one supported media type is required");
      setLoading(false);
      return;
    }

    try {
      if (mode === "create") {
        const result = await createErasureMethod({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || undefined,
          category: formData.category,
          supportedMediaTypes: formData.supportedMediaTypes,
          toolName: formData.toolName.trim() || undefined,
          toolVersion: formData.toolVersion.trim() || undefined,
          procedureRef: formData.procedureRef.trim() || undefined,
          requiresEvidence: formData.requiresEvidence,
          requiredEvidenceTypes: formData.requiredEvidenceTypes,
          requiresVerification: formData.requiresVerification,
          complianceStandards: formData.complianceStandards,
          verificationMethod: formData.verificationMethod.trim() || undefined,
          verificationCriteria: formData.verificationCriteria.trim() || undefined,
          sortOrder: formData.sortOrder,
        });

        if (!result.success) {
          setError(result.error || "Failed to create erasure method");
          return;
        }

        router.push("/dashboard/destruction/methods");
        router.refresh();
      } else if (method) {
        const result = await updateErasureMethod(method.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          supportedMediaTypes: formData.supportedMediaTypes,
          toolName: formData.toolName.trim() || undefined,
          toolVersion: formData.toolVersion.trim() || undefined,
          procedureRef: formData.procedureRef.trim() || undefined,
          requiresEvidence: formData.requiresEvidence,
          requiredEvidenceTypes: formData.requiredEvidenceTypes,
          requiresVerification: formData.requiresVerification,
          complianceStandards: formData.complianceStandards,
          verificationMethod: formData.verificationMethod.trim() || undefined,
          verificationCriteria: formData.verificationCriteria.trim() || undefined,
          sortOrder: formData.sortOrder,
        });

        if (!result.success) {
          setError(result.error || "Failed to update erasure method");
          return;
        }

        router.push(`/dashboard/destruction/methods/${method.id}`);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = CATEGORIES.find((c) => c.value === formData.category);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-900">Basic Information</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Method Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., NIST 800-88 Clear"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Method Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., NIST-CLEAR"
              required
              disabled={mode === "edit"}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono uppercase focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            {mode === "edit" && (
              <p className="mt-1 text-xs text-slate-500">Code cannot be changed after creation</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the erasure method and its use case..."
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Sanitisation Category <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value as ErasureMethodCategory })
            }
            disabled={mode === "edit"}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {selectedCategory && (
            <p className="mt-1 text-xs text-slate-500">{selectedCategory.description}</p>
          )}
          {mode === "edit" && (
            <p className="mt-1 text-xs text-slate-500">Category cannot be changed after creation</p>
          )}
        </div>
      </div>

      {/* Supported Media Types */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Supported Media Types <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {MEDIA_TYPES.map((media) => (
            <button
              key={media.value}
              type="button"
              onClick={() => handleMediaTypeToggle(media.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                formData.supportedMediaTypes.includes(media.value)
                  ? "bg-teal-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {media.label}
            </button>
          ))}
        </div>
        {formData.supportedMediaTypes.length === 0 && (
          <p className="text-xs text-amber-600">Select at least one media type</p>
        )}
      </div>

      {/* Tool/Procedure Details */}
      <div className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900">Tool/Procedure Details</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Tool/Software Name
            </label>
            <input
              type="text"
              value={formData.toolName}
              onChange={(e) => setFormData({ ...formData, toolName: e.target.value })}
              placeholder="e.g., Blancco, DBAN, hdparm"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Tool Version</label>
            <input
              type="text"
              value={formData.toolVersion}
              onChange={(e) => setFormData({ ...formData, toolVersion: e.target.value })}
              placeholder="e.g., 7.2.1, 2024.1"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Procedure Reference
          </label>
          <input
            type="text"
            value={formData.procedureRef}
            onChange={(e) => setFormData({ ...formData, procedureRef: e.target.value })}
            placeholder="e.g., SOP-DATA-001, NIST SP 800-88 Rev.1"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Compliance Standards */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Compliance Standards</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newStandard}
            onChange={(e) => setNewStandard(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddStandard();
              }
            }}
            placeholder="e.g., NIST 800-88, DoD 5220.22-M"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={handleAddStandard}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {formData.complianceStandards.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.complianceStandards.map((standard) => (
              <span
                key={standard}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
              >
                {standard}
                <button
                  type="button"
                  onClick={() => handleRemoveStandard(standard)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Evidence Requirements */}
      <div className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900">Evidence Requirements</h3>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.requiresEvidence}
            onChange={(e) => setFormData({ ...formData, requiresEvidence: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700">Require evidence for job completion</span>
        </label>

        {formData.requiresEvidence && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Required Evidence Types
            </label>
            <div className="flex flex-wrap gap-2">
              {EVIDENCE_TYPES.map((evidence) => (
                <button
                  key={evidence.value}
                  type="button"
                  onClick={() => handleEvidenceTypeToggle(evidence.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    formData.requiredEvidenceTypes.includes(evidence.value)
                      ? "bg-teal-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {evidence.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Verification Requirements */}
      <div className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900">Verification Requirements</h3>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.requiresVerification}
            onChange={(e) => setFormData({ ...formData, requiresVerification: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700">
            Require supervisor verification before job completion
          </span>
        </label>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Verification Method
          </label>
          <input
            type="text"
            value={formData.verificationMethod}
            onChange={(e) => setFormData({ ...formData, verificationMethod: e.target.value })}
            placeholder="e.g., Read verification of all sectors"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Verification Criteria
          </label>
          <textarea
            value={formData.verificationCriteria}
            onChange={(e) => setFormData({ ...formData, verificationCriteria: e.target.value })}
            placeholder="e.g., All sectors must read as zeros or random data"
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Sort Order */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Display Order (lower numbers appear first)
        </label>
        <input
          type="number"
          value={formData.sortOrder}
          onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
          min={0}
          className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Important Notice */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Important</p>
          <p>
            This method template requires authorised review before operational use. Creating a
            method does not automatically approve it for sanitisation jobs.
          </p>
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
          disabled={loading || formData.supportedMediaTypes.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create Method" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

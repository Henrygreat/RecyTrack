"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createInspection, type InspectionActionState } from "../actions";
import type { AssetCategory } from "@prisma/client";
import { ASSET_CATEGORY_LABELS, PHYSICAL_CONDITION_LABELS, FUNCTIONAL_CONDITION_LABELS } from "@/lib/assets";

const INSPECTION_TYPES = [
  { value: "RECEIVING", label: "Receiving Inspection" },
  { value: "PERIODIC", label: "Periodic Inspection" },
  { value: "PRE_SALE", label: "Pre-Sale Check" },
  { value: "RANDOM", label: "Random Audit" },
  { value: "QUALITY_CONTROL", label: "Quality Control" },
  { value: "CUSTOMER_REQUEST", label: "Customer Request" },
  { value: "POST_REPAIR", label: "Post-Repair" },
];

const CONDITION_GRADES = [
  { value: "A", label: "Grade A - Excellent", description: "Like new, minimal wear" },
  { value: "B", label: "Grade B - Good", description: "Light wear, fully functional" },
  { value: "C", label: "Grade C - Fair", description: "Moderate wear, functional" },
  { value: "D", label: "Grade D - Poor", description: "Heavy wear, may have issues" },
  { value: "F", label: "Grade F - Faulty", description: "Non-functional or damaged" },
];

type Asset = {
  id: string;
  assetTag: string;
  manufacturer: string | null;
  model: string | null;
  category: AssetCategory;
  serialNumber: string | null;
};

type Template = {
  id: string;
  name: string;
  category: AssetCategory;
  version: number;
};

type Props = {
  assets: Asset[];
  templates: Template[];
  preselectedAssetId?: string;
};

export function InspectionForm({ assets, templates, preselectedAssetId }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<InspectionActionState, FormData>(
    createInspection,
    {}
  );
  const [selectedAssetId, setSelectedAssetId] = useState(preselectedAssetId || "");

  // Filter templates for selected asset's category
  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const matchingTemplates = selectedAsset
    ? templates.filter((t) => t.category === selectedAsset.category)
    : [];

  useEffect(() => {
    if (state.success && state.inspectionId) {
      router.push(`/dashboard/inspections/${state.inspectionId}`);
    }
  }, [state.success, state.inspectionId, router]);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {state.error}
        </div>
      )}

      {/* Asset Selection */}
      <div>
        <label htmlFor="assetId" className="block text-sm font-medium text-slate-700 mb-1">
          Asset <span className="text-red-500">*</span>
        </label>
        <select
          id="assetId"
          name="assetId"
          required
          value={selectedAssetId}
          onChange={(e) => setSelectedAssetId(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Select an asset...</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.assetTag} — {ASSET_CATEGORY_LABELS[asset.category]}
              {asset.manufacturer && ` (${asset.manufacturer}`}
              {asset.model && ` ${asset.model}`}
              {asset.manufacturer && ")"}
            </option>
          ))}
        </select>
        {selectedAsset && (
          <p className="mt-1 text-xs text-slate-500">
            Serial: {selectedAsset.serialNumber || "N/A"}
          </p>
        )}
      </div>

      {/* Inspection Type */}
      <div>
        <label htmlFor="inspectionType" className="block text-sm font-medium text-slate-700 mb-1">
          Inspection Type <span className="text-red-500">*</span>
        </label>
        <select
          id="inspectionType"
          name="inspectionType"
          required
          defaultValue="RECEIVING"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {INSPECTION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Template Selection */}
      {matchingTemplates.length > 0 && (
        <div>
          <label htmlFor="templateId" className="block text-sm font-medium text-slate-700 mb-1">
            Inspection Template (Optional)
          </label>
          <select
            id="templateId"
            name="templateId"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">No template</option>
            {matchingTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} (v{template.version})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Templates provide a checklist for consistent inspections.
          </p>
        </div>
      )}

      <hr className="border-slate-200" />

      {/* Condition Assessment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="physicalCondition" className="block text-sm font-medium text-slate-700 mb-1">
            Physical Condition
          </label>
          <select
            id="physicalCondition"
            name="physicalCondition"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Not assessed</option>
            {Object.entries(PHYSICAL_CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="functionalCondition" className="block text-sm font-medium text-slate-700 mb-1">
            Functional Condition
          </label>
          <select
            id="functionalCondition"
            name="functionalCondition"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Not assessed</option>
            {Object.entries(FUNCTIONAL_CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Condition Grade */}
      <div>
        <label htmlFor="conditionGrade" className="block text-sm font-medium text-slate-700 mb-1">
          Overall Condition Grade
        </label>
        <select
          id="conditionGrade"
          name="conditionGrade"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Select grade...</option>
          {CONDITION_GRADES.map((grade) => (
            <option key={grade.value} value={grade.value}>
              {grade.label} — {grade.description}
            </option>
          ))}
        </select>
      </div>

      {/* Grade Rationale */}
      <div>
        <label htmlFor="gradeRationale" className="block text-sm font-medium text-slate-700 mb-1">
          Grade Rationale
        </label>
        <textarea
          id="gradeRationale"
          name="gradeRationale"
          rows={2}
          placeholder="Explain why this grade was assigned..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <hr className="border-slate-200" />

      {/* Findings */}
      <div>
        <label htmlFor="findings" className="block text-sm font-medium text-slate-700 mb-1">
          Inspection Findings
        </label>
        <textarea
          id="findings"
          name="findings"
          rows={4}
          placeholder="Describe what was found during inspection..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Recommended Action */}
      <div>
        <label htmlFor="recommendedAction" className="block text-sm font-medium text-slate-700 mb-1">
          Recommended Action
        </label>
        <textarea
          id="recommendedAction"
          name="recommendedAction"
          rows={2}
          placeholder="What should be done with this asset?"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Inspector Comments */}
      <div>
        <label htmlFor="inspectorComments" className="block text-sm font-medium text-slate-700 mb-1">
          Additional Comments
        </label>
        <textarea
          id="inspectorComments"
          name="inspectorComments"
          rows={2}
          placeholder="Any additional notes or observations..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "Creating..." : "Create Inspection"}
        </button>
      </div>
    </form>
  );
}

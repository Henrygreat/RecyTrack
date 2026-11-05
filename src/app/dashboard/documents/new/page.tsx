"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Upload,
  Loader2,
  CheckCircle,
  Calendar,
  Lock,
} from "lucide-react";
import { createDocument, type ActionState } from "../actions";
import { DocumentCategory, Role } from "@prisma/client";

const CATEGORY_OPTIONS: { value: DocumentCategory; label: string; description: string }[] = [
  { value: "POLICY", label: "Policy", description: "Company policies and guidelines" },
  { value: "PROCEDURE", label: "Procedure", description: "Standard operating procedures" },
  { value: "TEMPLATE", label: "Template", description: "Document templates for reuse" },
  { value: "FORM", label: "Form", description: "Blank forms and checklists" },
  { value: "CONTRACT", label: "Contract", description: "Contracts and agreements" },
  { value: "COMPLIANCE", label: "Compliance", description: "Compliance documentation" },
  { value: "TRAINING", label: "Training", description: "Training materials and guides" },
  { value: "REPORT", label: "Report", description: "Generated reports and summaries" },
  { value: "OTHER", label: "Other", description: "Miscellaneous documents" },
];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "DRIVER", label: "Driver" },
];

export default function NewDocumentPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createDocument, {});
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("POLICY");
  const [isRestricted, setIsRestricted] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(null);

  // Redirect on success
  if (state.success && state.documentId) {
    router.push(`/dashboard/documents/${state.documentId}`);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }
  };

  const toggleRole = (role: Role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/documents"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
          <p className="text-gray-500">Add a new document to your library</p>
        </div>
      </div>

      <form action={formAction}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Upload className="h-5 w-5 text-teal-600" />
                  File Upload
                </h2>
              </div>
              <div className="p-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors">
                  <input
                    type="file"
                    id="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <label
                    htmlFor="file"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {fileInfo ? (
                      <>
                        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                        <p className="text-sm font-medium text-gray-900">{fileInfo.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(fileInfo.size / 1024).toFixed(1)} KB
                        </p>
                      </>
                    ) : (
                      <>
                        <FileText className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-sm font-medium text-gray-900">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, DOC, DOCX, XLS, XLSX up to 10MB
                        </p>
                      </>
                    )}
                  </label>
                </div>

                {/* Hidden file fields - in production these would be populated by upload service */}
                <input type="hidden" name="fileName" value={fileInfo?.name || ""} />
                <input
                  type="hidden"
                  name="fileUrl"
                  value={fileInfo ? `/uploads/documents/${fileInfo.name}` : ""}
                />
                <input type="hidden" name="fileSize" value={fileInfo?.size || ""} />
                <input type="hidden" name="mimeType" value={fileInfo?.type || ""} />

                {state.fieldErrors?.fileUrl && (
                  <p className="mt-2 text-sm text-red-600">{state.fieldErrors.fileUrl}</p>
                )}
              </div>
            </div>

            {/* Document Details */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <FileText className="h-5 w-5 text-teal-600" />
                  Document Details
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g. Data Protection Policy"
                  />
                  {state.fieldErrors?.title && (
                    <p className="mt-1 text-sm text-red-600">{state.fieldErrors.title}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Brief description of the document..."
                  />
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tags
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Comma-separated tags, e.g. GDPR, compliance, data"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Separate tags with commas for easy filtering
                  </p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Calendar className="h-5 w-5 text-teal-600" />
                  Important Dates
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="effectiveDate"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Effective Date
                  </label>
                  <input
                    type="date"
                    id="effectiveDate"
                    name="effectiveDate"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reviewDate"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Review Date
                  </label>
                  <input
                    type="date"
                    id="reviewDate"
                    name="reviewDate"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="expiryDate"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    id="expiryDate"
                    name="expiryDate"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Category */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Category</h2>
              </div>
              <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                {CATEGORY_OPTIONS.map((cat) => (
                  <label
                    key={cat.value}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedCategory === cat.value
                        ? "bg-teal-50 border border-teal-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      checked={selectedCategory === cat.value}
                      onChange={() => setSelectedCategory(cat.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cat.label}</p>
                      <p className="text-xs text-gray-500">{cat.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Access Control */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Lock className="h-5 w-5 text-teal-600" />
                  Access Control
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isRestricted"
                    checked={isRestricted}
                    onChange={(e) => setIsRestricted(e.target.checked)}
                    value="true"
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Restrict Access</p>
                    <p className="text-xs text-gray-500">Only selected roles can view</p>
                  </div>
                </label>

                {isRestricted && (
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Allowed Roles</p>
                    {ROLE_OPTIONS.map((role) => (
                      <label
                        key={role.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.value)}
                          onChange={() => toggleRole(role.value)}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{role.label}</span>
                      </label>
                    ))}
                    <input
                      type="hidden"
                      name="allowedRoles"
                      value={selectedRoles.join(",")}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {state.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending || !fileInfo}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Document
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

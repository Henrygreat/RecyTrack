import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Download,
  Clock,
  CheckCircle,
  Archive,
  User,
  Calendar,
  Tag,
  Lock,
  History,
  Edit,
  Upload,
  Trash2,
} from "lucide-react";
import { getDocument, approveDocument, archiveDocument, deleteDocument } from "../actions";
import { DocumentCategory, DocumentStatus } from "@prisma/client";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  POLICY: "Policy",
  PROCEDURE: "Procedure",
  TEMPLATE: "Template",
  FORM: "Form",
  CONTRACT: "Contract",
  COMPLIANCE: "Compliance",
  TRAINING: "Training",
  REPORT: "Report",
  OTHER: "Other",
};

const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  POLICY: "bg-purple-100 text-purple-700",
  PROCEDURE: "bg-blue-100 text-blue-700",
  TEMPLATE: "bg-cyan-100 text-cyan-700",
  FORM: "bg-green-100 text-green-700",
  CONTRACT: "bg-amber-100 text-amber-700",
  COMPLIANCE: "bg-red-100 text-red-700",
  TRAINING: "bg-pink-100 text-pink-700",
  REPORT: "bg-indigo-100 text-indigo-700",
  OTHER: "bg-gray-100 text-gray-700",
};

const STATUS_CONFIG: Record<
  DocumentStatus,
  { icon: typeof Clock; color: string; bg: string; label: string }
> = {
  DRAFT: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Draft" },
  ACTIVE: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", label: "Active" },
  ARCHIVED: { icon: Archive, color: "text-gray-500", bg: "bg-gray-50", label: "Archived" },
  DELETED: { icon: Trash2, color: "text-red-600", bg: "bg-red-50", label: "Deleted" },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getDocument(id);

  if (!result.success || !result.document) {
    notFound();
  }

  const doc = result.document;
  const statusConfig = STATUS_CONFIG[doc.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/documents"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{doc.title}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[doc.category]}`}
              >
                {CATEGORY_LABELS[doc.category]}
              </span>
            </div>
            <p className="text-gray-500">{doc.reference} • Version {doc.version}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
          {doc.status === "DRAFT" && (
            <form action={async () => { "use server"; await approveDocument(id); }}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
            </form>
          )}
          {doc.status === "ACTIVE" && (
            <form action={async () => { "use server"; await archiveDocument(id); }}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Info */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Document Information</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${statusConfig.bg}`}
                >
                  <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">{statusConfig.label}</p>
                  <p className="text-sm text-gray-500">
                    {doc.status === "ACTIVE" && doc.approvedAt && (
                      <>Approved {formatDate(doc.approvedAt)} by {doc.approvedByName}</>
                    )}
                    {doc.status === "DRAFT" && "Awaiting approval"}
                    {doc.status === "ARCHIVED" && "No longer active"}
                  </p>
                </div>
              </div>

              {doc.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600">{doc.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">File Name</p>
                  <p className="text-sm text-gray-900">{doc.fileName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">File Size</p>
                  <p className="text-sm text-gray-900">{formatFileSize(doc.fileSize)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Type</p>
                  <p className="text-sm text-gray-900">{doc.mimeType || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Version History */}
          {doc.versions.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <History className="h-5 w-5 text-teal-600" />
                  Version History
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {doc.versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm font-medium text-gray-600">
                        v{version.version}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">
                          {version.uploadedByName || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(version.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_CONFIG[version.status].bg
                        } ${STATUS_CONFIG[version.status].color}`}
                      >
                        {STATUS_CONFIG[version.status].label}
                      </span>
                      <a
                        href={version.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
            </div>
            <div className="p-4 space-y-2">
              <Link
                href={`/dashboard/documents/${id}/edit`}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 text-gray-400" />
                Edit Details
              </Link>
              <Link
                href={`/dashboard/documents/${id}/upload`}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 text-gray-400" />
                Upload New Version
              </Link>
              <form action={async () => { "use server"; await deleteDocument(id); }}>
                <button
                  type="submit"
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Document
                </button>
              </form>
            </div>
          </div>

          {/* Ownership */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <User className="h-5 w-5 text-teal-600" />
                Ownership
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Owner</p>
                <p className="text-sm text-gray-900">{doc.ownerName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Uploaded By</p>
                <p className="text-sm text-gray-900">{doc.uploadedByName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created</p>
                <p className="text-sm text-gray-900">{formatDateTime(doc.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Updated</p>
                <p className="text-sm text-gray-900">{formatDateTime(doc.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Important Dates */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Calendar className="h-5 w-5 text-teal-600" />
                Important Dates
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Effective</p>
                <p className="text-sm text-gray-900">{formatDate(doc.effectiveDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Review Due</p>
                <p className="text-sm text-gray-900">{formatDate(doc.reviewDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Expires</p>
                <p className="text-sm text-gray-900">{formatDate(doc.expiryDate)}</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          {doc.tags.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Tag className="h-5 w-5 text-teal-600" />
                  Tags
                </h2>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {doc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Access Control */}
          {doc.isRestricted && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
              <div className="px-6 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <h2 className="text-sm font-semibold text-amber-800">Restricted Access</h2>
                </div>
                <p className="text-xs text-amber-700">
                  This document is only visible to: {doc.allowedRoles.join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

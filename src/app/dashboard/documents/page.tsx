import { Suspense } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  FolderOpen,
  Clock,
  CheckCircle,
  Archive,
  AlertTriangle,
  Download,
  Eye,
} from "lucide-react";
import { getDocuments, getDocumentStats } from "./actions";
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

const STATUS_ICONS: Record<DocumentStatus, typeof FileText> = {
  DRAFT: Clock,
  ACTIVE: CheckCircle,
  ARCHIVED: Archive,
  DELETED: AlertTriangle,
};

const STATUS_COLORS: Record<DocumentStatus, string> = {
  DRAFT: "text-amber-600",
  ACTIVE: "text-green-600",
  ARCHIVED: "text-gray-500",
  DELETED: "text-red-600",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function DocumentLibrary({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const category = params.category as DocumentCategory | undefined;
  const status = params.status as DocumentStatus | undefined;
  const search = params.search;

  const [docsResult, statsResult] = await Promise.all([
    getDocuments({ category, status, search, currentVersionOnly: true }),
    getDocumentStats(),
  ]);

  const documents = docsResult.documents || [];
  const stats = statsResult.stats;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                <FolderOpen className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Documents</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.byStatus.ACTIVE || 0}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.byStatus.DRAFT || 0}</p>
                <p className="text-sm text-gray-500">Draft</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingReview}</p>
                <p className="text-sm text-gray-500">Needs Review</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <form className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search documents..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              name="category"
              defaultValue={category || ""}
              className="rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={status || ""}
              className="rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Document List */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No documents found</p>
            <Link
              href="/dashboard/documents/new"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Upload Document
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {documents.map((doc) => {
                const StatusIcon = STATUS_ICONS[doc.status];
                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-gray-400 flex-shrink-0" />
                        <div>
                          <Link
                            href={`/dashboard/documents/${doc.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-teal-600"
                          >
                            {doc.title}
                          </Link>
                          <p className="text-xs text-gray-500">{doc.reference}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[doc.category]}`}
                      >
                        {CATEGORY_LABELS[doc.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`h-4 w-4 ${STATUS_COLORS[doc.status]}`} />
                        <span className="text-sm text-gray-700 capitalize">
                          {doc.status.toLowerCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">v{doc.version}</span>
                      {doc._count.versions > 0 && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({doc._count.versions} prev)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(doc.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/documents/${doc.id}`}
                          className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default async function DocumentsPage(props: {
  searchParams: Promise<{ category?: string; status?: string; search?: string }>;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Library</h1>
          <p className="text-gray-500">Manage your organisation&apos;s documents and policies</p>
        </div>
        <Link
          href="/dashboard/documents/new"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Upload Document
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          </div>
        }
      >
        <DocumentLibrary searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

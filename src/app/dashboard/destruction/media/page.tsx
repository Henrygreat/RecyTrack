"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  HardDrive,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getStorageMedia } from "../actions";
import type { MediaSanitisationStatus, MediaType } from "@prisma/client";

const statusColors: Record<MediaSanitisationStatus, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700",
  PENDING_ERASURE: "bg-blue-100 text-blue-700",
  ERASURE_IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  ERASURE_PASSED: "bg-emerald-100 text-emerald-700",
  ERASURE_FAILED: "bg-red-100 text-red-700",
  PENDING_DESTRUCTION: "bg-orange-100 text-orange-700",
  DESTRUCTION_IN_PROGRESS: "bg-amber-100 text-amber-700",
  DESTROYED: "bg-purple-100 text-purple-700",
  VERIFIED: "bg-green-100 text-green-700",
  EXEMPT: "bg-gray-100 text-gray-600",
};

const mediaTypeLabels: Record<MediaType, string> = {
  HDD: "Hard Drive (HDD)",
  SSD: "Solid State (SSD)",
  NVME: "NVMe Drive",
  USB: "USB Flash Drive",
  MEMORY_CARD: "Memory Card",
  EMBEDDED: "Embedded Storage",
  OPTICAL: "Optical Disc",
  TAPE: "Magnetic Tape",
  OTHER: "Other",
};

type MediaItem = {
  id: string;
  reference: string;
  mediaType: MediaType;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  capacity: string | null;
  sanitisationStatus: MediaSanitisationStatus;
  containsSensitiveData: boolean;
  createdAt: Date;
  asset: {
    id: string;
    assetTag: string;
    category: string;
    manufacturer: string | null;
    model: string | null;
    customer: { id: string; name: string; reference: string } | null;
  };
  warehouseLocation: { id: string; code: string; name: string } | null;
  erasureJobs: Array<{
    id: string;
    reference: string;
    status: string;
    completedAt: Date | null;
  }>;
  destructionJob: {
    id: string;
    reference: string;
    status: string;
    completedAt: Date | null;
  } | null;
};

export default function StorageMediaListPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MediaSanitisationStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "">("");

  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStorageMedia({
        search: search || undefined,
        status: statusFilter || undefined,
        mediaType: typeFilter || undefined,
      });
      if (result.success && result.media) {
        setMedia(result.media as unknown as MediaItem[]);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMedia();
  };

  const statusOptions: MediaSanitisationStatus[] = [
    "NOT_STARTED",
    "PENDING_ERASURE",
    "ERASURE_IN_PROGRESS",
    "ERASURE_PASSED",
    "ERASURE_FAILED",
    "PENDING_DESTRUCTION",
    "DESTRUCTION_IN_PROGRESS",
    "DESTROYED",
    "VERIFIED",
    "EXEMPT",
  ];

  const typeOptions: MediaType[] = [
    "HDD",
    "SSD",
    "NVME",
    "USB",
    "MEMORY_CARD",
    "EMBEDDED",
    "OPTICAL",
    "TAPE",
    "OTHER",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/destruction"
            className="rounded-lg p-2 hover:bg-slate-100"
            title="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Storage Media Register</h1>
            <p className="text-sm text-slate-500">Data-bearing media tracked for sanitisation</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMedia}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/destruction/media/new"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Register Media
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by reference, serial, manufacturer..."
                  className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </form>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as MediaSanitisationStatus | "")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as MediaType | "")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">All Types</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {mediaTypeLabels[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <HardDrive className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No Storage Media</h3>
              <p className="mt-2 text-sm text-slate-500">
                {search || statusFilter || typeFilter
                  ? "No media matches your filters"
                  : "Start by registering storage media from assets"}
              </p>
              {!search && !statusFilter && !typeFilter && (
                <Link
                  href="/dashboard/destruction/media/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  Register Media
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {media.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/destruction/media/${item.id}`}
                          className="font-mono text-sm font-medium text-teal-600 hover:text-teal-700"
                        >
                          {item.reference}
                        </Link>
                        {item.containsSensitiveData && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                            <AlertCircle className="mr-0.5 h-3 w-3" />
                            Sensitive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-900">{item.mediaType}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {item.manufacturer && (
                            <span className="text-slate-600">{item.manufacturer}</span>
                          )}
                          {item.model && (
                            <span className="text-slate-500"> {item.model}</span>
                          )}
                          {item.capacity && (
                            <span className="ml-1 text-slate-400">({item.capacity})</span>
                          )}
                        </div>
                        {item.serialNumber && (
                          <div className="font-mono text-xs text-slate-500">
                            S/N: {item.serialNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/assets/${item.asset.id}`}
                          className="text-sm text-teal-600 hover:text-teal-700"
                        >
                          {item.asset.assetTag}
                        </Link>
                        <div className="text-xs text-slate-500">{item.asset.category}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.asset.customer?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.sanitisationStatus]}`}
                        >
                          {item.sanitisationStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.warehouseLocation ? (
                          <span>{item.warehouseLocation.code}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  Filter,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Award,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPortalAssets } from "../actions";
import type { AssetStatus } from "@prisma/client";

const statusColors: Record<AssetStatus, string> = {
  EXPECTED: "bg-slate-100 text-slate-700",
  COLLECTED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-teal-100 text-teal-700",
  INSPECTION: "bg-amber-100 text-amber-700",
  QUARANTINED: "bg-red-100 text-red-700",
  DATA_ERASURE: "bg-orange-100 text-orange-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  READY: "bg-green-100 text-green-700",
  LISTED: "bg-indigo-100 text-indigo-700",
  SOLD: "bg-emerald-100 text-emerald-700",
  RECYCLED: "bg-cyan-100 text-cyan-700",
  DESTROYED: "bg-slate-100 text-slate-500",
  RETURNED: "bg-amber-100 text-amber-700",
  RELEASED: "bg-slate-100 text-slate-600",
};

type AssetItem = {
  id: string;
  assetTag: string;
  customerAssetTag: string | null;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  status: AssetStatus;
  receivedAt: Date | null;
  processedAt: Date | null;
  collectionReference: string | null;
  collectionDate: Date | null;
  mediaCount: number;
  sanitisationComplete: boolean;
  hasCertificate: boolean;
};

export default function PortalAssetsPage() {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "">("");
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    async function loadAssets() {
      setLoading(true);
      const result = await getPortalAssets({
        status: statusFilter || undefined,
        search: searchDebounce || undefined,
        page,
        limit: 25,
      });
      if (result.success) {
        setAssets(result.assets as AssetItem[]);
        setTotalPages(result.pagination.totalPages);
        setTotal(result.pagination.total);
      }
      setLoading(false);
    }
    loadAssets();
  }, [statusFilter, searchDebounce, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchDebounce]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Assets</h1>
        <p className="text-slate-500 mt-1">
          Track the processing status of your assets
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assets..."
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AssetStatus | "")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">All Statuses</option>
                <option value="RECEIVED">At Facility</option>
                <option value="INSPECTION">In Inspection</option>
                <option value="PROCESSING">Processing</option>
                <option value="READY">Ready</option>
                <option value="RELEASED">Released</option>
              </select>
            </div>
            <div className="text-sm text-slate-500">
              {total} asset{total !== 1 && "s"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No Assets</h3>
              <p className="mt-2 text-sm text-slate-500">
                {statusFilter || search
                  ? "No assets match your filters"
                  : "No assets have been collected yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Collection</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/portal/assets/${asset.id}`}
                            className="font-mono text-sm font-medium text-teal-600 hover:text-teal-700"
                          >
                            {asset.assetTag}
                          </Link>
                          {asset.customerAssetTag && (
                            <div className="text-xs text-slate-500">
                              Ref: {asset.customerAssetTag}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-900">{asset.category}</div>
                          <div className="text-xs text-slate-500">
                            {[asset.manufacturer, asset.model].filter(Boolean).join(" ") || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {asset.collectionReference ? (
                            <div>
                              <div className="text-sm text-slate-700 font-mono">
                                {asset.collectionReference}
                              </div>
                              {asset.collectionDate && (
                                <div className="text-xs text-slate-500">
                                  {new Date(asset.collectionDate).toLocaleDateString("en-GB")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[asset.status]}`}
                          >
                            {asset.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {asset.mediaCount > 0 && (
                              <>
                                {asset.sanitisationComplete ? (
                                  <span className="flex items-center gap-1 text-xs text-green-600">
                                    <CheckCircle className="h-3 w-3" />
                                    Sanitised
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-amber-600">
                                    <Clock className="h-3 w-3" />
                                    Pending
                                  </span>
                                )}
                              </>
                            )}
                            {asset.hasCertificate && (
                              <span className="flex items-center gap-1 text-xs text-teal-600">
                                <Award className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <div className="text-sm text-slate-500">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm border rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm border rounded-lg disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

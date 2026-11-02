"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  Search,
  Filter,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPortalCertificates } from "../actions";
import type { CertificateStatus, CertificateType } from "@prisma/client";

const statusColors: Record<string, string> = {
  ISSUED: "bg-green-100 text-green-700",
  REVOKED: "bg-red-100 text-red-700",
  SUPERSEDED: "bg-slate-100 text-slate-500",
};

const statusIcons: Record<string, typeof CheckCircle> = {
  ISSUED: CheckCircle,
  REVOKED: XCircle,
  SUPERSEDED: Award,
};

type CertificateItem = {
  id: string;
  reference: string | null;
  certificateNumber: string;
  certificateType: string;
  status: CertificateStatus;
  issueDate: Date | null;
  totalMediaCount: number;
  verificationToken: string | null;
  revokedAt: Date | null;
  supersededAt: Date | null;
};

export default function PortalCertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    async function loadCertificates() {
      setLoading(true);
      const result = await getPortalCertificates({
        type: typeFilter ? (typeFilter as CertificateType) : undefined,
        search: searchDebounce || undefined,
        page,
        limit: 25,
      });
      if (result.success) {
        setCertificates(result.certificates as CertificateItem[]);
        setTotalPages(result.pagination.totalPages);
        setTotal(result.pagination.total);
      }
      setLoading(false);
    }
    loadCertificates();
  }, [typeFilter, searchDebounce, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, searchDebounce]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Certificates</h1>
        <p className="text-slate-500 mt-1">
          View and download your data sanitisation and destruction certificates
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
                placeholder="Search certificates..."
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">All Types</option>
                <option value="DATA_SANITISATION">Data Sanitisation</option>
                <option value="PHYSICAL_DESTRUCTION">Physical Destruction</option>
                <option value="COMBINED">Combined</option>
                <option value="BATCH">Batch</option>
              </select>
            </div>
            <div className="text-sm text-slate-500">
              {total} certificate{total !== 1 && "s"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificates List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : certificates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Award className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                No Certificates
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {typeFilter || search
                  ? "No certificates match your filters"
                  : "No certificates have been issued yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {certificates.map((cert) => {
                  const StatusIcon = statusIcons[cert.status] || Award;
                  return (
                    <Link
                      key={cert.id}
                      href={`/portal/certificates/${cert.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                        <Award className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-medium text-slate-900">
                            {cert.certificateNumber}
                          </p>
                          {cert.reference && (
                            <span className="text-xs text-slate-500">
                              Ref: {cert.reference}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {cert.certificateType.replace(/_/g, " ")}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span>{cert.totalMediaCount} media items</span>
                          {cert.issueDate && (
                            <span>
                              Issued:{" "}
                              {new Date(cert.issueDate).toLocaleDateString(
                                "en-GB"
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[cert.status]}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {cert.status}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-teal-600 hover:text-teal-700">
                            View
                          </span>
                          <ExternalLink className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
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

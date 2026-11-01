"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  Plus,
  Filter,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Search,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getCertificates, getCertificateStats } from "./actions";
import type { CertificateStatus, CertificateType } from "@prisma/client";

const statusColors: Record<CertificateStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  ISSUED: "bg-green-100 text-green-700",
  REVOKED: "bg-red-100 text-red-700",
  SUPERSEDED: "bg-purple-100 text-purple-700",
};

const typeLabels: Record<CertificateType, string> = {
  DATA_ERASURE: "Data Erasure",
  PHYSICAL_DESTRUCTION: "Physical Destruction",
  BATCH: "Batch Certificate",
};

type CertificateItem = {
  id: string;
  reference: string;
  certificateNumber: string;
  certificateType: CertificateType;
  status: CertificateStatus;
  issueDate: Date | null;
  totalMediaCount: number;
  createdAt: Date;
  customer: { id: string; name: string; reference: string };
  _count: { items: number };
};

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalCertificates: number;
    draftCount: number;
    pendingApprovalCount: number;
    issuedCount: number;
    revokedCount: number;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<CertificateStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<CertificateType | "">("");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [certsResult, statsResult] = await Promise.all([
        getCertificates({
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          search: search || undefined,
        }),
        getCertificateStats(),
      ]);

      if (certsResult.success && certsResult.certificates) {
        setCertificates(certsResult.certificates as unknown as CertificateItem[]);
      }
      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Certificates</h1>
          <p className="text-sm text-slate-500">
            Manage data sanitisation and destruction certificates
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/certificates/new"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            New Certificate
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalCertificates}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <Award className="h-8 w-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-600">{stats.draftCount}</p>
                  <p className="text-xs text-slate-500">Drafts</p>
                </div>
                <FileText className="h-8 w-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.pendingApprovalCount}</p>
                  <p className="text-xs text-slate-500">Pending</p>
                </div>
                <Clock className="h-8 w-8 text-amber-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.issuedCount}</p>
                  <p className="text-xs text-slate-500">Issued</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.revokedCount}</p>
                  <p className="text-xs text-slate-500">Revoked</p>
                </div>
                <XCircle className="h-8 w-8 text-red-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="h-4 w-4 text-slate-400" />
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CertificateStatus | "")}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="ISSUED">Issued</option>
              <option value="REVOKED">Revoked</option>
              <option value="SUPERSEDED">Superseded</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as CertificateType | "")}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Types</option>
              <option value="DATA_ERASURE">Data Erasure</option>
              <option value="PHYSICAL_DESTRUCTION">Physical Destruction</option>
              <option value="BATCH">Batch</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Certificate List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : certificates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Award className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No Certificates</h3>
              <p className="mt-2 text-sm text-slate-500">
                {statusFilter || typeFilter || search
                  ? "No certificates match your filters"
                  : "Create certificates from verified sanitisation jobs"}
              </p>
              {!statusFilter && !typeFilter && !search && (
                <Link
                  href="/dashboard/certificates/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  New Certificate
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                    <th className="px-4 py-3">Certificate</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Issued</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/certificates/${cert.id}`}
                          className="font-mono text-sm font-medium text-teal-600 hover:text-teal-700"
                        >
                          {cert.certificateNumber}
                        </Link>
                        <div className="text-xs text-slate-500">{cert.reference}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/customers/${cert.customer.id}`}
                          className="text-sm text-teal-600 hover:text-teal-700"
                        >
                          {cert.customer.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {typeLabels[cert.certificateType]}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {cert._count.items} media
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {cert.issueDate
                          ? new Date(cert.issueDate).toLocaleDateString("en-GB")
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[cert.status]}`}
                        >
                          {cert.status.replace(/_/g, " ")}
                        </span>
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

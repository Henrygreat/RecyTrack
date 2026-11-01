"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Eraser,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getErasureJobs } from "../actions";
import type { ErasureJobStatus } from "@prisma/client";

const statusColors: Record<ErasureJobStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  PASSED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  INCONCLUSIVE: "bg-orange-100 text-orange-700",
  PENDING_VERIFICATION: "bg-blue-100 text-blue-700",
  VERIFIED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const statusIcons: Record<ErasureJobStatus, typeof Clock> = {
  PENDING: Clock,
  IN_PROGRESS: Loader2,
  PASSED: CheckCircle,
  FAILED: AlertCircle,
  INCONCLUSIVE: AlertCircle,
  PENDING_VERIFICATION: Clock,
  VERIFIED: CheckCircle,
  CANCELLED: AlertCircle,
};

type ErasureJobItem = {
  id: string;
  reference: string;
  status: ErasureJobStatus;
  methodName: string;
  methodCode: string;
  assignedTechnicianName: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  storageMedia: {
    id: string;
    reference: string;
    mediaType: string;
    serialNumber: string | null;
    asset: {
      id: string;
      assetTag: string;
      customer: { id: string; name: string } | null;
    };
  };
  erasureMethod: { id: string; name: string; code: string } | null;
  evidence: Array<{ id: string; evidenceType: string; fileName: string }>;
};

export default function ErasureJobsListPage() {
  const [jobs, setJobs] = useState<ErasureJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ErasureJobStatus | "">("");

  const loadJobs = async () => {
    setLoading(true);
    try {
      const result = await getErasureJobs({
        status: statusFilter || undefined,
      });
      if (result.success && result.jobs) {
        setJobs(result.jobs as unknown as ErasureJobItem[]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [statusFilter]);

  const statusOptions: ErasureJobStatus[] = [
    "PENDING",
    "IN_PROGRESS",
    "PASSED",
    "FAILED",
    "INCONCLUSIVE",
    "PENDING_VERIFICATION",
    "VERIFIED",
    "CANCELLED",
  ];

  // Group jobs by status for quick stats
  const stats = {
    pending: jobs.filter((j) => j.status === "PENDING").length,
    inProgress: jobs.filter((j) => j.status === "IN_PROGRESS").length,
    pendingVerification: jobs.filter((j) => j.status === "PENDING_VERIFICATION").length,
    verified: jobs.filter((j) => j.status === "VERIFIED").length,
  };

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
            <h1 className="text-2xl font-bold text-slate-900">Erasure Jobs</h1>
            <p className="text-sm text-slate-500">Data sanitisation operations</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadJobs}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/destruction/jobs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            New Erasure Job
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
              <Clock className="h-8 w-8 text-slate-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
                <p className="text-xs text-slate-500">In Progress</p>
              </div>
              <Loader2 className="h-8 w-8 text-yellow-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.pendingVerification}</p>
                <p className="text-xs text-slate-500">Awaiting Verification</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
                <p className="text-xs text-slate-500">Verified</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ErasureJobStatus | "")}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Eraser className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No Erasure Jobs</h3>
              <p className="mt-2 text-sm text-slate-500">
                {statusFilter
                  ? "No jobs match your filter"
                  : "Start by creating an erasure job for storage media"}
              </p>
              {!statusFilter && (
                <Link
                  href="/dashboard/destruction/jobs/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  New Erasure Job
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Media</th>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Technician</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Evidence</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => {
                    const StatusIcon = statusIcons[job.status];
                    return (
                      <tr key={job.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/destruction/jobs/${job.id}`}
                            className="font-mono text-sm font-medium text-teal-600 hover:text-teal-700"
                          >
                            {job.reference}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/destruction/media/${job.storageMedia.id}`}
                            className="text-sm text-teal-600 hover:text-teal-700"
                          >
                            {job.storageMedia.reference}
                          </Link>
                          <div className="text-xs text-slate-500">
                            {job.storageMedia.mediaType}
                            {job.storageMedia.serialNumber && ` - ${job.storageMedia.serialNumber}`}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/assets/${job.storageMedia.asset.id}`}
                            className="text-sm text-teal-600 hover:text-teal-700"
                          >
                            {job.storageMedia.asset.assetTag}
                          </Link>
                          {job.storageMedia.asset.customer && (
                            <div className="text-xs text-slate-500">
                              {job.storageMedia.asset.customer.name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-900">{job.methodName}</span>
                          <div className="text-xs text-slate-500">{job.methodCode}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {job.assignedTechnicianName || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[job.status]}`}
                          >
                            <StatusIcon
                              className={`h-3 w-3 ${job.status === "IN_PROGRESS" ? "animate-spin" : ""}`}
                            />
                            {job.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {job.evidence.length > 0 ? (
                            <span className="text-teal-600">{job.evidence.length} files</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(job.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

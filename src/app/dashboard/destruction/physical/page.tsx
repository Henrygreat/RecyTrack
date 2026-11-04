"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Hammer,
  Plus,
  Filter,
  RefreshCw,
  ChevronLeft,
  Loader2,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getDestructionJobs } from "../actions";
import type { DestructionStatus, DestructionMethod } from "@prisma/client";

const statusColors: Record<DestructionStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  PENDING_VERIFICATION: "bg-purple-100 text-purple-700",
  VERIFIED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

type DestructionJobItem = {
  id: string;
  reference: string;
  status: DestructionStatus;
  destructionMethod: DestructionMethod;
  destructionReason: string;
  scheduledDate: Date | null;
  completedAt: Date | null;
  performedByName: string | null;
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
  witnesses: Array<{
    id: string;
    witnessName: string;
    confirmedAt: Date | null;
  }>;
  evidence: Array<{ id: string; evidenceType: string; fileName: string }>;
};

export default function PhysicalDestructionListPage() {
  const [jobs, setJobs] = useState<DestructionJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DestructionStatus | "">("");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDestructionJobs({
        status: statusFilter || undefined,
      });
      if (result.success && result.jobs) {
        setJobs(result.jobs as unknown as DestructionJobItem[]);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const statusOptions: DestructionStatus[] = [
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "PENDING_VERIFICATION",
    "VERIFIED",
    "CANCELLED",
  ];

  // Group jobs by status for quick stats
  const stats = {
    scheduled: jobs.filter((j) => j.status === "SCHEDULED").length,
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
            <h1 className="text-2xl font-bold text-slate-900">Physical Destruction</h1>
            <p className="text-sm text-slate-500">Track physical media destruction operations</p>
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
            href="/dashboard/destruction/physical/new"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            Schedule Destruction
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.scheduled}</p>
                <p className="text-xs text-slate-500">Scheduled</p>
              </div>
              <Clock className="h-8 w-8 text-blue-300" />
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
              <Hammer className="h-8 w-8 text-yellow-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.pendingVerification}</p>
                <p className="text-xs text-slate-500">Awaiting Verification</p>
              </div>
              <Users className="h-8 w-8 text-purple-300" />
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
              onChange={(e) => setStatusFilter(e.target.value as DestructionStatus | "")}
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
              <Hammer className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                No Destruction Jobs
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {statusFilter
                  ? "No jobs match your filter"
                  : "Schedule physical destruction for media that cannot be erased"}
              </p>
              {!statusFilter && (
                <Link
                  href="/dashboard/destruction/physical/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  <Plus className="h-4 w-4" />
                  Schedule Destruction
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
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Scheduled</th>
                    <th className="px-4 py-3">Witnesses</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => {
                    const confirmedWitnesses = job.witnesses.filter((w) => w.confirmedAt).length;
                    return (
                      <tr key={job.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/destruction/physical/${job.id}`}
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
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {job.destructionMethod.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {job.scheduledDate
                            ? new Date(job.scheduledDate).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                              })
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-sm ${confirmedWitnesses === job.witnesses.length && job.witnesses.length > 0 ? "text-green-600" : "text-slate-600"}`}
                          >
                            {confirmedWitnesses}/{job.witnesses.length}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[job.status]}`}
                          >
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

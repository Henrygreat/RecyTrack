"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  HardDrive,
  Eraser,
  Hammer,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus,
  ChevronRight,
  FileWarning,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getDestructionStats, getStorageMedia, getErasureJobs, getDestructionJobs } from "./actions";
import type { MediaSanitisationStatus, ErasureJobStatus, DestructionStatus } from "@prisma/client";

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

const jobStatusColors: Record<ErasureJobStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  PASSED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  INCONCLUSIVE: "bg-orange-100 text-orange-700",
  PENDING_VERIFICATION: "bg-blue-100 text-blue-700",
  VERIFIED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const destructionStatusColors: Record<DestructionStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  PENDING_VERIFICATION: "bg-purple-100 text-purple-700",
  VERIFIED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

type Stats = {
  totalMedia: number;
  pendingErasure: number;
  erasureInProgress: number;
  pendingDestruction: number;
  verified: number;
  pendingJobs: number;
  activeJobs: number;
  pendingVerification: number;
};

type MediaItem = {
  id: string;
  reference: string;
  mediaType: string;
  serialNumber: string | null;
  sanitisationStatus: MediaSanitisationStatus;
  asset: {
    id: string;
    assetTag: string;
    customer: { id: string; name: string } | null;
  };
};

type ErasureJobItem = {
  id: string;
  reference: string;
  status: ErasureJobStatus;
  methodName: string;
  assignedTechnicianName: string | null;
  createdAt: Date;
  storageMedia: {
    reference: string;
    asset: {
      assetTag: string;
      customer: { name: string } | null;
    };
  };
};

type DestructionJobItem = {
  id: string;
  reference: string;
  status: DestructionStatus;
  destructionMethod: string;
  scheduledDate: Date | null;
  storageMedia: {
    reference: string;
    asset: {
      assetTag: string;
      customer: { name: string } | null;
    };
  };
};

export default function DestructionDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [activeErasureJobs, setActiveErasureJobs] = useState<ErasureJobItem[]>([]);
  const [pendingDestructionJobs, setPendingDestructionJobs] = useState<DestructionJobItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsResult, mediaResult, erasureResult, destructionResult] = await Promise.all([
        getDestructionStats(),
        getStorageMedia(),
        getErasureJobs(),
        getDestructionJobs(),
      ]);

      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }
      if (mediaResult.success && mediaResult.media) {
        setRecentMedia(mediaResult.media.slice(0, 5) as unknown as MediaItem[]);
      }
      if (erasureResult.success && erasureResult.jobs) {
        const activeJobs = (erasureResult.jobs as unknown as ErasureJobItem[]).filter(
          (j) => j.status === "IN_PROGRESS" || j.status === "PENDING_VERIFICATION" || j.status === "PENDING"
        );
        setActiveErasureJobs(activeJobs.slice(0, 5));
      }
      if (destructionResult.success && destructionResult.jobs) {
        const pendingJobs = (destructionResult.jobs as unknown as DestructionJobItem[]).filter(
          (j) => j.status === "SCHEDULED" || j.status === "IN_PROGRESS" || j.status === "PENDING_VERIFICATION"
        );
        setPendingDestructionJobs(pendingJobs.slice(0, 5));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Sanitisation</h1>
          <p className="text-sm text-slate-500">
            Manage data erasure jobs and physical media destruction
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
            href="/dashboard/destruction/media/new"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Register Media
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <HardDrive className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.totalMedia || 0}</p>
                <p className="text-xs text-slate-500">Total Media</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {(stats?.pendingErasure || 0) + (stats?.erasureInProgress || 0)}
                </p>
                <p className="text-xs text-slate-500">Awaiting Erasure</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.pendingVerification || 0}
                </p>
                <p className="text-xs text-slate-500">Pending Verification</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.verified || 0}</p>
                <p className="text-xs text-slate-500">Verified Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/destruction/media"
          className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
        >
          <div className="rounded-lg bg-teal-100 p-3">
            <HardDrive className="h-6 w-6 text-teal-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-slate-900">Storage Media</h3>
            <p className="text-sm text-slate-500">View and manage storage media register</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>

        <Link
          href="/dashboard/destruction/jobs"
          className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
        >
          <div className="rounded-lg bg-blue-100 p-3">
            <Eraser className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-slate-900">Erasure Jobs</h3>
            <p className="text-sm text-slate-500">Data erasure operations</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>

        <Link
          href="/dashboard/destruction/physical"
          className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
        >
          <div className="rounded-lg bg-red-100 p-3">
            <Hammer className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-slate-900">Physical Destruction</h3>
            <p className="text-sm text-slate-500">Physical media destruction tracking</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Erasure Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eraser className="h-4 w-4 text-teal-600" />
              Active Erasure Jobs
            </CardTitle>
            <Link
              href="/dashboard/destruction/jobs"
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {activeErasureJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Eraser className="h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No active erasure jobs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeErasureJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/dashboard/destruction/jobs/${job.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-slate-900">
                          {job.reference}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${jobStatusColors[job.status]}`}
                        >
                          {job.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {job.storageMedia.asset.assetTag} - {job.methodName}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Destruction */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Hammer className="h-4 w-4 text-teal-600" />
              Pending Physical Destruction
            </CardTitle>
            <Link
              href="/dashboard/destruction/physical"
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {pendingDestructionJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Hammer className="h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No pending destruction jobs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDestructionJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/dashboard/destruction/physical/${job.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-slate-900">
                          {job.reference}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${destructionStatusColors[job.status]}`}
                        >
                          {job.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {job.storageMedia.asset.assetTag} - {job.destructionMethod}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Media */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4 text-teal-600" />
            Recent Storage Media
          </CardTitle>
          <Link
            href="/dashboard/destruction/media"
            className="text-sm text-teal-600 hover:text-teal-700"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <HardDrive className="h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No storage media registered</p>
              <Link
                href="/dashboard/destruction/media/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                <Plus className="h-4 w-4" />
                Register First Media
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase text-slate-500">
                    <th className="pb-3 pr-4">Reference</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Serial</th>
                    <th className="pb-3 pr-4">Asset</th>
                    <th className="pb-3 pr-4">Customer</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentMedia.map((media) => (
                    <tr key={media.id} className="text-sm">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/dashboard/destruction/media/${media.id}`}
                          className="font-mono font-medium text-teal-600 hover:text-teal-700"
                        >
                          {media.reference}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{media.mediaType}</td>
                      <td className="py-3 pr-4 font-mono text-slate-600">
                        {media.serialNumber || "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/dashboard/assets/${media.asset.id}`}
                          className="text-teal-600 hover:text-teal-700"
                        >
                          {media.asset.assetTag}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {media.asset.customer?.name || "-"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[media.sanitisationStatus]}`}
                        >
                          {media.sanitisationStatus.replace(/_/g, " ")}
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

      {/* Configuration Link */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-slate-500" />
            <div>
              <p className="font-medium text-slate-700">Erasure Method Configuration</p>
              <p className="text-sm text-slate-500">
                Configure approved data sanitisation methods and procedures
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/destruction/methods"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Configure Methods
            <ChevronRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

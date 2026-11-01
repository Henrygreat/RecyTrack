"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  HardDrive,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Play,
  Shield,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  getErasureJobById,
  startErasureJob,
  completeErasureJob,
  approveErasureJob,
  rejectErasureJob,
} from "../../actions";
import type { ErasureJobStatus, ErasureMethodCategory } from "@prisma/client";

const statusColors: Record<ErasureJobStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  PASSED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  INCONCLUSIVE: "bg-orange-100 text-orange-700",
  PENDING_VERIFICATION: "bg-purple-100 text-purple-700",
  VERIFIED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const categoryColors: Record<ErasureMethodCategory, string> = {
  CLEAR: "bg-blue-100 text-blue-700",
  PURGE: "bg-purple-100 text-purple-700",
  CRYPTO_ERASE: "bg-indigo-100 text-indigo-700",
  BLOCK_ERASE: "bg-cyan-100 text-cyan-700",
  SECURE_ERASE: "bg-teal-100 text-teal-700",
  SANITIZE: "bg-emerald-100 text-emerald-700",
  DEGAUSS: "bg-amber-100 text-amber-700",
  OTHER: "bg-slate-100 text-slate-700",
};

type ErasureJobDetail = {
  id: string;
  reference: string;
  status: ErasureJobStatus;
  methodName: string;
  methodCode: string;
  methodCategory: ErasureMethodCategory;
  toolUsed: string | null;
  toolVersion: string | null;
  procedureFollowed: string | null;
  assignedTechnicianName: string | null;
  assignedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  outcome: string | null;
  passCount: number | null;
  executionNotes: string | null;
  failureReason: string | null;
  failureCategory: string | null;
  verificationStatus: string | null;
  verificationMethod: string | null;
  verificationResult: string | null;
  verifiedAt: Date | null;
  verifiedByName: string | null;
  supervisorApprovalRequired: boolean;
  supervisorApprovedAt: Date | null;
  supervisorApprovedByName: string | null;
  supervisorNotes: string | null;
  retryCount: number;
  retryReason: string | null;
  previousJobId: string | null;
  createdAt: Date;
  createdByName: string;
  storageMedia: {
    id: string;
    reference: string;
    mediaType: string;
    serialNumber: string | null;
    manufacturer: string | null;
    model: string | null;
    capacity: string | null;
    sanitisationStatus: string;
    asset: {
      id: string;
      assetTag: string;
      category: string;
      manufacturer: string | null;
      model: string | null;
      serialNumber: string | null;
      customer: { id: string; name: string; reference: string } | null;
    };
  };
  erasureMethod: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    category: ErasureMethodCategory;
    complianceStandards: string[];
    verificationMethod: string | null;
    verificationCriteria: string | null;
  } | null;
  evidence: Array<{
    id: string;
    evidenceType: string;
    fileName: string;
    fileUrl: string;
    fileHash: string | null;
    description: string | null;
    uploadedByName: string;
    createdAt: Date;
  }>;
};

export default function ErasureJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<ErasureJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [showApproval, setShowApproval] = useState(false);

  const loadJob = async () => {
    setLoading(true);
    try {
      const result = await getErasureJobById(params.id as string);
      if (result.success && result.job) {
        setJob(result.job as unknown as ErasureJobDetail);
      } else {
        setError(result.error || "Failed to load job");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [params.id]);

  const handleStart = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await startErasureJob(params.id as string);
      if (result.success) {
        await loadJob();
      } else {
        setError(result.error || "Failed to start job");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (
    outcome: "PASSED" | "FAILED" | "INCONCLUSIVE",
    data: {
      executionNotes?: string;
      passCount?: number;
      failureReason?: string;
      verificationResult?: string;
    }
  ) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await completeErasureJob(params.id as string, {
        outcome,
        ...data,
      });
      if (result.success) {
        setShowComplete(false);
        await loadJob();
      } else {
        setError(result.error || "Failed to complete job");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (notes?: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await approveErasureJob(params.id as string, notes);
      if (result.success) {
        setShowApproval(false);
        await loadJob();
      } else {
        setError(result.error || "Failed to approve job");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await rejectErasureJob(params.id as string, reason);
      if (result.success) {
        setShowApproval(false);
        await loadJob();
      } else {
        setError(result.error || "Failed to reject job");
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <h3 className="mt-4 text-lg font-semibold text-slate-900">Job Not Found</h3>
        <p className="mt-2 text-sm text-slate-500">{error || "The erasure job could not be found"}</p>
        <Link
          href="/dashboard/destruction/jobs"
          className="mt-4 text-sm text-teal-600 hover:text-teal-700"
        >
          Back to Erasure Jobs
        </Link>
      </div>
    );
  }

  const outcomeIcon =
    job.outcome === "PASSED" ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : job.outcome === "FAILED" ? (
      <XCircle className="h-5 w-5 text-red-500" />
    ) : job.outcome === "INCONCLUSIVE" ? (
      <AlertTriangle className="h-5 w-5 text-orange-500" />
    ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/destruction/jobs"
            className="rounded-lg p-2 hover:bg-slate-100"
            title="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{job.reference}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[job.status]}`}
              >
                {job.status.replace(/_/g, " ")}
              </span>
              {job.retryCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <RefreshCw className="h-3 w-3" />
                  Retry #{job.retryCount}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">Data Erasure Job</p>
          </div>
        </div>
        <div className="flex gap-2">
          {job.status === "PENDING" && (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Erasure
            </button>
          )}
          {job.status === "IN_PROGRESS" && (
            <button
              onClick={() => setShowComplete(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Complete Erasure
            </button>
          )}
          {job.status === "PENDING_VERIFICATION" && (
            <button
              onClick={() => setShowApproval(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              Review & Approve
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Job Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-teal-500" />
                Erasure Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-500">METHOD</label>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{job.methodName}</p>
                    <span className="font-mono text-xs text-slate-500">({job.methodCode})</span>
                  </div>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[job.methodCategory]}`}
                  >
                    {job.methodCategory.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">ASSIGNED TO</label>
                  <p className="text-sm text-slate-900">{job.assignedTechnicianName || "Not assigned"}</p>
                  {job.assignedAt && (
                    <p className="text-xs text-slate-500">
                      Assigned {new Date(job.assignedAt).toLocaleDateString("en-GB")}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {job.toolUsed && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">TOOL</label>
                    <p className="text-sm text-slate-900">
                      {job.toolUsed}
                      {job.toolVersion && ` v${job.toolVersion}`}
                    </p>
                  </div>
                )}
                {job.procedureFollowed && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">PROCEDURE</label>
                    <p className="text-sm text-slate-900">{job.procedureFollowed}</p>
                  </div>
                )}
              </div>

              {job.erasureMethod?.complianceStandards && job.erasureMethod.complianceStandards.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-500">COMPLIANCE STANDARDS</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {job.erasureMethod.complianceStandards.map((standard) => (
                      <span
                        key={standard}
                        className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                      >
                        {standard}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Outcome */}
          {job.outcome && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {outcomeIcon}
                  Outcome: {job.outcome}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.passCount !== null && job.passCount > 0 && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">PASS COUNT</label>
                    <p className="text-sm text-slate-900">{job.passCount} passes completed</p>
                  </div>
                )}

                {job.executionNotes && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">EXECUTION NOTES</label>
                    <p className="text-sm text-slate-600">{job.executionNotes}</p>
                  </div>
                )}

                {job.failureReason && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <label className="text-xs font-medium text-red-500">FAILURE REASON</label>
                    <p className="text-sm text-red-700">{job.failureReason}</p>
                    {job.failureCategory && (
                      <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">
                        {job.failureCategory}
                      </span>
                    )}
                  </div>
                )}

                {job.verificationResult && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">VERIFICATION RESULT</label>
                    <p className="text-sm text-slate-600">{job.verificationResult}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Supervisor Approval */}
          {job.supervisorApprovedAt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  Supervisor Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {job.status === "VERIFIED" ? "Approved" : "Rejected"} by{" "}
                      {job.supervisorApprovedByName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(job.supervisorApprovedAt).toLocaleString("en-GB")}
                    </p>
                    {job.supervisorNotes && (
                      <p className="mt-2 text-sm text-slate-600">{job.supervisorNotes}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Storage Media */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Media</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/dashboard/destruction/media/${job.storageMedia.id}`}
                className="block rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono font-medium text-teal-600">{job.storageMedia.reference}</p>
                    <p className="text-sm text-slate-600">
                      {job.storageMedia.mediaType}
                      {job.storageMedia.capacity && ` • ${job.storageMedia.capacity}`}
                    </p>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {job.storageMedia.sanitisationStatus.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {job.storageMedia.serialNumber && (
                    <div>
                      <span className="text-slate-500">Serial:</span>{" "}
                      <span className="font-mono">{job.storageMedia.serialNumber}</span>
                    </div>
                  )}
                  {job.storageMedia.manufacturer && (
                    <div>
                      <span className="text-slate-500">Make:</span> {job.storageMedia.manufacturer}
                      {job.storageMedia.model && ` ${job.storageMedia.model}`}
                    </div>
                  )}
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3 text-sm">
                  <span className="text-slate-500">Parent Asset:</span>{" "}
                  <span className="font-medium">{job.storageMedia.asset.assetTag}</span>
                  {job.storageMedia.asset.customer && (
                    <span className="text-slate-500">
                      {" "}
                      ({job.storageMedia.asset.customer.name})
                    </span>
                  )}
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Evidence ({job.evidence.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {job.evidence.length === 0 ? (
                <div className="py-8 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">No evidence uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {job.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{ev.fileName}</p>
                        <p className="text-xs text-slate-500">
                          {ev.evidenceType.replace(/_/g, " ")} • Uploaded by {ev.uploadedByName}
                        </p>
                        {ev.fileHash && (
                          <p className="font-mono text-xs text-slate-400">Hash: {ev.fileHash}</p>
                        )}
                      </div>
                      <a
                        href={ev.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-teal-600 hover:text-teal-700"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-500" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                      <Clock className="h-3 w-3 text-slate-600" />
                    </div>
                    <div className="flex-1 border-l border-slate-200" />
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-slate-900">Created</p>
                    <p className="text-xs text-slate-500">
                      {new Date(job.createdAt).toLocaleString("en-GB")}
                    </p>
                    <p className="text-xs text-slate-500">by {job.createdByName}</p>
                  </div>
                </div>

                {job.startedAt && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100">
                        <Play className="h-3 w-3 text-yellow-600" />
                      </div>
                      <div className="flex-1 border-l border-slate-200" />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-slate-900">Started</p>
                      <p className="text-xs text-slate-500">
                        {new Date(job.startedAt).toLocaleString("en-GB")}
                      </p>
                    </div>
                  </div>
                )}

                {job.completedAt && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          job.outcome === "PASSED"
                            ? "bg-emerald-100"
                            : job.outcome === "FAILED"
                            ? "bg-red-100"
                            : "bg-orange-100"
                        }`}
                      >
                        {job.outcome === "PASSED" ? (
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                        ) : job.outcome === "FAILED" ? (
                          <XCircle className="h-3 w-3 text-red-600" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-orange-600" />
                        )}
                      </div>
                      {job.verifiedAt && <div className="flex-1 border-l border-slate-200" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-slate-900">Completed</p>
                      <p className="text-xs text-slate-500">
                        {new Date(job.completedAt).toLocaleString("en-GB")}
                      </p>
                      <p className="text-xs font-medium text-slate-600">Outcome: {job.outcome}</p>
                    </div>
                  </div>
                )}

                {job.verifiedAt && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                        <Shield className="h-3 w-3 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Verified</p>
                      <p className="text-xs text-slate-500">
                        {new Date(job.verifiedAt).toLocaleString("en-GB")}
                      </p>
                      {job.verifiedByName && (
                        <p className="text-xs text-slate-500">by {job.verifiedByName}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Supervisor Approval</span>
                  <span className="text-sm font-medium">
                    {job.supervisorApprovalRequired ? "Required" : "Not Required"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Evidence Files</span>
                  <span className="text-sm font-medium">{job.evidence.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Retry Count</span>
                  <span className="text-sm font-medium">{job.retryCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Previous Job Link */}
          {job.previousJobId && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Previous Job</p>
                <Link
                  href={`/dashboard/destruction/jobs/${job.previousJobId}`}
                  className="text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  View Previous Attempt
                </Link>
                {job.retryReason && (
                  <p className="mt-1 text-xs text-slate-500">Reason: {job.retryReason}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Complete Modal */}
      {showComplete && (
        <CompleteModal
          onClose={() => setShowComplete(false)}
          onSubmit={handleComplete}
          loading={actionLoading}
        />
      )}

      {/* Approval Modal */}
      {showApproval && (
        <ApprovalModal
          onClose={() => setShowApproval(false)}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={actionLoading}
          job={job}
        />
      )}
    </div>
  );
}

function CompleteModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (
    outcome: "PASSED" | "FAILED" | "INCONCLUSIVE",
    data: { executionNotes?: string; passCount?: number; failureReason?: string; verificationResult?: string }
  ) => void;
  loading: boolean;
}) {
  const [outcome, setOutcome] = useState<"PASSED" | "FAILED" | "INCONCLUSIVE">("PASSED");
  const [executionNotes, setExecutionNotes] = useState("");
  const [passCount, setPassCount] = useState<number>(1);
  const [failureReason, setFailureReason] = useState("");
  const [verificationResult, setVerificationResult] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">Complete Erasure Job</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Outcome <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {(["PASSED", "FAILED", "INCONCLUSIVE"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setOutcome(opt)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    outcome === opt
                      ? opt === "PASSED"
                        ? "bg-green-600 text-white"
                        : opt === "FAILED"
                        ? "bg-red-600 text-white"
                        : "bg-orange-600 text-white"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {outcome === "PASSED" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Pass Count</label>
              <input
                type="number"
                min={1}
                value={passCount}
                onChange={(e) => setPassCount(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}

          {outcome === "FAILED" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Failure Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                rows={2}
                placeholder="Describe why the erasure failed..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Verification Result
            </label>
            <textarea
              value={verificationResult}
              onChange={(e) => setVerificationResult(e.target.value)}
              rows={2}
              placeholder="Results of verification check..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Execution Notes</label>
            <textarea
              value={executionNotes}
              onChange={(e) => setExecutionNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSubmit(outcome, {
                executionNotes: executionNotes || undefined,
                passCount: outcome === "PASSED" ? passCount : undefined,
                failureReason: outcome === "FAILED" ? failureReason : undefined,
                verificationResult: verificationResult || undefined,
              })
            }
            disabled={loading || (outcome === "FAILED" && !failureReason)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              outcome === "PASSED"
                ? "bg-green-600 hover:bg-green-700"
                : outcome === "FAILED"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Complete Job
          </button>
        </div>
      </div>
    </div>
  );
}

function ApprovalModal({
  onClose,
  onApprove,
  onReject,
  loading,
  job,
}: {
  onClose: () => void;
  onApprove: (notes?: string) => void;
  onReject: (reason: string) => void;
  loading: boolean;
  job: ErasureJobDetail;
}) {
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">Supervisor Review</h3>
        <p className="mt-1 text-sm text-slate-500">
          Review the erasure job and evidence before approving or rejecting.
        </p>

        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Reference:</span>
              <span className="font-medium">{job.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Method:</span>
              <span className="font-medium">{job.methodName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Media:</span>
              <span className="font-medium">{job.storageMedia.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Outcome:</span>
              <span className="font-medium text-green-600">{job.outcome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Evidence:</span>
              <span className="font-medium">{job.evidence.length} files</span>
            </div>
          </div>
        </div>

        {!action && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setAction("reject")}
              className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Reject
            </button>
            <button
              onClick={() => setAction("approve")}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Approve
            </button>
          </div>
        )}

        {action === "approve" && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Approval Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any notes for the approval..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setAction(null)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={() => onApprove(notes || undefined)}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Approval
              </button>
            </div>
          </div>
        )}

        {action === "reject" && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Explain why the erasure is being rejected..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setAction(null)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={() => onReject(reason)}
                disabled={loading || !reason.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        )}

        {!action && (
          <div className="mt-4">
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

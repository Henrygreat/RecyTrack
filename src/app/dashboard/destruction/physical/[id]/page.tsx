"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Hammer,
  Clock,
  CheckCircle,
  Users,
  FileImage,
  Play,
  Shield,
  UserCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  getDestructionJobById,
  startDestructionJob,
  completeDestructionJob,
  verifyDestructionJob,
  addDestructionWitness,
  confirmWitness,
} from "../../actions";
import type { DestructionStatus, DestructionMethod } from "@prisma/client";

const statusColors: Record<DestructionStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  PENDING_VERIFICATION: "bg-purple-100 text-purple-700",
  VERIFIED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const methodLabels: Record<DestructionMethod, string> = {
  SHRED: "Shredding",
  CRUSH: "Crushing",
  DISINTEGRATE: "Disintegration",
  DEGAUSS: "Degaussing",
  INCINERATE: "Incineration",
  PUNCTURE: "Puncturing",
  MELT: "Melting",
  DISSOLVE: "Chemical Dissolution",
  OTHER: "Other Method",
};

type DestructionJobDetail = {
  id: string;
  reference: string;
  status: DestructionStatus;
  destructionMethod: DestructionMethod;
  methodDescription: string | null;
  destructionReason: string;
  reasonCategory: string | null;
  equipmentUsed: string | null;
  scheduledDate: Date | null;
  scheduledByName: string | null;
  destructionLocation: string | null;
  startedAt: Date | null;
  performedByName: string | null;
  completedAt: Date | null;
  executionNotes: string | null;
  serialNumberConfirmed: boolean;
  requiresWitness: boolean;
  witnessCount: number;
  verifiedAt: Date | null;
  verifiedByName: string | null;
  verificationNotes: string | null;
  createdAt: Date;
  storageMedia: {
    id: string;
    reference: string;
    mediaType: string;
    serialNumber: string | null;
    manufacturer: string | null;
    model: string | null;
    capacity: string | null;
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
  witnesses: Array<{
    id: string;
    witnessName: string;
    witnessRole: string | null;
    witnessEmail: string | null;
    confirmedAt: Date | null;
    witnessStatement: string | null;
  }>;
  evidence: Array<{
    id: string;
    evidenceType: string;
    fileName: string;
    fileUrl: string;
    description: string | null;
    uploadedByName: string;
    createdAt: Date;
  }>;
};

export default function DestructionJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<DestructionJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddWitness, setShowAddWitness] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const loadJob = async () => {
    setLoading(true);
    try {
      const result = await getDestructionJobById(params.id as string);
      if (result.success && result.job) {
        setJob(result.job as unknown as DestructionJobDetail);
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
      const result = await startDestructionJob(params.id as string);
      if (result.success) {
        await loadJob();
      } else {
        setError(result.error || "Failed to start job");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (executionNotes: string, serialConfirmed: boolean) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await completeDestructionJob(params.id as string, {
        executionNotes,
        serialNumberConfirmed: serialConfirmed,
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

  const handleVerify = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await verifyDestructionJob(params.id as string);
      if (result.success) {
        await loadJob();
      } else {
        setError(result.error || "Failed to verify job");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddWitness = async (name: string, role: string, email: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await addDestructionWitness(params.id as string, {
        witnessName: name,
        witnessRole: role || undefined,
        witnessEmail: email || undefined,
      });
      if (result.success) {
        setShowAddWitness(false);
        await loadJob();
      } else {
        setError(result.error || "Failed to add witness");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmWitness = async (witnessId: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await confirmWitness(witnessId, {
        witnessStatement: "I confirm that I witnessed the physical destruction of this storage media.",
      });
      if (result.success) {
        await loadJob();
      } else {
        setError(result.error || "Failed to confirm witness");
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
        <p className="mt-2 text-sm text-slate-500">{error || "The destruction job could not be found"}</p>
        <Link
          href="/dashboard/destruction/physical"
          className="mt-4 text-sm text-teal-600 hover:text-teal-700"
        >
          Back to Physical Destruction
        </Link>
      </div>
    );
  }

  const confirmedWitnesses = job.witnesses.filter((w) => w.confirmedAt).length;
  const witnessesRequired = job.requiresWitness ? job.witnessCount : 0;
  const canComplete =
    job.status === "IN_PROGRESS" &&
    (!job.requiresWitness || confirmedWitnesses >= witnessesRequired);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/destruction/physical"
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
            </div>
            <p className="text-sm text-slate-500">Physical Destruction Job</p>
          </div>
        </div>
        <div className="flex gap-2">
          {job.status === "SCHEDULED" && (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Destruction
            </button>
          )}
          {canComplete && (
            <button
              onClick={() => setShowComplete(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Hammer className="h-4 w-4" />
              Complete Destruction
            </button>
          )}
          {job.status === "PENDING_VERIFICATION" && (
            <button
              onClick={handleVerify}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Verify Destruction
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
                <Hammer className="h-5 w-5 text-red-500" />
                Destruction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-500">METHOD</label>
                  <p className="font-medium text-slate-900">{methodLabels[job.destructionMethod]}</p>
                  {job.methodDescription && (
                    <p className="text-sm text-slate-500">{job.methodDescription}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">REASON</label>
                  <p className="text-sm text-slate-900">{job.destructionReason}</p>
                  {job.reasonCategory && (
                    <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs">
                      {job.reasonCategory.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {job.equipmentUsed && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">EQUIPMENT</label>
                    <p className="text-sm text-slate-900">{job.equipmentUsed}</p>
                  </div>
                )}
                {job.destructionLocation && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">LOCATION</label>
                    <p className="text-sm text-slate-900">{job.destructionLocation}</p>
                  </div>
                )}
              </div>

              {job.executionNotes && (
                <div>
                  <label className="text-xs font-medium text-slate-500">EXECUTION NOTES</label>
                  <p className="text-sm text-slate-600">{job.executionNotes}</p>
                </div>
              )}

              {job.serialNumberConfirmed && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Serial number confirmed</span>
                </div>
              )}
            </CardContent>
          </Card>

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
                    {job.storageMedia.mediaType}
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

          {/* Witnesses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  Witnesses ({confirmedWitnesses}/{witnessesRequired})
                </CardTitle>
                {(job.status === "SCHEDULED" || job.status === "IN_PROGRESS") && (
                  <button
                    onClick={() => setShowAddWitness(true)}
                    className="text-sm font-medium text-teal-600 hover:text-teal-700"
                  >
                    + Add Witness
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {job.witnesses.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">
                    {job.requiresWitness
                      ? `${witnessesRequired} witness(es) required`
                      : "No witnesses required"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {job.witnesses.map((witness) => (
                    <div
                      key={witness.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        witness.confirmedAt
                          ? "border-green-200 bg-green-50"
                          : "border-slate-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{witness.witnessName}</p>
                          {witness.confirmedAt && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        {witness.witnessRole && (
                          <p className="text-xs text-slate-500">{witness.witnessRole}</p>
                        )}
                        {witness.confirmedAt && (
                          <p className="text-xs text-green-600">
                            Confirmed at{" "}
                            {new Date(witness.confirmedAt).toLocaleString("en-GB")}
                          </p>
                        )}
                      </div>
                      {!witness.confirmedAt && job.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleConfirmWitness(witness.id)}
                          disabled={actionLoading}
                          className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5 text-blue-500" />
                Evidence ({job.evidence.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {job.evidence.length === 0 ? (
                <div className="py-8 text-center">
                  <FileImage className="mx-auto h-8 w-8 text-slate-300" />
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
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                      <Clock className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="flex-1 border-l border-slate-200" />
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-slate-900">Scheduled</p>
                    <p className="text-xs text-slate-500">
                      {new Date(job.createdAt).toLocaleString("en-GB")}
                    </p>
                    <p className="text-xs text-slate-500">by {job.scheduledByName}</p>
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
                      {job.performedByName && (
                        <p className="text-xs text-slate-500">by {job.performedByName}</p>
                      )}
                    </div>
                  </div>
                )}

                {job.completedAt && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                        <Hammer className="h-3 w-3 text-emerald-600" />
                      </div>
                      <div className="flex-1 border-l border-slate-200" />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-slate-900">Completed</p>
                      <p className="text-xs text-slate-500">
                        {new Date(job.completedAt).toLocaleString("en-GB")}
                      </p>
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
                  <span className="text-sm text-slate-500">Witness Required</span>
                  <span className="text-sm font-medium">
                    {job.requiresWitness ? `${witnessesRequired} required` : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Witnesses Confirmed</span>
                  <span className="text-sm font-medium">{confirmedWitnesses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Evidence Files</span>
                  <span className="text-sm font-medium">{job.evidence.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Witness Modal */}
      {showAddWitness && (
        <AddWitnessModal
          onClose={() => setShowAddWitness(false)}
          onSubmit={handleAddWitness}
          loading={actionLoading}
        />
      )}

      {/* Complete Modal */}
      {showComplete && (
        <CompleteModal
          onClose={() => setShowComplete(false)}
          onSubmit={handleComplete}
          loading={actionLoading}
          serialNumber={job.storageMedia.serialNumber}
        />
      )}
    </div>
  );
}

function AddWitnessModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (name: string, role: string, email: string) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">Add Witness</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Witness name"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Operations Manager"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="witness@company.com"
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
            onClick={() => onSubmit(name, role, email)}
            disabled={loading || !name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Witness
          </button>
        </div>
      </div>
    </div>
  );
}

function CompleteModal({
  onClose,
  onSubmit,
  loading,
  serialNumber,
}: {
  onClose: () => void;
  onSubmit: (notes: string, serialConfirmed: boolean) => void;
  loading: boolean;
  serialNumber: string | null;
}) {
  const [notes, setNotes] = useState("");
  const [serialConfirmed, setSerialConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">Complete Destruction</h3>
        <p className="mt-1 text-sm text-slate-500">
          Confirm that the physical destruction has been completed successfully.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Execution Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes about the destruction process..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          {serialNumber && (
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={serialConfirmed}
                onChange={(e) => setSerialConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <div className="text-sm">
                <p className="font-medium text-slate-700">Confirm Serial Number</p>
                <p className="text-slate-500">
                  I confirm the serial number <span className="font-mono font-medium">{serialNumber}</span> was
                  verified on the destroyed media
                </p>
              </div>
            </label>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(notes, serialConfirmed)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Complete Destruction
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Download,
  Shield,
  AlertTriangle,
  QrCode,
  FileText,
  History,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  getCertificateById,
  submitCertificateForApproval,
  approveCertificate,
  rejectCertificate,
  revokeCertificate,
} from "../actions";
import type { CertificateStatus, CertificateType } from "@prisma/client";

const statusColors: Record<CertificateStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  ISSUED: "bg-green-100 text-green-700",
  REVOKED: "bg-red-100 text-red-700",
  SUPERSEDED: "bg-purple-100 text-purple-700",
};

const typeLabels: Record<CertificateType, string> = {
  DATA_ERASURE: "Certificate of Data Erasure",
  PHYSICAL_DESTRUCTION: "Certificate of Physical Data Destruction",
  BATCH: "Combined Batch Certificate",
};

type CertificateDetail = {
  id: string;
  reference: string;
  certificateNumber: string;
  verificationToken: string;
  certificateType: CertificateType;
  status: CertificateStatus;
  issueDate: Date | null;
  issuedByName: string | null;
  approvedAt: Date | null;
  approvedByName: string | null;
  approvalNotes: string | null;
  processingStartDate: Date | null;
  processingCompleteDate: Date | null;
  totalMediaCount: number;
  sanitisationSummary: string | null;
  revokedAt: Date | null;
  revokedByName: string | null;
  revocationReason: string | null;
  supersededAt: Date | null;
  notes: string | null;
  createdAt: Date;
  createdByName: string | null;
  customer: {
    id: string;
    name: string;
    reference: string;
    address: string | null;
    postcode: string | null;
  };
  items: Array<{
    id: string;
    mediaReference: string;
    mediaType: string;
    serialNumber: string | null;
    assetTag: string;
    processingType: string;
    processingMethod: string;
    processingDate: Date;
    outcomeStatus: string;
    verifiedByName: string | null;
    verifiedAt: Date | null;
    storageMedia: {
      id: string;
      asset: {
        id: string;
        assetTag: string;
        category: string;
        manufacturer: string | null;
        model: string | null;
      };
    };
  }>;
  events: Array<{
    id: string;
    eventType: string;
    eventDate: Date;
    actorName: string | null;
    notes: string | null;
  }>;
};

export default function CertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [certificate, setCertificate] = useState<CertificateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApproval, setShowApproval] = useState(false);
  const [showRevoke, setShowRevoke] = useState(false);

  const loadCertificate = async () => {
    setLoading(true);
    try {
      const result = await getCertificateById(params.id as string);
      if (result.success && result.certificate) {
        setCertificate(result.certificate as unknown as CertificateDetail);
      } else {
        setError(result.error || "Failed to load certificate");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificate();
  }, [params.id]);

  const handleSubmitForApproval = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await submitCertificateForApproval(params.id as string);
      if (result.success) {
        await loadCertificate();
      } else {
        setError(result.error || "Failed to submit");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (notes?: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await approveCertificate(params.id as string, notes);
      if (result.success) {
        setShowApproval(false);
        await loadCertificate();
      } else {
        setError(result.error || "Failed to approve");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await rejectCertificate(params.id as string, reason);
      if (result.success) {
        setShowApproval(false);
        await loadCertificate();
      } else {
        setError(result.error || "Failed to reject");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (reason: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await revokeCertificate(params.id as string, reason);
      if (result.success) {
        setShowRevoke(false);
        await loadCertificate();
      } else {
        setError(result.error || "Failed to revoke");
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

  if (!certificate) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <h3 className="mt-4 text-lg font-semibold text-slate-900">Certificate Not Found</h3>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <Link
          href="/dashboard/certificates"
          className="mt-4 text-sm text-teal-600 hover:text-teal-700"
        >
          Back to Certificates
        </Link>
      </div>
    );
  }

  const verificationUrl = `/verify/certificate/${certificate.verificationToken}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/certificates"
            className="rounded-lg p-2 hover:bg-slate-100"
            title="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{certificate.certificateNumber}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[certificate.status]}`}
              >
                {certificate.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm text-slate-500">{typeLabels[certificate.certificateType]}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {certificate.status === "DRAFT" && (
            <button
              onClick={handleSubmitForApproval}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit for Approval
            </button>
          )}
          {certificate.status === "PENDING_APPROVAL" && (
            <button
              onClick={() => setShowApproval(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              Review & Approve
            </button>
          )}
          {certificate.status === "ISSUED" && (
            <>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
              <button
                onClick={() => setShowRevoke(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                Revoke
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {certificate.status === "REVOKED" && certificate.revocationReason && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
          <div>
            <p className="font-medium text-red-700">Certificate Revoked</p>
            <p className="mt-1 text-sm text-red-600">{certificate.revocationReason}</p>
            <p className="mt-1 text-xs text-red-500">
              Revoked by {certificate.revokedByName} on{" "}
              {certificate.revokedAt && new Date(certificate.revokedAt).toLocaleString("en-GB")}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Certificate Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-teal-500" />
                Certificate Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-500">CERTIFICATE NUMBER</label>
                  <p className="font-mono font-medium text-slate-900">{certificate.certificateNumber}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">REFERENCE</label>
                  <p className="font-mono text-sm text-slate-600">{certificate.reference}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-500">CUSTOMER</label>
                  <Link
                    href={`/dashboard/customers/${certificate.customer.id}`}
                    className="block font-medium text-teal-600 hover:text-teal-700"
                  >
                    {certificate.customer.name}
                  </Link>
                  {certificate.customer.address && (
                    <p className="text-sm text-slate-500">
                      {certificate.customer.address}, {certificate.customer.postcode}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">MEDIA COUNT</label>
                  <p className="text-slate-900">{certificate.totalMediaCount} storage media</p>
                </div>
              </div>

              {certificate.sanitisationSummary && (
                <div>
                  <label className="text-xs font-medium text-slate-500">METHODS USED</label>
                  <p className="text-sm text-slate-600">{certificate.sanitisationSummary}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {certificate.processingStartDate && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">PROCESSING PERIOD</label>
                    <p className="text-sm text-slate-900">
                      {new Date(certificate.processingStartDate).toLocaleDateString("en-GB")}
                      {certificate.processingCompleteDate && certificate.processingStartDate !== certificate.processingCompleteDate && (
                        <> - {new Date(certificate.processingCompleteDate).toLocaleDateString("en-GB")}</>
                      )}
                    </p>
                  </div>
                )}
                {certificate.issueDate && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">ISSUE DATE</label>
                    <p className="text-sm text-slate-900">
                      {new Date(certificate.issueDate).toLocaleDateString("en-GB")}
                    </p>
                    {certificate.issuedByName && (
                      <p className="text-xs text-slate-500">by {certificate.issuedByName}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verification QR */}
          {certificate.status === "ISSUED" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-blue-500" />
                  Public Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
                    <QrCode className="h-12 w-12 text-slate-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">
                      Anyone can verify this certificate using the QR code or verification link.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}${verificationUrl}`}
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                      />
                      <Link
                        href={verificationUrl}
                        target="_blank"
                        className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-4 w-4 text-slate-600" />
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" />
                Certificate Items ({certificate.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="px-4 py-3">Media</th>
                      <th className="px-4 py-3">Serial</th>
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {certificate.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/destruction/media/${item.storageMedia.id}`}
                            className="font-mono text-sm text-teal-600 hover:text-teal-700"
                          >
                            {item.mediaReference}
                          </Link>
                          <div className="text-xs text-slate-500">{item.mediaType}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-slate-600">
                          {item.serialNumber || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/assets/${item.storageMedia.asset.id}`}
                            className="text-sm text-teal-600 hover:text-teal-700"
                          >
                            {item.assetTag}
                          </Link>
                          <div className="text-xs text-slate-500">
                            {item.storageMedia.asset.manufacturer} {item.storageMedia.asset.model}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {item.processingMethod}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(item.processingDate).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            {item.outcomeStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-slate-500" />
                History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {certificate.events.map((event, index) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          event.eventType === "ISSUED"
                            ? "bg-green-100"
                            : event.eventType === "REVOKED"
                            ? "bg-red-100"
                            : "bg-slate-100"
                        }`}
                      >
                        {event.eventType === "ISSUED" ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : event.eventType === "REVOKED" ? (
                          <XCircle className="h-3 w-3 text-red-600" />
                        ) : (
                          <Clock className="h-3 w-3 text-slate-600" />
                        )}
                      </div>
                      {index < certificate.events.length - 1 && (
                        <div className="flex-1 border-l border-slate-200" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-slate-900">
                        {event.eventType.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(event.eventDate).toLocaleString("en-GB")}
                      </p>
                      {event.actorName && (
                        <p className="text-xs text-slate-500">by {event.actorName}</p>
                      )}
                      {event.notes && (
                        <p className="mt-1 text-xs text-slate-600">{event.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approval Modal */}
      {showApproval && (
        <ApprovalModal
          onClose={() => setShowApproval(false)}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={actionLoading}
        />
      )}

      {/* Revoke Modal */}
      {showRevoke && (
        <RevokeModal
          onClose={() => setShowRevoke(false)}
          onRevoke={handleRevoke}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

function ApprovalModal({
  onClose,
  onApprove,
  onReject,
  loading,
}: {
  onClose: () => void;
  onApprove: (notes?: string) => void;
  onReject: (reason: string) => void;
  loading: boolean;
}) {
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">Review Certificate</h3>
        <p className="mt-1 text-sm text-slate-500">
          Review the certificate details before approving or rejecting.
        </p>

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
              Approve & Issue
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
                placeholder="Explain why the certificate is being rejected..."
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

function RevokeModal({
  onClose,
  onRevoke,
  loading,
}: {
  onClose: () => void;
  onRevoke: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">Revoke Certificate</h3>
        <p className="mt-1 text-sm text-slate-500">
          This action cannot be undone. The certificate will be marked as revoked.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Revocation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why this certificate is being revoked..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onRevoke(reason)}
            disabled={loading || !reason.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Revoke Certificate
          </button>
        </div>
      </div>
    </div>
  );
}

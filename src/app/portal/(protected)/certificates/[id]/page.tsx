"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  Calendar,
  HardDrive,
  Shield,
  ExternalLink,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getPortalCertificateDetail } from "../../actions";
import type { CertificateStatus } from "@prisma/client";

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  ISSUED: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  REVOKED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  SUPERSEDED: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
};

type CertificateDetailData = {
  id: string;
  reference: string | null;
  certificateNumber: string;
  certificateType: string;
  status: CertificateStatus;
  issueDate: Date | null;
  totalMediaCount: number;
  processingStartDate: Date | null;
  processingCompleteDate: Date | null;
  sanitisationSummary: string | null;
  verificationToken: string | null;
  issuedByName: string | null;
  revokedAt: Date | null;
  revocationReason: string | null;
  supersededAt: Date | null;
  items: Array<{
    id: string;
    mediaReference: string | null;
    mediaType: string | null;
    serialNumber: string | null;
    assetTag: string | null;
    processingType: string | null;
    processingMethod: string | null;
    processingDate: Date | null;
    outcomeStatus: string | null;
  }>;
};

export default function PortalCertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [certificate, setCertificate] = useState<CertificateDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCertificate() {
      setLoading(true);
      const result = await getPortalCertificateDetail(id);
      if (result.success && result.certificate) {
        setCertificate(result.certificate as CertificateDetailData);
      } else {
        setError(result.error || "Failed to load certificate");
      }
      setLoading(false);
    }
    loadCertificate();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Certificate Not Found
            </h3>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusStyle = statusColors[certificate.status] || statusColors.ISSUED;
  const verificationUrl = certificate.verificationToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${certificate.verificationToken}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Certificates
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100">
              <Award className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-mono">
                {certificate.certificateNumber}
              </h1>
              <p className="text-slate-500">
                {certificate.certificateType.replace(/_/g, " ")} Certificate
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {certificate.status === "ISSUED" && (
              <a
                href={`/api/certificates/${certificate.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <Card className={`${statusStyle.bg} ${statusStyle.border} border-2`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {certificate.status === "ISSUED" ? (
              <CheckCircle className={`h-6 w-6 ${statusStyle.text}`} />
            ) : certificate.status === "REVOKED" ? (
              <XCircle className={`h-6 w-6 ${statusStyle.text}`} />
            ) : (
              <Info className={`h-6 w-6 ${statusStyle.text}`} />
            )}
            <div>
              <p className={`font-semibold ${statusStyle.text}`}>
                {certificate.status === "ISSUED"
                  ? "Valid Certificate"
                  : certificate.status === "REVOKED"
                  ? "Revoked Certificate"
                  : "Superseded Certificate"}
              </p>
              {certificate.status === "REVOKED" && certificate.revokedAt && (
                <p className="text-sm text-red-600">
                  Revoked on {new Date(certificate.revokedAt).toLocaleDateString("en-GB")}
                  {certificate.revocationReason && ` - ${certificate.revocationReason}`}
                </p>
              )}
              {certificate.status === "SUPERSEDED" && certificate.supersededAt && (
                <p className="text-sm text-slate-600">
                  Superseded on {new Date(certificate.supersededAt).toLocaleDateString("en-GB")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Certificate Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-slate-500">Certificate Number</dt>
                <dd className="font-mono font-medium text-slate-900">
                  {certificate.certificateNumber}
                </dd>
              </div>
              {certificate.reference && (
                <div>
                  <dt className="text-sm text-slate-500">Reference</dt>
                  <dd className="text-slate-900">{certificate.reference}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-slate-500">Type</dt>
                <dd className="text-slate-900">
                  {certificate.certificateType.replace(/_/g, " ")}
                </dd>
              </div>
              {certificate.issueDate && (
                <div>
                  <dt className="text-sm text-slate-500">Issue Date</dt>
                  <dd className="text-slate-900">
                    {new Date(certificate.issueDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              )}
              {certificate.issuedByName && (
                <div>
                  <dt className="text-sm text-slate-500">Issued By</dt>
                  <dd className="text-slate-900">{certificate.issuedByName}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-slate-500">Total Media Items</dt>
                <dd className="text-slate-900">{certificate.totalMediaCount}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Processing Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              {certificate.processingStartDate && (
                <div>
                  <dt className="text-sm text-slate-500">Processing Started</dt>
                  <dd className="text-slate-900">
                    {new Date(certificate.processingStartDate).toLocaleDateString("en-GB")}
                  </dd>
                </div>
              )}
              {certificate.processingCompleteDate && (
                <div>
                  <dt className="text-sm text-slate-500">Processing Completed</dt>
                  <dd className="text-slate-900">
                    {new Date(certificate.processingCompleteDate).toLocaleDateString("en-GB")}
                  </dd>
                </div>
              )}
              {certificate.sanitisationSummary && (
                <div>
                  <dt className="text-sm text-slate-500">Methods Used</dt>
                  <dd className="text-slate-900">{certificate.sanitisationSummary}</dd>
                </div>
              )}
              {verificationUrl && certificate.status === "ISSUED" && (
                <div>
                  <dt className="text-sm text-slate-500">Verification Link</dt>
                  <dd>
                    <a
                      href={verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                    >
                      Verify Certificate
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Certificate Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardDrive className="h-5 w-5" />
            Media Items ({certificate.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {certificate.items.length === 0 ? (
            <div className="text-center py-8">
              <HardDrive className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No media items</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                    <th className="px-4 py-3">Media Reference</th>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Serial Number</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certificate.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-900">
                          {item.mediaReference || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-700">
                          {item.assetTag || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">
                          {item.mediaType?.replace(/_/g, " ") || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-700">
                          {item.serialNumber || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">
                          {item.processingMethod?.replace(/_/g, " ") || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-500">
                          {item.processingDate
                            ? new Date(item.processingDate).toLocaleDateString("en-GB")
                            : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.outcomeStatus ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.outcomeStatus === "SUCCESSFUL"
                                ? "bg-green-100 text-green-700"
                                : item.outcomeStatus === "FAILED"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.outcomeStatus === "SUCCESSFUL" && (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            {item.outcomeStatus === "FAILED" && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {item.outcomeStatus.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
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

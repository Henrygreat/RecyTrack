"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Building,
  Users,
  HardDrive,
  Calendar,
  Loader2,
  AlertOctagon,
} from "lucide-react";
import { verifyCertificate } from "@/app/dashboard/certificates/actions";

type VerificationResult = {
  result: string;
  certificate: {
    certificateNumber: string;
    certificateType: string;
    status: string;
    issueDate: Date | null;
    organizationName: string;
    customerName: string;
    itemCount: number;
    revokedAt: Date | null;
    revocationReason: string | null;
    supersededAt: Date | null;
  } | null;
};

export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      try {
        const response = await verifyCertificate(resolvedParams.token);
        if (response.success) {
          setResult(response as VerificationResult);
        } else {
          setError(response.error || "Verification failed");
        }
      } catch {
        setError("An error occurred during verification");
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [resolvedParams.token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mb-4">
            <Shield className="h-8 w-8 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Certificate Verification
          </h1>
          <p className="mt-2 text-slate-600">
            Verify the authenticity of a sanitisation certificate
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto" />
            <p className="mt-4 text-slate-600">Verifying certificate...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <AlertOctagon className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Verification Error
              </h2>
              <p className="mt-2 text-slate-600">{error}</p>
            </div>
          </div>
        )}

        {/* Not Found State */}
        {result?.result === "NOT_FOUND" && !loading && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <XCircle className="h-8 w-8 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Certificate Not Found
              </h2>
              <p className="mt-2 text-slate-600">
                No certificate exists with this verification code.
                Please check the URL or QR code and try again.
              </p>
            </div>
          </div>
        )}

        {/* Valid Certificate - ISSUED */}
        {result?.certificate?.status === "ISSUED" && !loading && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Status Banner */}
            <div className="bg-green-500 px-6 py-4">
              <div className="flex items-center justify-center gap-3 text-white">
                <CheckCircle className="h-6 w-6" />
                <span className="text-lg font-semibold">Valid Certificate</span>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="p-8 space-y-6">
              <div className="text-center pb-6 border-b">
                <Award className="h-12 w-12 text-teal-600 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-slate-900">
                  {result.certificate.certificateType.replace(/_/g, " ")}
                </h2>
                <p className="text-lg font-mono text-slate-600 mt-1">
                  {result.certificate.certificateNumber}
                </p>
              </div>

              <div className="grid gap-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50">
                  <Building className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Issued by</p>
                    <p className="font-medium text-slate-900">
                      {result.certificate.organizationName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50">
                  <Users className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Issued to</p>
                    <p className="font-medium text-slate-900">
                      {result.certificate.customerName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50">
                  <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Issue Date</p>
                    <p className="font-medium text-slate-900">
                      {result.certificate.issueDate
                        ? new Date(result.certificate.issueDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50">
                  <HardDrive className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Media Items</p>
                    <p className="font-medium text-slate-900">
                      {result.certificate.itemCount} item{result.certificate.itemCount !== 1 && "s"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t text-center">
                <p className="text-xs text-slate-500">
                  Verified on {new Date().toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Revoked Certificate */}
        {result?.certificate?.status === "REVOKED" && !loading && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Status Banner */}
            <div className="bg-red-500 px-6 py-4">
              <div className="flex items-center justify-center gap-3 text-white">
                <XCircle className="h-6 w-6" />
                <span className="text-lg font-semibold">Certificate Revoked</span>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="p-8 space-y-6">
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">
                      This certificate has been revoked
                    </p>
                    {result.certificate.revocationReason && (
                      <p className="mt-1 text-sm text-red-700">
                        Reason: {result.certificate.revocationReason}
                      </p>
                    )}
                    {result.certificate.revokedAt && (
                      <p className="mt-1 text-sm text-red-600">
                        Revoked on {new Date(result.certificate.revokedAt).toLocaleDateString("en-GB")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center pb-6 border-b">
                <p className="text-lg font-mono text-slate-600">
                  {result.certificate.certificateNumber}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {result.certificate.certificateType.replace(/_/g, " ")}
                </p>
              </div>

              <div className="grid gap-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50">
                  <Building className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Originally issued by</p>
                    <p className="font-medium text-slate-900">
                      {result.certificate.organizationName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50">
                  <Users className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Originally issued to</p>
                    <p className="font-medium text-slate-900">
                      {result.certificate.customerName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Superseded Certificate */}
        {result?.certificate?.status === "SUPERSEDED" && !loading && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Status Banner */}
            <div className="bg-amber-500 px-6 py-4">
              <div className="flex items-center justify-center gap-3 text-white">
                <AlertTriangle className="h-6 w-6" />
                <span className="text-lg font-semibold">Certificate Superseded</span>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="p-8 space-y-6">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex gap-3">
                  <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">
                      This certificate has been replaced by a newer version
                    </p>
                    {result.certificate.supersededAt && (
                      <p className="mt-1 text-sm text-amber-700">
                        Superseded on {new Date(result.certificate.supersededAt).toLocaleDateString("en-GB")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center pb-6 border-b">
                <p className="text-lg font-mono text-slate-600">
                  {result.certificate.certificateNumber}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {result.certificate.certificateType.replace(/_/g, " ")}
                </p>
              </div>

              <div className="grid gap-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50">
                  <Building className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Issued by</p>
                    <p className="font-medium text-slate-900">
                      {result.certificate.organizationName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending/Draft Certificate */}
        {(result?.certificate?.status === "PENDING_APPROVAL" || result?.certificate?.status === "DRAFT") && !loading && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Status Banner */}
            <div className="bg-slate-500 px-6 py-4">
              <div className="flex items-center justify-center gap-3 text-white">
                <Clock className="h-6 w-6" />
                <span className="text-lg font-semibold">Certificate Pending</span>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="p-8 space-y-6">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <div className="flex gap-3">
                  <Clock className="h-5 w-5 text-slate-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">
                      This certificate has not yet been issued
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Status: {result.certificate.status.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center pb-6 border-b">
                <p className="text-lg font-mono text-slate-600">
                  {result.certificate.certificateNumber}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-teal-600 hover:text-teal-700"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

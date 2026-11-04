import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Edit,
  CheckCircle,
  XCircle,
  Shield,
  Clock,
  User,
  FileText,
  Wrench,
} from "lucide-react";
import { requireMember, STAFF_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const categoryColors: Record<string, string> = {
  CLEAR: "bg-blue-100 text-blue-700",
  PURGE: "bg-purple-100 text-purple-700",
  CRYPTO_ERASE: "bg-indigo-100 text-indigo-700",
  BLOCK_ERASE: "bg-cyan-100 text-cyan-700",
  SECURE_ERASE: "bg-teal-100 text-teal-700",
  SANITIZE: "bg-emerald-100 text-emerald-700",
  DEGAUSS: "bg-amber-100 text-amber-700",
  OTHER: "bg-slate-100 text-slate-700",
};

const categoryDescriptions: Record<string, string> = {
  CLEAR: "Logical overwrite - protects against simple recovery",
  PURGE: "Advanced overwrite - protects against laboratory recovery",
  CRYPTO_ERASE: "Cryptographic key destruction",
  BLOCK_ERASE: "Factory block erase (SSD/NVMe)",
  SECURE_ERASE: "ATA Secure Erase command",
  SANITIZE: "NVMe Sanitize command",
  DEGAUSS: "Magnetic field erasure",
  OTHER: "Other approved method",
};

export default async function ErasureMethodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);
  const { id } = await params;

  const method = await prisma.erasureMethod.findFirst({
    where: { id, organizationId },
    include: {
      _count: {
        select: { erasureJobs: true },
      },
    },
  });

  if (!method) {
    notFound();
  }

  return (
    <>
      <Link
        href="/dashboard/destruction/methods"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Erasure Methods
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{method.name}</h1>
            <span className="font-mono text-sm text-slate-500">({method.code})</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[method.category]}`}
            >
              {method.category.replace("_", " ")}
            </span>
            {!method.isActive && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {categoryDescriptions[method.category]}
          </p>
        </div>
        <Link
          href={`/dashboard/destruction/methods/${method.id}/edit`}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          <Edit className="h-4 w-4" />
          Edit Method
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          {method.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-400" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{method.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Supported Media Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-400" />
                Supported Media Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {method.supportedMediaTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tool/Procedure Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-slate-400" />
                Tool/Procedure Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                {method.toolName && (
                  <div>
                    <dt className="text-sm text-slate-500">Tool/Software</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {method.toolName}
                      {method.toolVersion && ` v${method.toolVersion}`}
                    </dd>
                  </div>
                )}
                {method.procedureRef && (
                  <div>
                    <dt className="text-sm text-slate-500">Procedure Reference</dt>
                    <dd className="mt-1 font-medium text-slate-900">{method.procedureRef}</dd>
                  </div>
                )}
                {!method.toolName && !method.procedureRef && (
                  <p className="col-span-2 text-sm text-slate-500">No tool or procedure details specified</p>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Compliance Standards */}
          {method.complianceStandards.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Compliance Standards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {method.complianceStandards.map((standard) => (
                    <span
                      key={standard}
                      className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
                    >
                      {standard}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Verification Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {method.requiresVerification ? (
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-slate-400" />
                )}
                <span className={method.requiresVerification ? "text-teal-700" : "text-slate-500"}>
                  {method.requiresVerification
                    ? "Supervisor verification required"
                    : "No supervisor verification required"}
                </span>
              </div>

              {method.verificationMethod && (
                <div>
                  <dt className="text-sm text-slate-500">Verification Method</dt>
                  <dd className="mt-1 text-slate-700">{method.verificationMethod}</dd>
                </div>
              )}

              {method.verificationCriteria && (
                <div>
                  <dt className="text-sm text-slate-500">Verification Criteria</dt>
                  <dd className="mt-1 text-slate-700">{method.verificationCriteria}</dd>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evidence Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Evidence Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {method.requiresEvidence ? (
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-slate-400" />
                )}
                <span className={method.requiresEvidence ? "text-teal-700" : "text-slate-500"}>
                  {method.requiresEvidence
                    ? "Evidence required for job completion"
                    : "No evidence required"}
                </span>
              </div>

              {method.requiresEvidence && method.requiredEvidenceTypes.length > 0 && (
                <div>
                  <dt className="text-sm text-slate-500">Required Evidence Types</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {method.requiredEvidenceTypes.map((type) => (
                      <span
                        key={type}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                      >
                        {type.replace("_", " ")}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Active</span>
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${
                    method.isActive ? "text-teal-600" : "text-slate-500"
                  }`}
                >
                  {method.isActive ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Yes
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      No
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Sort Order</span>
                <span className="text-sm font-medium text-slate-700">{method.sortOrder}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Jobs Using This Method</span>
                <span className="text-sm font-medium text-slate-700">
                  {method._count.erasureJobs}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Audit Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" />
                Audit Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Created</span>
                <p className="font-medium text-slate-700">
                  {new Date(method.createdAt).toLocaleString()}
                </p>
              </div>

              {method.createdByName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-700">{method.createdByName}</span>
                </div>
              )}

              <div>
                <span className="text-slate-500">Last Updated</span>
                <p className="font-medium text-slate-700">
                  {new Date(method.updatedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Warning about editing */}
          {method._count.erasureJobs > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> This method has been used in {method._count.erasureJobs}{" "}
                  erasure job(s). Changes to this method will not affect historical job records,
                  which preserve a snapshot of the method configuration.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

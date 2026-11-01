import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ClipboardCheck,
  Package,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileEdit,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { requireMember, MANAGEMENT_ROLES, STAFF_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { revalidatePath } from "next/cache";
import type { InspectionStatus, ConditionGrade } from "@prisma/client";

const statusColors: Record<InspectionStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const statusIcons: Record<InspectionStatus, typeof Clock> = {
  DRAFT: FileEdit,
  SUBMITTED: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
};

const gradeColors: Record<ConditionGrade, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-emerald-100 text-emerald-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  F: "bg-red-200 text-red-900",
};

// Server actions
async function submitInspection(formData: FormData) {
  "use server";
  const inspectionId = formData.get("inspectionId") as string;
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  await prisma.inspection.update({
    where: { id: inspectionId, organizationId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  revalidatePath(`/dashboard/inspections/${inspectionId}`);
  revalidatePath("/dashboard/inspections");
}

async function approveInspection(formData: FormData) {
  "use server";
  const inspectionId = formData.get("inspectionId") as string;
  const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const inspection = await prisma.inspection.findFirst({
    where: { id: inspectionId, organizationId },
  });

  if (!inspection) return;

  await prisma.$transaction([
    prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedByUserId: userId,
        reviewedByName: user?.name || user?.email || "Unknown",
      },
    }),
    // Update asset condition grade if set
    ...(inspection.conditionGrade
      ? [
          prisma.asset.update({
            where: { id: inspection.assetId },
            data: {
              conditionGrade: inspection.conditionGrade,
              conditionGradeNotes: inspection.gradeRationale,
              conditionGradedBy: user?.name || user?.email,
              conditionGradedAt: new Date(),
              inspectedAt: new Date(),
            },
          }),
        ]
      : []),
  ]);

  revalidatePath(`/dashboard/inspections/${inspectionId}`);
  revalidatePath("/dashboard/inspections");
}

async function rejectInspection(formData: FormData) {
  "use server";
  const inspectionId = formData.get("inspectionId") as string;
  const reason = formData.get("reason") as string;
  const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  await prisma.inspection.update({
    where: { id: inspectionId, organizationId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedByUserId: userId,
      reviewedByName: user?.name || user?.email || "Unknown",
      rejectionReason: reason || "No reason provided",
    },
  });

  revalidatePath(`/dashboard/inspections/${inspectionId}`);
  revalidatePath("/dashboard/inspections");
}

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizationId, membership } = await requireMember(undefined, STAFF_ROLES);
  const { id } = await params;

  const inspection = await prisma.inspection.findFirst({
    where: { id, organizationId },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          category: true,
          manufacturer: true,
          model: true,
          serialNumber: true,
          physicalCondition: true,
          functionalCondition: true,
        },
      },
      template: {
        select: {
          id: true,
          name: true,
          version: true,
        },
      },
    },
  });

  if (!inspection) {
    notFound();
  }

  const canManage = MANAGEMENT_ROLES.includes(membership.role);
  const StatusIcon = statusIcons[inspection.status];

  return (
    <>
      {/* Back Link */}
      <Link
        href="/dashboard/inspections"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          color: "#64748b",
          fontSize: "0.875rem",
          marginBottom: "1rem",
          textDecoration: "none",
        }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Inspections
      </Link>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                color: "#0f172a",
                margin: 0,
                fontFamily: "monospace",
              }}
            >
              {inspection.reference}
            </h1>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[inspection.status]}`}
            >
              <StatusIcon className="w-3 h-3" />
              {inspection.status}
            </span>
          </div>
          <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
            Inspection for asset {inspection.asset.assetTag}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {inspection.status === "DRAFT" && (
            <form action={submitInspection}>
              <input type="hidden" name="inspectionId" value={inspection.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Clock className="w-4 h-4" />
                Submit for Review
              </button>
            </form>
          )}
          {inspection.status === "SUBMITTED" && canManage && (
            <>
              <form action={approveInspection}>
                <input type="hidden" name="inspectionId" value={inspection.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              </form>
              <form action={rejectInspection}>
                <input type="hidden" name="inspectionId" value={inspection.id} />
                <input type="hidden" name="reason" value="Requires revision" />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Condition Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="w-4 h-4 text-teal-600" />
                Condition Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Overall Grade</dt>
                  <dd className="mt-1">
                    {inspection.conditionGrade ? (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-lg font-bold ${gradeColors[inspection.conditionGrade]}`}
                      >
                        Grade {inspection.conditionGrade}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not graded</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Template</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {inspection.template
                      ? `${inspection.template.name} (v${inspection.template.version})`
                      : "No template"}
                  </dd>
                </div>
              </dl>
              {inspection.gradeRationale && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">{inspection.gradeRationale}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Findings */}
          {inspection.findings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Inspection Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{inspection.findings}</p>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {inspection.recommendedAction && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-4 h-4 text-teal-600" />
                  Recommended Action
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {inspection.recommendedAction}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Rejection Reason */}
          {inspection.status === "REJECTED" && inspection.rejectionReason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-red-800">
                  <XCircle className="w-4 h-4" />
                  Rejection Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-700">{inspection.rejectionReason}</p>
                <p className="text-xs text-red-500 mt-2">
                  Rejected by {inspection.reviewedByName} on{" "}
                  {inspection.reviewedAt?.toLocaleDateString("en-GB")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Review Notes */}
          {inspection.reviewNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Review Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {inspection.reviewNotes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Asset Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-4 h-4 text-teal-600" />
                Asset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Asset Tag</dt>
                  <dd className="mt-1">
                    <Link
                      href={`/dashboard/assets/${inspection.asset.id}`}
                      className="text-sm font-mono text-teal-600 hover:text-teal-700"
                    >
                      {inspection.asset.assetTag}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Category</dt>
                  <dd className="mt-1 text-sm text-slate-900">{inspection.asset.category}</dd>
                </div>
                {inspection.asset.manufacturer && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Manufacturer</dt>
                    <dd className="mt-1 text-sm text-slate-900">{inspection.asset.manufacturer}</dd>
                  </div>
                )}
                {inspection.asset.model && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Model</dt>
                    <dd className="mt-1 text-sm text-slate-900">{inspection.asset.model}</dd>
                  </div>
                )}
                {inspection.asset.serialNumber && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Serial</dt>
                    <dd className="mt-1 text-sm font-mono text-slate-900">
                      {inspection.asset.serialNumber}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Inspector Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4 text-teal-600" />
                Inspector
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Inspected By</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {inspection.inspectorName || "Not assigned"}
                  </dd>
                </div>
                {inspection.inspectionDate && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Date</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {inspection.inspectionDate.toLocaleDateString("en-GB")}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-teal-600" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Created</dt>
                  <dd className="text-slate-900">
                    {inspection.createdAt.toLocaleDateString("en-GB")}
                  </dd>
                </div>
                {inspection.submittedAt && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Submitted</dt>
                    <dd className="text-slate-900">
                      {inspection.submittedAt.toLocaleDateString("en-GB")}
                    </dd>
                  </div>
                )}
                {inspection.reviewedAt && inspection.status === "APPROVED" && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Approved</dt>
                    <dd className="text-slate-900">
                      {inspection.reviewedAt.toLocaleDateString("en-GB")}
                    </dd>
                  </div>
                )}
                {inspection.reviewedAt && inspection.status === "REJECTED" && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Rejected</dt>
                    <dd className="text-slate-900">
                      {inspection.reviewedAt.toLocaleDateString("en-GB")}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

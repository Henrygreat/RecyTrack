import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  HardDrive,
  Package,
  MapPin,
  AlertCircle,
  CheckCircle,
  Clock,
  Eraser,
  Hammer,
  FileText,
  Edit,
  Plus,
} from "lucide-react";
import { requireMember, STAFF_ROLES, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

export default async function StorageMediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizationId, membership } = await requireMember(undefined, STAFF_ROLES);
  const { id } = await params;

  const media = await prisma.storageMedia.findFirst({
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
          status: true,
          customer: {
            select: { id: true, name: true, reference: true },
          },
        },
      },
      warehouseLocation: {
        select: { id: true, code: true, name: true },
      },
      erasureJobs: {
        include: {
          erasureMethod: {
            select: { id: true, name: true, code: true },
          },
          evidence: {
            select: { id: true, evidenceType: true, fileName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      destructionJob: {
        include: {
          witnesses: true,
          evidence: {
            select: { id: true, evidenceType: true, fileName: true },
          },
        },
      },
    },
  });

  if (!media) {
    notFound();
  }

  const _canManage = MANAGEMENT_ROLES.includes(membership.role);

  // Determine available actions based on status
  const canStartErasure =
    media.sanitisationStatus === "NOT_STARTED" ||
    media.sanitisationStatus === "ERASURE_FAILED";
  const canScheduleDestruction =
    media.sanitisationStatus === "ERASURE_FAILED" ||
    media.sanitisationStatus === "NOT_STARTED";
  const _isComplete =
    media.sanitisationStatus === "VERIFIED" || media.sanitisationStatus === "DESTROYED";

  return (
    <>
      {/* Back Link */}
      <Link
        href="/dashboard/destruction/media"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Media Register
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-slate-900">{media.reference}</h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[media.sanitisationStatus]}`}
            >
              {media.sanitisationStatus === "VERIFIED" && <CheckCircle className="h-3 w-3" />}
              {media.sanitisationStatus === "ERASURE_IN_PROGRESS" && (
                <Clock className="h-3 w-3" />
              )}
              {media.sanitisationStatus.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {media.mediaType} {media.capacity && `- ${media.capacity}`}
          </p>
        </div>

        <div className="flex gap-2">
          {canStartErasure && (
            <Link
              href={`/dashboard/destruction/jobs/new?mediaId=${media.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Eraser className="h-4 w-4" />
              Start Erasure
            </Link>
          )}
          {canScheduleDestruction && (
            <Link
              href={`/dashboard/destruction/physical/new?mediaId=${media.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <Hammer className="h-4 w-4" />
              Schedule Destruction
            </Link>
          )}
          <Link
            href={`/dashboard/destruction/media/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Media Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HardDrive className="h-4 w-4 text-teal-600" />
                Media Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Type</dt>
                  <dd className="mt-1 text-sm text-slate-900">{media.mediaType}</dd>
                </div>
                {media.manufacturer && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Manufacturer</dt>
                    <dd className="mt-1 text-sm text-slate-900">{media.manufacturer}</dd>
                  </div>
                )}
                {media.model && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Model</dt>
                    <dd className="mt-1 text-sm text-slate-900">{media.model}</dd>
                  </div>
                )}
                {media.serialNumber && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Serial Number</dt>
                    <dd className="mt-1 font-mono text-sm text-slate-900">{media.serialNumber}</dd>
                  </div>
                )}
                {media.capacity && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Capacity</dt>
                    <dd className="mt-1 text-sm text-slate-900">{media.capacity}</dd>
                  </div>
                )}
                {media.interface && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Interface</dt>
                    <dd className="mt-1 text-sm text-slate-900">{media.interface}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Data Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-4 w-4 text-teal-600" />
                Data Classification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full ${media.isDataBearing ? "bg-yellow-400" : "bg-green-400"}`}
                  />
                  <span className="text-sm text-slate-700">
                    {media.isDataBearing ? "Data-bearing media" : "Not data-bearing"}
                  </span>
                </div>
                {media.containsSensitiveData && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">
                      Contains sensitive/confidential data
                    </span>
                  </div>
                )}
                {media.dataClassification && (
                  <div className="mt-2">
                    <span className="text-xs font-medium uppercase text-slate-500">
                      Classification Level
                    </span>
                    <p className="mt-1 text-sm text-slate-900">{media.dataClassification}</p>
                  </div>
                )}
                {media.isRemovable && (
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-blue-400" />
                    <span className="text-sm text-slate-700">Removable media</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Erasure Jobs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eraser className="h-4 w-4 text-teal-600" />
                Erasure Jobs
              </CardTitle>
              {canStartErasure && (
                <Link
                  href={`/dashboard/destruction/jobs/new?mediaId=${media.id}`}
                  className="text-sm text-teal-600 hover:text-teal-700"
                >
                  <Plus className="h-4 w-4" />
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {media.erasureJobs.length === 0 ? (
                <div className="py-8 text-center">
                  <Eraser className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">No erasure jobs recorded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {media.erasureJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/dashboard/destruction/jobs/${job.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{job.reference}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${jobStatusColors[job.status]}`}
                          >
                            {job.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {job.methodName} - {job.assignedTechnicianName || "Unassigned"}
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        {job.evidence.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {job.evidence.length} files
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Destruction Job */}
          {media.destructionJob && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Hammer className="h-4 w-4 text-teal-600" />
                  Physical Destruction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/dashboard/destruction/physical/${media.destructionJob.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {media.destructionJob.reference}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${destructionStatusColors[media.destructionJob.status]}`}
                      >
                        {media.destructionJob.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {media.destructionJob.destructionMethod} - {media.destructionJob.witnesses.length} witness(es)
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {media.destructionJob.evidence.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {media.destructionJob.evidence.length} files
                      </span>
                    )}
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Parent Asset */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-teal-600" />
                Parent Asset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Asset Tag</dt>
                  <dd className="mt-1">
                    <Link
                      href={`/dashboard/assets/${media.asset.id}`}
                      className="font-mono text-sm text-teal-600 hover:text-teal-700"
                    >
                      {media.asset.assetTag}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Category</dt>
                  <dd className="mt-1 text-sm text-slate-900">{media.asset.category}</dd>
                </div>
                {media.asset.manufacturer && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Manufacturer</dt>
                    <dd className="mt-1 text-sm text-slate-900">{media.asset.manufacturer}</dd>
                  </div>
                )}
                {media.asset.model && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Model</dt>
                    <dd className="mt-1 text-sm text-slate-900">{media.asset.model}</dd>
                  </div>
                )}
                {media.asset.customer && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Customer</dt>
                    <dd className="mt-1 text-sm text-slate-900">{media.asset.customer.name}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-teal-600" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {media.warehouseLocation ? (
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">
                      Warehouse Location
                    </dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {media.warehouseLocation.code} - {media.warehouseLocation.name}
                    </dd>
                  </div>
                  {media.binLocation && (
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-500">
                        Bin/Shelf
                      </dt>
                      <dd className="mt-1 text-sm text-slate-900">{media.binLocation}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-slate-500">No location assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Verification Status */}
          {media.verifiedAt && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Verified</span>
                </div>
                <p className="mt-2 text-sm text-green-700">
                  By {media.verifiedByName} on{" "}
                  {media.verifiedAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {media.verificationNotes && (
                  <p className="mt-1 text-xs text-green-600">{media.verificationNotes}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {media.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{media.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Audit Info */}
          <Card>
            <CardContent className="p-4">
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Created</dt>
                  <dd className="text-slate-700">
                    {media.createdAt.toLocaleDateString("en-GB")}
                  </dd>
                </div>
                {media.createdByName && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Created by</dt>
                    <dd className="text-slate-700">{media.createdByName}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-500">Updated</dt>
                  <dd className="text-slate-700">
                    {media.updatedAt.toLocaleDateString("en-GB")}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

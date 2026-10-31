import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Package,
  Building,
  MapPin,
  Calendar,
  User,
  HardDrive,
  Warehouse,
  DollarSign,
  QrCode,
  Edit,
  History,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ASSET_STATUS_LABELS,
  ASSET_CATEGORY_LABELS,
  PHYSICAL_CONDITION_LABELS,
  FUNCTIONAL_CONDITION_LABELS,
  DATA_BEARING_STATUS_LABELS,
  DISPOSITION_OUTCOME_LABELS,
  getAvailableAssetTransitions,
  isDataBearing,
} from "@/lib/assets";
import { updateAssetStatus } from "../actions";
import type { AssetStatus } from "@prisma/client";

// Status badge styling
const statusColors: Record<AssetStatus, string> = {
  EXPECTED: "bg-slate-100 text-slate-700",
  COLLECTED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-indigo-100 text-indigo-700",
  INSPECTION: "bg-purple-100 text-purple-700",
  QUARANTINED: "bg-red-100 text-red-700",
  DATA_ERASURE: "bg-orange-100 text-orange-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  READY: "bg-emerald-100 text-emerald-700",
  LISTED: "bg-teal-100 text-teal-700",
  SOLD: "bg-green-100 text-green-700",
  RECYCLED: "bg-cyan-100 text-cyan-700",
  DESTROYED: "bg-red-100 text-red-700",
  RETURNED: "bg-amber-100 text-amber-700",
  RELEASED: "bg-gray-100 text-gray-700",
};

// Server action for status update button
async function handleStatusUpdate(formData: FormData) {
  "use server";
  const assetId = formData.get("assetId") as string;
  const newStatus = formData.get("newStatus") as AssetStatus;
  await updateAssetStatus(assetId, newStatus);
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizationId, membership } = await requireMember();
  const { id } = await params;

  const asset = await prisma.asset.findFirst({
    where: { id, organizationId },
    include: {
      customer: { select: { id: true, name: true, reference: true } },
      site: { select: { id: true, name: true, reference: true, address: true } },
      collection: { select: { id: true, reference: true, status: true } },
      warehouseLocation: { select: { id: true, name: true, code: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!asset) {
    notFound();
  }

  const canManage = MANAGEMENT_ROLES.includes(membership.role);
  const availableTransitions = getAvailableAssetTransitions(asset.status);
  const showDataSection = isDataBearing(asset.category);

  return (
    <>
      {/* Back Link */}
      <Link
        href="/dashboard/assets"
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
        Back to Assets
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
              {asset.assetTag}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[asset.status]}`}
            >
              {ASSET_STATUS_LABELS[asset.status]}
            </span>
          </div>
          <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
            {ASSET_CATEGORY_LABELS[asset.category]}
            {asset.manufacturer && ` • ${asset.manufacturer}`}
            {asset.model && ` ${asset.model}`}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {canManage && (
            <Link
              href={`/dashboard/assets/${asset.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            Print QR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Equipment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-4 h-4 text-teal-600" />
                Equipment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Category</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {ASSET_CATEGORY_LABELS[asset.category]}
                    {asset.categoryOther && ` (${asset.categoryOther})`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Serial Number</dt>
                  <dd className="mt-1 text-sm text-slate-900 font-mono">
                    {asset.serialNumber || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Manufacturer</dt>
                  <dd className="mt-1 text-sm text-slate-900">{asset.manufacturer || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Model</dt>
                  <dd className="mt-1 text-sm text-slate-900">{asset.model || "—"}</dd>
                </div>
                {asset.customerAssetTag && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Customer Tag</dt>
                    <dd className="mt-1 text-sm text-slate-900 font-mono">
                      {asset.customerAssetTag}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Condition Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-4 h-4 text-teal-600" />
                Condition Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Physical</dt>
                  <dd className="mt-1">
                    <Badge
                      variant={
                        ["EXCELLENT", "GOOD"].includes(asset.physicalCondition)
                          ? "success"
                          : ["DAMAGED", "FOR_PARTS"].includes(asset.physicalCondition)
                          ? "error"
                          : "secondary"
                      }
                    >
                      {PHYSICAL_CONDITION_LABELS[asset.physicalCondition]}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Functional</dt>
                  <dd className="mt-1">
                    <Badge
                      variant={
                        asset.functionalCondition === "WORKING"
                          ? "success"
                          : asset.functionalCondition === "NOT_WORKING"
                          ? "error"
                          : "secondary"
                      }
                    >
                      {FUNCTIONAL_CONDITION_LABELS[asset.functionalCondition]}
                    </Badge>
                  </dd>
                </div>
              </dl>
              {asset.conditionNotes && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">{asset.conditionNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Handling - Only for data-bearing devices */}
          {showDataSection && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HardDrive className="w-4 h-4 text-teal-600" />
                  Data Handling
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Data Status</dt>
                    <dd className="mt-1">
                      <Badge
                        variant={
                          ["WIPED_CERTIFIED", "PHYSICALLY_DESTROYED"].includes(
                            asset.dataBearingStatus
                          )
                            ? "success"
                            : asset.dataBearingStatus === "DATA_PRESENT"
                            ? "error"
                            : "secondary"
                        }
                      >
                        {DATA_BEARING_STATUS_LABELS[asset.dataBearingStatus]}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Storage Type</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {asset.storageType || "Unknown"}
                    </dd>
                  </div>
                  {asset.storageCapacity && (
                    <div>
                      <dt className="text-xs font-medium text-slate-500 uppercase">Capacity</dt>
                      <dd className="mt-1 text-sm text-slate-900">{asset.storageCapacity}</dd>
                    </div>
                  )}
                  {asset.dataWipeMethod && (
                    <>
                      <div>
                        <dt className="text-xs font-medium text-slate-500 uppercase">
                          Wipe Method
                        </dt>
                        <dd className="mt-1 text-sm text-slate-900">{asset.dataWipeMethod}</dd>
                      </div>
                      {asset.dataWipeDate && (
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase">
                            Wipe Date
                          </dt>
                          <dd className="mt-1 text-sm text-slate-900">
                            {asset.dataWipeDate.toLocaleDateString("en-GB")}
                          </dd>
                        </div>
                      )}
                      {asset.dataWipeCertificate && (
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase">
                            Certificate #
                          </dt>
                          <dd className="mt-1 text-sm text-slate-900 font-mono">
                            {asset.dataWipeCertificate}
                          </dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4 text-teal-600" />
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {asset.statusHistory.length === 0 ? (
                <p className="text-sm text-slate-500">No status changes recorded.</p>
              ) : (
                <div className="space-y-3">
                  {asset.statusHistory.map((change) => (
                    <div
                      key={change.id}
                      className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {change.fromStatus ? (
                          <Clock className="w-4 h-4 text-slate-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900">
                          {change.fromStatus ? (
                            <>
                              Changed from{" "}
                              <span className="font-medium">
                                {ASSET_STATUS_LABELS[change.fromStatus]}
                              </span>{" "}
                              to{" "}
                              <span className="font-medium">
                                {ASSET_STATUS_LABELS[change.toStatus]}
                              </span>
                            </>
                          ) : (
                            <>
                              Asset registered as{" "}
                              <span className="font-medium">
                                {ASSET_STATUS_LABELS[change.toStatus]}
                              </span>
                            </>
                          )}
                        </p>
                        {change.notes && (
                          <p className="text-sm text-slate-500 mt-1">{change.notes}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {change.changedByName || "System"} •{" "}
                          {change.createdAt.toLocaleString("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {asset.notes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {asset.notes.map((note) => (
                    <div key={note.id} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-900">{note.content}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {note.createdByName || "Unknown"} •{" "}
                        {note.createdAt.toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          {canManage && availableTransitions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Update Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableTransitions.map((newStatus) => (
                    <form key={newStatus} action={handleStatusUpdate}>
                      <input type="hidden" name="assetId" value={asset.id} />
                      <input type="hidden" name="newStatus" value={newStatus} />
                      <button
                        type="submit"
                        className="w-full px-4 py-2 text-sm font-medium text-left bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-teal-500 transition-colors"
                      >
                        Move to {ASSET_STATUS_LABELS[newStatus]}
                      </button>
                    </form>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer & Source */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building className="w-4 h-4 text-teal-600" />
                Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Customer</dt>
                  <dd className="mt-1">
                    {asset.customer ? (
                      <Link
                        href={`/dashboard/customers/${asset.customer.id}`}
                        className="text-sm text-teal-600 hover:text-teal-700"
                      >
                        {asset.customer.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-400">Not assigned</span>
                    )}
                  </dd>
                </div>
                {asset.site && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Site</dt>
                    <dd className="mt-1 text-sm text-slate-900">{asset.site.name}</dd>
                  </div>
                )}
                {asset.collection && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Collection</dt>
                    <dd className="mt-1">
                      <Link
                        href={`/dashboard/collections/${asset.collection.id}`}
                        className="text-sm font-mono text-teal-600 hover:text-teal-700"
                      >
                        {asset.collection.reference}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Warehouse className="w-4 h-4 text-teal-600" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Warehouse</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {asset.warehouseLocation
                      ? `${asset.warehouseLocation.name} (${asset.warehouseLocation.code})`
                      : "Not assigned"}
                  </dd>
                </div>
                {asset.binLocation && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Bin / Shelf</dt>
                    <dd className="mt-1 text-sm text-slate-900">{asset.binLocation}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Valuation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="w-4 h-4 text-teal-600" />
                Valuation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Estimated Value</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {asset.estimatedValue
                      ? `£${Number(asset.estimatedValue).toFixed(2)}`
                      : "Not valued"}
                  </dd>
                </div>
                {asset.actualSalePrice && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Sale Price</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      £{Number(asset.actualSalePrice).toFixed(2)}
                    </dd>
                  </div>
                )}
                {asset.weight && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Weight</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {Number(asset.weight).toFixed(2)} kg
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Disposition</dt>
                  <dd className="mt-1">
                    <Badge variant="secondary">
                      {DISPOSITION_OUTCOME_LABELS[asset.dispositionOutcome]}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Timestamps */}
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
                    {asset.createdAt.toLocaleDateString("en-GB")}
                  </dd>
                </div>
                {asset.collectedAt && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Collected</dt>
                    <dd className="text-slate-900">
                      {asset.collectedAt.toLocaleDateString("en-GB")}
                    </dd>
                  </div>
                )}
                {asset.receivedAt && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Received</dt>
                    <dd className="text-slate-900">
                      {asset.receivedAt.toLocaleDateString("en-GB")}
                    </dd>
                  </div>
                )}
                {asset.inspectedAt && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Inspected</dt>
                    <dd className="text-slate-900">
                      {asset.inspectedAt.toLocaleDateString("en-GB")}
                    </dd>
                  </div>
                )}
                {asset.processedAt && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Processed</dt>
                    <dd className="text-slate-900">
                      {asset.processedAt.toLocaleDateString("en-GB")}
                    </dd>
                  </div>
                )}
                {asset.releasedAt && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Released</dt>
                    <dd className="text-slate-900">
                      {asset.releasedAt.toLocaleDateString("en-GB")}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          {asset.internalNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Internal Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{asset.internalNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  ArrowLeft,
  Loader2,
  MapPin,
  Calendar,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Award,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getPortalCollectionDetail, cancelPortalCollection } from "../../actions";
import type { CollectionStatus, AssetStatus, MediaSanitisationStatus } from "@prisma/client";

// Customer-visible status labels (friendly names)
const statusLabels: Record<CollectionStatus, string> = {
  DRAFT: "Draft",
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  ASSIGNED: "Assigned",
  IN_TRANSIT: "In Transit",
  COLLECTED: "Collected",
  RECEIVED: "At Facility",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXCEPTION: "Exception",
};

const statusColors: Record<CollectionStatus, { bg: string; text: string }> = {
  DRAFT: { bg: "bg-slate-100", text: "text-slate-700" },
  REQUESTED: { bg: "bg-amber-100", text: "text-amber-700" },
  CONFIRMED: { bg: "bg-blue-100", text: "text-blue-700" },
  APPROVED: { bg: "bg-blue-100", text: "text-blue-700" },
  SCHEDULED: { bg: "bg-indigo-100", text: "text-indigo-700" },
  ASSIGNED: { bg: "bg-indigo-100", text: "text-indigo-700" },
  IN_TRANSIT: { bg: "bg-teal-100", text: "text-teal-700" },
  COLLECTED: { bg: "bg-emerald-100", text: "text-emerald-700" },
  RECEIVED: { bg: "bg-green-100", text: "text-green-700" },
  COMPLETED: { bg: "bg-green-100", text: "text-green-700" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700" },
  EXCEPTION: { bg: "bg-red-100", text: "text-red-700" },
};

// Timeline steps for customer view
const timelineSteps: CollectionStatus[] = [
  "REQUESTED",
  "APPROVED",
  "SCHEDULED",
  "IN_TRANSIT",
  "COLLECTED",
  "RECEIVED",
  "COMPLETED",
];

type CollectionDetailData = {
  id: string;
  reference: string;
  status: CollectionStatus;
  bookingMode: string;
  collectionType: string;
  address: string;
  postcode: string;
  requestedDate: Date | null;
  scheduledDate: Date | null;
  collectedAt: Date | null;
  receivedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  itemEstimate: number;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  equipmentCategories: string[];
  customerInstructions: string | null;
  createdAt: Date;
  site: { id: string; name: string; reference: string } | null;
  assets: Array<{
    id: string;
    assetTag: string;
    customerAssetTag: string | null;
    category: string;
    manufacturer: string | null;
    model: string | null;
    status: AssetStatus;
    storageMedia: Array<{
      id: string;
      sanitisationStatus: MediaSanitisationStatus;
    }>;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: CollectionStatus | null;
    toStatus: CollectionStatus;
    createdAt: Date;
  }>;
  totalAssetCount: number;
  certificates: Array<{
    id: string;
    certificateNumber: string;
    certificateType: string;
    issueDate: Date | null;
    totalMediaCount: number;
  }>;
};

export default function PortalCollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [collection, setCollection] = useState<CollectionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    async function loadCollection() {
      setLoading(true);
      const result = await getPortalCollectionDetail(id);
      if (result.success && result.collection) {
        setCollection(result.collection as CollectionDetailData);
      } else {
        setError(result.error || "Failed to load collection");
      }
      setLoading(false);
    }
    loadCollection();
  }, [id]);

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    const result = await cancelPortalCollection(id, cancelReason);
    if (result.success) {
      // Reload collection to show updated status
      const refreshed = await getPortalCollectionDetail(id);
      if (refreshed.success && refreshed.collection) {
        setCollection(refreshed.collection as CollectionDetailData);
      }
      setShowCancelModal(false);
    } else {
      alert(result.error || "Failed to cancel collection");
    }
    setCancelling(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !collection) {
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
            <Truck className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Collection Not Found
            </h3>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const colors = statusColors[collection.status];
  const canCancel = ["REQUESTED", "APPROVED", "SCHEDULED"].includes(collection.status);
  const currentStepIndex = timelineSteps.indexOf(collection.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/portal/collections"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Collections
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-100">
              <Truck className="h-7 w-7 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-mono">
                {collection.reference}
              </h1>
              <p className="text-slate-500">
                {collection.site?.name || collection.address}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${colors.bg} ${colors.text}`}
            >
              {collection.status === "CANCELLED" && <XCircle className="h-4 w-4" />}
              {collection.status === "COMPLETED" && <CheckCircle className="h-4 w-4" />}
              {statusLabels[collection.status]}
            </span>
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                Cancel Collection
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      {collection.status !== "CANCELLED" && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between overflow-x-auto">
              {timelineSteps.map((step, idx) => {
                const isPast = currentStepIndex >= idx;
                const isCurrent = collection.status === step;
                return (
                  <div key={step} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                          isPast
                            ? "bg-teal-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        } ${isCurrent ? "ring-2 ring-teal-400 ring-offset-2" : ""}`}
                      >
                        {isPast ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium whitespace-nowrap ${
                          isPast ? "text-teal-700" : "text-slate-500"
                        }`}
                      >
                        {statusLabels[step]}
                      </span>
                    </div>
                    {idx < timelineSteps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          currentStepIndex > idx ? "bg-teal-600" : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collection Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Collection Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Reference</dt>
                <dd className="font-mono font-medium text-slate-900">
                  {collection.reference}
                </dd>
              </div>
              {collection.site && (
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Site</dt>
                  <dd className="text-slate-900">{collection.site.name}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Requested Date</dt>
                <dd className="text-slate-900">
                  {collection.requestedDate
                    ? new Date(collection.requestedDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Scheduled Date</dt>
                <dd className="text-slate-900 font-medium">
                  {collection.scheduledDate
                    ? new Date(collection.scheduledDate).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "To be confirmed"}
                </dd>
              </div>
              {collection.collectedAt && (
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Collected</dt>
                  <dd className="text-slate-900">
                    {new Date(collection.collectedAt).toLocaleDateString("en-GB")}
                  </dd>
                </div>
              )}
              {collection.receivedAt && (
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Received at Facility</dt>
                  <dd className="text-slate-900">
                    {new Date(collection.receivedAt).toLocaleDateString("en-GB")}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Estimated Items</dt>
                <dd className="text-slate-900">~{collection.itemEstimate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Actual Assets</dt>
                <dd className="text-slate-900 font-medium">
                  {collection.totalAssetCount}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Location & Contact Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              Location & Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Collection Address</p>
                <p className="text-slate-900">{collection.address}</p>
                <p className="text-slate-900 font-medium">{collection.postcode}</p>
              </div>
              {(collection.contactName ||
                collection.contactPhone ||
                collection.contactEmail) && (
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {collection.contactName && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-slate-400" />
                      <span>{collection.contactName}</span>
                    </div>
                  )}
                  {collection.contactPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <a
                        href={`tel:${collection.contactPhone}`}
                        className="text-teal-600 hover:text-teal-700"
                      >
                        {collection.contactPhone}
                      </a>
                    </div>
                  )}
                  {collection.contactEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <a
                        href={`mailto:${collection.contactEmail}`}
                        className="text-teal-600 hover:text-teal-700"
                      >
                        {collection.contactEmail}
                      </a>
                    </div>
                  )}
                </div>
              )}
              {collection.equipmentCategories.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 mb-2">Equipment Types</p>
                  <div className="flex flex-wrap gap-2">
                    {collection.equipmentCategories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {collection.customerInstructions && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">Instructions</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                    {collection.customerInstructions}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets */}
      {collection.assets.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Assets ({collection.totalAssetCount})
            </CardTitle>
            {collection.totalAssetCount > 50 && (
              <Link
                href={`/portal/assets?collectionId=${collection.id}`}
                className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collection.assets.map((asset) => {
                    const allSanitised =
                      asset.storageMedia.length > 0 &&
                      asset.storageMedia.every(
                        (m) => m.sanitisationStatus === "VERIFIED"
                      );
                    return (
                      <tr key={asset.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/portal/assets/${asset.id}`}
                            className="font-mono text-sm font-medium text-teal-600 hover:text-teal-700"
                          >
                            {asset.assetTag}
                          </Link>
                          {asset.customerAssetTag && (
                            <div className="text-xs text-slate-500">
                              Ref: {asset.customerAssetTag}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-900">
                            {asset.category}
                          </div>
                          <div className="text-xs text-slate-500">
                            {[asset.manufacturer, asset.model]
                              .filter(Boolean)
                              .join(" ") || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">
                            {asset.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {asset.storageMedia.length > 0 ? (
                            allSanitised ? (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                Sanitised
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <Clock className="h-3 w-3" />
                                Pending
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certificates */}
      {collection.certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5" />
              Related Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {collection.certificates.map((cert) => (
                <Link
                  key={cert.id}
                  href={`/portal/certificates/${cert.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                      <Award className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium text-slate-900">
                        {cert.certificateNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        {cert.certificateType.replace(/_/g, " ")} -{" "}
                        {cert.totalMediaCount} items
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-teal-600">View</span>
                    {cert.issueDate && (
                      <p className="text-xs text-slate-500">
                        {new Date(cert.issueDate).toLocaleDateString("en-GB")}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Cancel Collection
              </h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to cancel collection{" "}
              <strong>{collection.reference}</strong>? This action cannot be
              undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason for cancellation
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                rows={3}
                placeholder="Please provide a reason..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                disabled={cancelling}
              >
                Keep Collection
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelReason.trim() || cancelling}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Cancel Collection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

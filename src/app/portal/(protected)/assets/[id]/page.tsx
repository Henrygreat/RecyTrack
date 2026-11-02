"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  HardDrive,
  Award,
  Truck,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getPortalAssetDetail } from "../../actions";
import type { AssetStatus, MediaSanitisationStatus } from "@prisma/client";

const statusColors: Record<AssetStatus, string> = {
  EXPECTED: "bg-slate-100 text-slate-700",
  COLLECTED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-teal-100 text-teal-700",
  INSPECTION: "bg-amber-100 text-amber-700",
  QUARANTINED: "bg-red-100 text-red-700",
  DATA_ERASURE: "bg-orange-100 text-orange-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  READY: "bg-green-100 text-green-700",
  LISTED: "bg-indigo-100 text-indigo-700",
  SOLD: "bg-emerald-100 text-emerald-700",
  RECYCLED: "bg-cyan-100 text-cyan-700",
  DESTROYED: "bg-slate-100 text-slate-500",
  RETURNED: "bg-amber-100 text-amber-700",
  RELEASED: "bg-slate-100 text-slate-600",
};

const statusLabels: Record<AssetStatus, string> = {
  EXPECTED: "Expected",
  COLLECTED: "Collected",
  RECEIVED: "At Facility",
  INSPECTION: "In Inspection",
  QUARANTINED: "Quarantined",
  DATA_ERASURE: "Data Erasure",
  PROCESSING: "Processing",
  READY: "Ready",
  LISTED: "Listed",
  SOLD: "Sold",
  RECYCLED: "Recycled",
  DESTROYED: "Destroyed",
  RETURNED: "Returned",
  RELEASED: "Released",
};

const mediaStatusColors: Record<MediaSanitisationStatus, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700",
  PENDING_ERASURE: "bg-amber-100 text-amber-700",
  ERASURE_IN_PROGRESS: "bg-blue-100 text-blue-700",
  ERASURE_PASSED: "bg-green-100 text-green-700",
  ERASURE_FAILED: "bg-red-100 text-red-700",
  PENDING_DESTRUCTION: "bg-orange-100 text-orange-700",
  DESTRUCTION_IN_PROGRESS: "bg-orange-100 text-orange-700",
  DESTROYED: "bg-slate-100 text-slate-600",
  VERIFIED: "bg-green-100 text-green-700",
  EXEMPT: "bg-slate-100 text-slate-500",
};

type AssetDetailData = {
  id: string;
  assetTag: string;
  customerAssetTag: string | null;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  status: AssetStatus;
  physicalCondition: string | null;
  functionalCondition: string | null;
  receivedAt: Date | null;
  processedAt: Date | null;
  releasedAt: Date | null;
  collection: {
    id: string;
    reference: string;
    scheduledDate: Date | null;
    receivedAt: Date | null;
  } | null;
  storageMedia: Array<{
    id: string;
    reference: string;
    mediaType: string;
    capacity: string | null;
    sanitisationStatus: MediaSanitisationStatus;
  }>;
  statusHistory: Array<{
    fromStatus: AssetStatus;
    toStatus: AssetStatus;
    createdAt: Date;
  }>;
  certificates: Array<{
    id: string;
    certificateNumber: string;
    certificateType: string;
    issueDate: Date | null;
    status: string;
  }>;
};

export default function PortalAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [asset, setAsset] = useState<AssetDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAsset() {
      setLoading(true);
      const result = await getPortalAssetDetail(id);
      if (result.success && result.asset) {
        setAsset(result.asset as AssetDetailData);
      } else {
        setError(result.error || "Failed to load asset");
      }
      setLoading(false);
    }
    loadAsset();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !asset) {
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
            <Package className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Asset Not Found
            </h3>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allMediaSanitised =
    asset.storageMedia.length > 0 &&
    asset.storageMedia.every((m) => m.sanitisationStatus === "VERIFIED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assets
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
              <Package className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-mono">
                {asset.assetTag}
              </h1>
              {asset.customerAssetTag && (
                <p className="text-sm text-slate-500">
                  Your Reference: {asset.customerAssetTag}
                </p>
              )}
            </div>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${statusColors[asset.status]}`}
        >
          {statusLabels[asset.status]}
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Category</p>
            <p className="font-medium text-slate-900">{asset.category}</p>
            <p className="text-sm text-slate-600 mt-1">
              {[asset.manufacturer, asset.model].filter(Boolean).join(" ") ||
                "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Serial Number</p>
            <p className="font-mono text-slate-900">
              {asset.serialNumber || "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Condition</p>
            <p className="text-slate-900">
              {asset.physicalCondition
                ? asset.physicalCondition.replace(/_/g, " ")
                : "-"}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {asset.functionalCondition
                ? asset.functionalCondition.replace(/_/g, " ")
                : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Processing Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Processing Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Collection */}
              {asset.collection && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    <Truck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Collected</p>
                    <p className="text-sm text-slate-500">
                      Collection {asset.collection.reference}
                      {asset.collection.scheduledDate && (
                        <> on {new Date(asset.collection.scheduledDate).toLocaleDateString("en-GB")}</>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Received */}
              {asset.receivedAt && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100">
                    <CheckCircle className="h-4 w-4 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      Received at Facility
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(asset.receivedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Status Changes */}
              {asset.statusHistory.slice(0, 5).map((change, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {statusLabels[change.fromStatus]} → {statusLabels[change.toStatus]}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(change.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Processed */}
              {asset.processedAt && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      Processing Complete
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(asset.processedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Released */}
              {asset.releasedAt && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                    <CheckCircle className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Released</p>
                    <p className="text-sm text-slate-500">
                      {new Date(asset.releasedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Pending */}
              {!asset.processedAt &&
                ["RECEIVED", "INSPECTION", "PROCESSING"].includes(
                  asset.status
                ) && (
                  <div className="flex items-start gap-3 opacity-50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-slate-300">
                      <Clock className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-500">In Progress</p>
                      <p className="text-sm text-slate-400">
                        Processing not yet complete
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Storage Media */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HardDrive className="h-5 w-5" />
              Data Storage Media
              {allMediaSanitised && (
                <span className="ml-auto flex items-center gap-1 text-sm font-normal text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  All Sanitised
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {asset.storageMedia.length === 0 ? (
              <div className="text-center py-8">
                <HardDrive className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  No storage media identified
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {asset.storageMedia.map((media) => (
                  <div
                    key={media.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                  >
                    <div>
                      <p className="font-mono text-sm font-medium text-slate-900">
                        {media.reference}
                      </p>
                      <p className="text-xs text-slate-500">
                        {media.mediaType.replace(/_/g, " ")}
                        {media.capacity && ` - ${media.capacity}`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${mediaStatusColors[media.sanitisationStatus]}`}
                    >
                      {(media.sanitisationStatus === "VERIFIED" || media.sanitisationStatus === "ERASURE_PASSED") && (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      {media.sanitisationStatus === "ERASURE_FAILED" && (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {media.sanitisationStatus === "ERASURE_IN_PROGRESS" && (
                        <Clock className="h-3 w-3" />
                      )}
                      {media.sanitisationStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Certificates */}
      {asset.certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5" />
              Related Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {asset.certificates.map((cert) => (
                <Link
                  key={cert.id}
                  href={`/portal/certificates/${cert.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                      <Award className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium text-slate-900">
                        {cert.certificateNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        {cert.certificateType.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-teal-600">View</p>
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
    </div>
  );
}

import Link from "next/link";
import {
  Truck,
  MapPin,
  Package,
  ArrowRight,
  Award,
  Shield,
  HardDrive,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
} from "lucide-react";
import { requireCustomerAccess } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function PortalDashboard() {
  const ctx = await requireCustomerAccess();

  // Fetch comprehensive stats
  const [
    totalAssets,
    assetsByStatus,
    mediaStats,
    certificateStats,
    recentCollections,
    recentCertificates,
  ] = await Promise.all([
    // Total assets
    prisma.asset.count({
      where: { organizationId: ctx.organizationId, customerId: ctx.customerId },
    }),

    // Assets by status
    prisma.asset.groupBy({
      by: ["status"],
      where: { organizationId: ctx.organizationId, customerId: ctx.customerId },
      _count: true,
    }),

    // Storage media stats (avoiding double counting via distinct)
    prisma.storageMedia.groupBy({
      by: ["sanitisationStatus"],
      where: {
        organizationId: ctx.organizationId,
        asset: { customerId: ctx.customerId },
      },
      _count: true,
    }),

    // Certificate stats
    prisma.certificate.groupBy({
      by: ["status"],
      where: {
        organizationId: ctx.organizationId,
        customerId: ctx.customerId,
      },
      _count: true,
    }),

    // Recent collections
    prisma.collection.findMany({
      where: {
        customerId: ctx.customerId,
        organizationId: ctx.organizationId,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        reference: true,
        status: true,
        scheduledDate: true,
        _count: { select: { assets: true } },
      },
    }),

    // Recent certificates
    prisma.certificate.findMany({
      where: {
        customerId: ctx.customerId,
        organizationId: ctx.organizationId,
        status: "ISSUED",
      },
      orderBy: { issueDate: "desc" },
      take: 3,
      select: {
        id: true,
        certificateNumber: true,
        certificateType: true,
        issueDate: true,
        totalMediaCount: true,
      },
    }),
  ]);

  // Process status counts
  const statusMap: Record<string, number> = {};
  for (const item of assetsByStatus) {
    statusMap[item.status] = item._count;
  }

  const mediaMap: Record<string, number> = {};
  for (const item of mediaStats) {
    mediaMap[item.sanitisationStatus] = item._count;
  }

  const certMap: Record<string, number> = {};
  for (const item of certificateStats) {
    certMap[item.status] = item._count;
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    REQUESTED: { bg: "#fef3c7", text: "#b45309" },
    CONFIRMED: { bg: "#dbeafe", text: "#1e40af" },
    APPROVED: { bg: "#dbeafe", text: "#1e40af" },
    SCHEDULED: { bg: "#e0e7ff", text: "#4338ca" },
    IN_TRANSIT: { bg: "#fae8ff", text: "#a21caf" },
    COLLECTED: { bg: "#d1fae5", text: "#065f46" },
    RECEIVED: { bg: "#dcfce7", text: "#166534" },
    CANCELLED: { bg: "#fef2f2", text: "#b91c1c" },
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back
        </h1>
        <p className="text-slate-500 mt-1">
          Compliance dashboard for {ctx.customerAccess.customer.name}
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalAssets}</p>
                <p className="text-sm text-slate-500">Total Assets</p>
              </div>
              <Package className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {statusMap["RECEIVED"] || 0}
                </p>
                <p className="text-sm text-slate-500">At Facility</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {mediaMap["VERIFIED"] || 0}
                </p>
                <p className="text-sm text-slate-500">Media Sanitised</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-teal-600">
                  {certMap["ISSUED"] || 0}
                </p>
                <p className="text-sm text-slate-500">Certificates</p>
              </div>
              <Award className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Status */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Asset Processing Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Processing Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-slate-700">Awaiting Inspection</span>
                </div>
                <span className="font-semibold text-amber-600">
                  {statusMap["INSPECTION"] || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-slate-700">In Processing</span>
                </div>
                <span className="font-semibold text-blue-600">
                  {statusMap["PROCESSING"] || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-slate-700">Ready / Completed</span>
                </div>
                <span className="font-semibold text-green-600">
                  {(statusMap["READY"] || 0) + (statusMap["RELEASED"] || 0)}
                </span>
              </div>
              {(mediaMap["FAILED"] || 0) > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-slate-700">Requires Attention</span>
                  </div>
                  <span className="font-semibold text-red-600">
                    {mediaMap["FAILED"] || 0}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Certificates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5" />
              Recent Certificates
            </CardTitle>
            <Link
              href="/portal/certificates"
              className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentCertificates.length === 0 ? (
              <div className="text-center py-8">
                <Award className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No certificates issued yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCertificates.map((cert) => (
                  <Link
                    key={cert.id}
                    href={`/portal/certificates/${cert.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {cert.certificateNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        {cert.certificateType.replace(/_/g, " ")} - {cert.totalMediaCount} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        {cert.issueDate?.toLocaleDateString("en-GB")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Collections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            Recent Collections
          </CardTitle>
          <Link
            href="/portal/collections"
            className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentCollections.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No collections yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCollections.map((collection) => {
                const colors = statusColors[collection.status] || { bg: "#f1f5f9", text: "#64748b" };
                return (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium">
                        {collection.reference}
                      </span>
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded-full"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {collection.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{collection._count.assets} assets</span>
                      {collection.scheduledDate && (
                        <span>{collection.scheduledDate.toLocaleDateString("en-GB")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/portal/assets"
            className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-teal-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Track Assets</p>
              <p className="text-xs text-slate-500">View all assets</p>
            </div>
          </Link>

          <Link
            href="/portal/certificates"
            className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-teal-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Award className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Certificates</p>
              <p className="text-xs text-slate-500">Download certificates</p>
            </div>
          </Link>

          <Link
            href="/portal/reports"
            className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-teal-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Reports</p>
              <p className="text-xs text-slate-500">Compliance reports</p>
            </div>
          </Link>

          <Link
            href="/portal/collections"
            className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-teal-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Truck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Collections</p>
              <p className="text-xs text-slate-500">View pickups</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

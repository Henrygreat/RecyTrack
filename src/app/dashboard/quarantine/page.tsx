import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle,
  Trash2,
  Search,
} from "lucide-react";
import { requireMember, STAFF_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QUARANTINE_REASON_LABELS, QUARANTINE_STATUS_LABELS } from "@/lib/quarantine";
import type { QuarantineStatus, QuarantineReason } from "@prisma/client";

const statusColors: Record<QuarantineStatus, string> = {
  ACTIVE: "bg-red-100 text-red-700",
  RELEASED: "bg-green-100 text-green-700",
  DISPOSED: "bg-slate-100 text-slate-700",
};

const reasonColors: Record<QuarantineReason, string> = {
  DAMAGE: "bg-orange-100 text-orange-700",
  DATA_SECURITY: "bg-red-100 text-red-700",
  INVESTIGATION: "bg-purple-100 text-purple-700",
  COMPLIANCE: "bg-blue-100 text-blue-700",
  CUSTOMER_REQUEST: "bg-teal-100 text-teal-700",
  SUSPECTED_STOLEN: "bg-red-100 text-red-700",
  HAZARDOUS: "bg-yellow-100 text-yellow-700",
  OTHER: "bg-slate-100 text-slate-700",
};

export default async function QuarantinePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; reason?: string }>;
}) {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);
  const params = await searchParams;
  const statusFilter = params.status as QuarantineStatus | undefined;
  const reasonFilter = params.reason as QuarantineReason | undefined;

  // Get metrics
  const [statusCounts, reasonCounts, quarantines] = await Promise.all([
    prisma.assetQuarantine.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { status: true },
    }),
    prisma.assetQuarantine.groupBy({
      by: ["reason"],
      where: { organizationId, status: "ACTIVE" },
      _count: { reason: true },
    }),
    prisma.assetQuarantine.findMany({
      where: {
        organizationId,
        ...(statusFilter && { status: statusFilter }),
        ...(reasonFilter && { reason: reasonFilter }),
      },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            manufacturer: true,
            model: true,
            category: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
      take: 50,
    }),
  ]);

  const metrics = {
    active: statusCounts.find((s) => s.status === "ACTIVE")?._count.status ?? 0,
    released: statusCounts.find((s) => s.status === "RELEASED")?._count.status ?? 0,
    disposed: statusCounts.find((s) => s.status === "DISPOSED")?._count.status ?? 0,
    byReason: Object.fromEntries(
      reasonCounts.map((r) => [r.reason, r._count.reason])
    ) as Record<QuarantineReason, number>,
  };

  return (
    <>
      <PageHeader
        title="Quarantine Management"
        description="Assets held in quarantine for investigation or compliance"
      />

      {/* Active Alert */}
      {metrics.active > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">
              {metrics.active} asset{metrics.active !== 1 ? "s" : ""} currently in quarantine
            </p>
            <p className="text-sm text-red-600 mt-1">
              Review and resolve quarantine holds to release assets back to processing.
            </p>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className={statusFilter === "ACTIVE" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "ACTIVE" ? "/dashboard/quarantine" : "/dashboard/quarantine?status=ACTIVE"}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <p className="text-2xl font-bold text-red-600">{metrics.active}</p>
              </div>
              <p className="text-sm text-slate-500">Active Quarantine</p>
            </CardContent>
          </Link>
        </Card>
        <Card className={statusFilter === "RELEASED" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "RELEASED" ? "/dashboard/quarantine" : "/dashboard/quarantine?status=RELEASED"}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-2xl font-bold text-green-600">{metrics.released}</p>
              </div>
              <p className="text-sm text-slate-500">Released</p>
            </CardContent>
          </Link>
        </Card>
        <Card className={statusFilter === "DISPOSED" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "DISPOSED" ? "/dashboard/quarantine" : "/dashboard/quarantine?status=DISPOSED"}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-slate-500" />
                <p className="text-2xl font-bold text-slate-600">{metrics.disposed}</p>
              </div>
              <p className="text-sm text-slate-500">Disposed</p>
            </CardContent>
          </Link>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <p className="text-2xl font-bold text-amber-600">
                {quarantines.filter(
                  (q) =>
                    q.status === "ACTIVE" &&
                    q.expectedEndDate &&
                    new Date(q.expectedEndDate) < new Date()
                ).length}
              </p>
            </div>
            <p className="text-sm text-slate-500">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Reason Breakdown (for active) */}
      {Object.keys(metrics.byReason).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Active Quarantine by Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(metrics.byReason).map(([reason, count]) => (
                <Link
                  key={reason}
                  href={`/dashboard/quarantine?status=ACTIVE&reason=${reason}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    reasonColors[reason as QuarantineReason]
                  } hover:opacity-80 transition-opacity`}
                >
                  {QUARANTINE_REASON_LABELS[reason as QuarantineReason]}: {count}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quarantine List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Quarantine Records
            {statusFilter && ` — ${QUARANTINE_STATUS_LABELS[statusFilter]}`}
            {reasonFilter && ` — ${QUARANTINE_REASON_LABELS[reasonFilter]}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quarantines.length === 0 ? (
            <div className="text-center py-12">
              <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No quarantine records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Asset</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Reason</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Start Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Expected End</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Assigned To</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quarantines.map((quarantine) => {
                    const isOverdue =
                      quarantine.status === "ACTIVE" &&
                      quarantine.expectedEndDate &&
                      new Date(quarantine.expectedEndDate) < new Date();

                    return (
                      <tr key={quarantine.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <Link
                            href={`/dashboard/assets/${quarantine.asset.id}`}
                            className="font-mono text-teal-600 hover:text-teal-700"
                          >
                            {quarantine.asset.assetTag}
                          </Link>
                          <p className="text-xs text-slate-400">
                            {quarantine.asset.manufacturer} {quarantine.asset.model}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              reasonColors[quarantine.reason]
                            }`}
                          >
                            {QUARANTINE_REASON_LABELS[quarantine.reason]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {quarantine.startDate.toLocaleDateString("en-GB")}
                        </td>
                        <td className="py-3 px-4">
                          {quarantine.expectedEndDate ? (
                            <span className={isOverdue ? "text-red-600 font-medium" : "text-slate-600"}>
                              {quarantine.expectedEndDate.toLocaleDateString("en-GB")}
                              {isOverdue && " (Overdue)"}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {quarantine.assignedToName || "Unassigned"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[quarantine.status]
                            }`}
                          >
                            {QUARANTINE_STATUS_LABELS[quarantine.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

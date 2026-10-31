import Link from "next/link";
import {
  GitBranch,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  ArrowRight,
} from "lucide-react";
import { requireMember, STAFF_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CUSTODY_EVENT_TYPE_LABELS, HANDOVER_STATUS_LABELS } from "@/lib/custody";
import type { HandoverStatus, CustodyEventType } from "@prisma/client";

const statusColors: Record<HandoverStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-700",
};

const statusIcons: Record<HandoverStatus, typeof Clock> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  REJECTED: XCircle,
  CANCELLED: XCircle,
};

export default async function CustodyPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);
  const params = await searchParams;
  const statusFilter = params.status as HandoverStatus | undefined;
  const typeFilter = params.type as CustodyEventType | undefined;

  // Get metrics
  const [statusCounts, exceptionCount, events] = await Promise.all([
    prisma.custodyEvent.groupBy({
      by: ["handoverStatus"],
      where: { organizationId },
      _count: { handoverStatus: true },
    }),
    prisma.custodyException.count({
      where: { organizationId, status: { in: ["OPEN", "INVESTIGATING"] } },
    }),
    prisma.custodyEvent.findMany({
      where: {
        organizationId,
        ...(statusFilter && { handoverStatus: statusFilter }),
        ...(typeFilter && { eventType: typeFilter }),
      },
      include: {
        asset: {
          select: { id: true, assetTag: true, manufacturer: true, model: true },
        },
      },
      orderBy: { eventDate: "desc" },
      take: 50,
    }),
  ]);

  const metrics = {
    pending: statusCounts.find((s) => s.handoverStatus === "PENDING")?._count.handoverStatus ?? 0,
    confirmed: statusCounts.find((s) => s.handoverStatus === "CONFIRMED")?._count.handoverStatus ?? 0,
    rejected: statusCounts.find((s) => s.handoverStatus === "REJECTED")?._count.handoverStatus ?? 0,
    exceptions: exceptionCount,
  };

  return (
    <>
      <PageHeader
        title="Chain of Custody"
        description="Asset custody tracking and handover management"
        actions={
          <div className="flex gap-2">
            <Link
              href="/dashboard/custody/exceptions"
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                metrics.exceptions > 0
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Exceptions
              {metrics.exceptions > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full">
                  {metrics.exceptions}
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/custody/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Transfer
            </Link>
          </div>
        }
      />

      {/* Pending Alert */}
      {metrics.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">
              {metrics.pending} pending handover{metrics.pending !== 1 ? "s" : ""} awaiting confirmation
            </p>
            <p className="text-sm text-amber-600 mt-1">
              Review and confirm custody transfers to maintain chain of custody integrity.
            </p>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className={statusFilter === "PENDING" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "PENDING" ? "/dashboard/custody" : "/dashboard/custody?status=PENDING"}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <p className="text-2xl font-bold text-amber-600">{metrics.pending}</p>
              </div>
              <p className="text-sm text-slate-500">Pending</p>
            </CardContent>
          </Link>
        </Card>
        <Card className={statusFilter === "CONFIRMED" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "CONFIRMED" ? "/dashboard/custody" : "/dashboard/custody?status=CONFIRMED"}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-2xl font-bold text-green-600">{metrics.confirmed}</p>
              </div>
              <p className="text-sm text-slate-500">Confirmed</p>
            </CardContent>
          </Link>
        </Card>
        <Card className={statusFilter === "REJECTED" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "REJECTED" ? "/dashboard/custody" : "/dashboard/custody?status=REJECTED"}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="text-2xl font-bold text-red-600">{metrics.rejected}</p>
              </div>
              <p className="text-sm text-slate-500">Rejected</p>
            </CardContent>
          </Link>
        </Card>
        <Card>
          <Link href="/dashboard/custody/exceptions">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className={`text-2xl font-bold ${metrics.exceptions > 0 ? "text-red-600" : "text-slate-600"}`}>
                  {metrics.exceptions}
                </p>
              </div>
              <p className="text-sm text-slate-500">Open Exceptions</p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Custody Events
            {statusFilter && ` — ${HANDOVER_STATUS_LABELS[statusFilter]}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No custody events found</p>
              <Link
                href="/dashboard/custody/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Initiate Transfer
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Reference</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Asset</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Transfer</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const StatusIcon = statusIcons[event.handoverStatus];
                    return (
                      <tr key={event.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <Link
                            href={`/dashboard/custody/${event.id}`}
                            className="font-mono text-teal-600 hover:text-teal-700"
                          >
                            {event.reference}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/dashboard/assets/${event.asset.id}`}
                            className="font-mono text-slate-600 hover:text-slate-800"
                          >
                            {event.asset.assetTag}
                          </Link>
                          {event.asset.manufacturer && (
                            <p className="text-xs text-slate-400">
                              {event.asset.manufacturer} {event.asset.model}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {CUSTODY_EVENT_TYPE_LABELS[event.eventType]}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="truncate max-w-[100px]">
                              {event.fromCustodianName || event.fromLocationName || "—"}
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[100px]">
                              {event.toCustodianName || event.toLocationName || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {event.eventDate.toLocaleDateString("en-GB")}
                          <p className="text-xs text-slate-400">
                            {event.eventDate.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[event.handoverStatus]
                            }`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {HANDOVER_STATUS_LABELS[event.handoverStatus]}
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

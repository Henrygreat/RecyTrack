import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Search as SearchIcon,
  ArrowUpRight,
  Eye,
} from "lucide-react";
import { requireMember, STAFF_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CUSTODY_EXCEPTION_TYPE_LABELS,
  CUSTODY_EXCEPTION_STATUS_LABELS,
} from "@/lib/custody";
import type { CustodyExceptionStatus, CustodyExceptionType } from "@prisma/client";

const statusColors: Record<CustodyExceptionStatus, string> = {
  OPEN: "bg-red-100 text-red-700",
  INVESTIGATING: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  ESCALATED: "bg-purple-100 text-purple-700",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default async function CustodyExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>;
}) {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);
  const params = await searchParams;
  const statusFilter = params.status as CustodyExceptionStatus | undefined;
  const priorityFilter = params.priority;

  // Get metrics
  const [statusCounts, exceptions] = await Promise.all([
    prisma.custodyException.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { status: true },
    }),
    prisma.custodyException.findMany({
      where: {
        organizationId,
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
      },
      include: {
        asset: {
          select: { id: true, assetTag: true, manufacturer: true, model: true },
        },
      },
      orderBy: [
        { priority: "desc" }, // critical first
        { createdAt: "desc" },
      ],
      take: 50,
    }),
  ]);

  const metrics = {
    open: statusCounts.find((s) => s.status === "OPEN")?._count.status ?? 0,
    investigating: statusCounts.find((s) => s.status === "INVESTIGATING")?._count.status ?? 0,
    escalated: statusCounts.find((s) => s.status === "ESCALATED")?._count.status ?? 0,
    resolved: statusCounts.find((s) => s.status === "RESOLVED")?._count.status ?? 0,
  };

  const openExceptions = metrics.open + metrics.investigating + metrics.escalated;

  return (
    <>
      <PageHeader
        title="Custody Exceptions"
        description="Track and resolve chain of custody issues"
        backHref="/dashboard/custody"
      />

      {/* Critical Alert */}
      {exceptions.some((e) => e.priority === "critical" && e.status !== "RESOLVED") && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Critical exceptions require immediate attention</p>
            <p className="text-sm text-red-600 mt-1">
              There are critical custody exceptions that may indicate security or compliance issues.
            </p>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className={statusFilter === "OPEN" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "OPEN" ? "/dashboard/custody/exceptions" : "/dashboard/custody/exceptions?status=OPEN"}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-2xl font-bold text-red-600">{metrics.open}</p>
              </div>
              <p className="text-sm text-slate-500">Open</p>
            </CardContent>
          </Link>
        </Card>
        <Card className={statusFilter === "INVESTIGATING" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "INVESTIGATING" ? "/dashboard/custody/exceptions" : "/dashboard/custody/exceptions?status=INVESTIGATING"}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <SearchIcon className="w-5 h-5 text-amber-500" />
                <p className="text-2xl font-bold text-amber-600">{metrics.investigating}</p>
              </div>
              <p className="text-sm text-slate-500">Investigating</p>
            </CardContent>
          </Link>
        </Card>
        <Card className={statusFilter === "ESCALATED" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "ESCALATED" ? "/dashboard/custody/exceptions" : "/dashboard/custody/exceptions?status=ESCALATED"}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-purple-500" />
                <p className="text-2xl font-bold text-purple-600">{metrics.escalated}</p>
              </div>
              <p className="text-sm text-slate-500">Escalated</p>
            </CardContent>
          </Link>
        </Card>
        <Card className={statusFilter === "RESOLVED" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "RESOLVED" ? "/dashboard/custody/exceptions" : "/dashboard/custody/exceptions?status=RESOLVED"}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-2xl font-bold text-green-600">{metrics.resolved}</p>
              </div>
              <p className="text-sm text-slate-500">Resolved</p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Priority Filter */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Filter by priority:</span>
            <div className="flex gap-2">
              {["critical", "high", "medium", "low"].map((p) => (
                <Link
                  key={p}
                  href={priorityFilter === p ? "/dashboard/custody/exceptions" : `/dashboard/custody/exceptions?priority=${p}`}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    priorityFilter === p
                      ? "ring-2 ring-teal-500 " + priorityColors[p]
                      : priorityColors[p] + " hover:opacity-80"
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exceptions List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Exceptions
            {statusFilter && ` — ${CUSTODY_EXCEPTION_STATUS_LABELS[statusFilter]}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <p className="text-slate-500">No exceptions found</p>
              <p className="text-sm text-slate-400 mt-1">
                Chain of custody is in good standing.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Reference</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Asset</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Priority</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Detected</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((exception) => (
                    <tr key={exception.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-teal-600">{exception.reference}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/dashboard/assets/${exception.asset.id}`}
                          className="font-mono text-slate-600 hover:text-slate-800"
                        >
                          {exception.asset.assetTag}
                        </Link>
                        {exception.asset.manufacturer && (
                          <p className="text-xs text-slate-400">
                            {exception.asset.manufacturer} {exception.asset.model}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {CUSTODY_EXCEPTION_TYPE_LABELS[exception.exceptionType]}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            priorityColors[exception.priority]
                          }`}
                        >
                          {exception.priority.charAt(0).toUpperCase() + exception.priority.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {exception.detectedAt.toLocaleDateString("en-GB")}
                        <p className="text-xs text-slate-400">
                          by {exception.detectedByName || "System"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[exception.status]
                          }`}
                        >
                          {CUSTODY_EXCEPTION_STATUS_LABELS[exception.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/dashboard/custody/exceptions/${exception.id}`}
                          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

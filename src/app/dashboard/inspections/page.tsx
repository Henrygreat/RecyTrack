import Link from "next/link";
import {
  ClipboardCheck,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  FileEdit,
  Search,
  Filter,
} from "lucide-react";
import { requireMember, STAFF_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InspectionStatus } from "@prisma/client";

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

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { organizationId, membership } = await requireMember(undefined, STAFF_ROLES);
  const params = await searchParams;
  const statusFilter = params.status as InspectionStatus | undefined;
  const searchQuery = params.search || "";

  // Get metrics
  const [statusCounts, inspections] = await Promise.all([
    prisma.inspection.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { status: true },
    }),
    prisma.inspection.findMany({
      where: {
        organizationId,
        ...(statusFilter && { status: statusFilter }),
        ...(searchQuery && {
          OR: [
            { reference: { contains: searchQuery, mode: "insensitive" } },
            { asset: { assetTag: { contains: searchQuery, mode: "insensitive" } } },
            { inspectorName: { contains: searchQuery, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        asset: {
          select: { id: true, assetTag: true, manufacturer: true, model: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const metrics = {
    total: statusCounts.reduce((sum, s) => sum + s._count.status, 0),
    draft: statusCounts.find((s) => s.status === "DRAFT")?._count.status ?? 0,
    submitted: statusCounts.find((s) => s.status === "SUBMITTED")?._count.status ?? 0,
    approved: statusCounts.find((s) => s.status === "APPROVED")?._count.status ?? 0,
    rejected: statusCounts.find((s) => s.status === "REJECTED")?._count.status ?? 0,
  };

  return (
    <>
      <PageHeader
        title="Inspections"
        description="Asset inspection management and quality control"
        actions={
          <div className="flex gap-2">
            <Link
              href="/dashboard/inspections/templates"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" />
              Templates
            </Link>
            <Link
              href="/dashboard/inspections/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Inspection
            </Link>
          </div>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-slate-900">{metrics.total}</p>
            <p className="text-sm text-slate-500">Total</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === "DRAFT" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "DRAFT" ? "/dashboard/inspections" : "/dashboard/inspections?status=DRAFT"}>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-slate-700">{metrics.draft}</p>
              <p className="text-sm text-slate-500">Draft</p>
            </CardContent>
          </Link>
        </Card>
        <Card className={statusFilter === "SUBMITTED" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "SUBMITTED" ? "/dashboard/inspections" : "/dashboard/inspections?status=SUBMITTED"}>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-blue-600">{metrics.submitted}</p>
              <p className="text-sm text-slate-500">Pending Review</p>
            </CardContent>
          </Link>
        </Card>
        <Card className={statusFilter === "APPROVED" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "APPROVED" ? "/dashboard/inspections" : "/dashboard/inspections?status=APPROVED"}>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600">{metrics.approved}</p>
              <p className="text-sm text-slate-500">Approved</p>
            </CardContent>
          </Link>
        </Card>
        <Card className={statusFilter === "REJECTED" ? "ring-2 ring-teal-500" : ""}>
          <Link href={statusFilter === "REJECTED" ? "/dashboard/inspections" : "/dashboard/inspections?status=REJECTED"}>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-red-600">{metrics.rejected}</p>
              <p className="text-sm text-slate-500">Rejected</p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <form method="GET" className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={searchQuery}
                placeholder="Search by reference, asset tag, or inspector..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Search
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Inspections List */}
      <Card>
        <CardHeader>
          <CardTitle>Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          {inspections.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No inspections found</p>
              <Link
                href="/dashboard/inspections/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Inspection
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
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Inspector</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Grade</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inspections.map((inspection) => {
                    const StatusIcon = statusIcons[inspection.status];
                    return (
                      <tr key={inspection.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <Link
                            href={`/dashboard/inspections/${inspection.id}`}
                            className="font-mono text-teal-600 hover:text-teal-700"
                          >
                            {inspection.reference}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/dashboard/assets/${inspection.asset.id}`}
                            className="font-mono text-slate-600 hover:text-slate-800"
                          >
                            {inspection.asset.assetTag}
                          </Link>
                          {inspection.asset.manufacturer && (
                            <p className="text-xs text-slate-400">
                              {inspection.asset.manufacturer} {inspection.asset.model}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 capitalize">
                          {inspection.inspectionType.toLowerCase().replace("_", " ")}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {inspection.inspectorName || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {inspection.inspectionDate.toLocaleDateString("en-GB")}
                        </td>
                        <td className="py-3 px-4">
                          {inspection.conditionGrade ? (
                            <Badge
                              variant={
                                inspection.conditionGrade === "A" || inspection.conditionGrade === "B"
                                  ? "success"
                                  : inspection.conditionGrade === "F"
                                  ? "error"
                                  : "secondary"
                              }
                            >
                              Grade {inspection.conditionGrade}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[inspection.status]}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {inspection.status}
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

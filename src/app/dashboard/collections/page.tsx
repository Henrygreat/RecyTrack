import Link from "next/link";
import { Package, Plus, Calendar, MapPin, Hash, Boxes, ChevronRight } from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { updateCollectionStatus } from "@/app/actions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CollectionStatusBadge, Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";

// Primary workflow actions (excludes CANCELLED and EXCEPTION branches)
const nextStatus: Record<string, string | undefined> = {
  DRAFT: "REQUESTED",
  REQUESTED: "APPROVED",
  APPROVED: "SCHEDULED",
  SCHEDULED: "ASSIGNED",
  ASSIGNED: "IN_TRANSIT",
  IN_TRANSIT: "COLLECTED",
  COLLECTED: "RECEIVED",
  RECEIVED: "COMPLETED",
};

const statusLabels: Record<string, string> = {
  REQUESTED: "Submit",
  APPROVED: "Approve",
  SCHEDULED: "Schedule",
  ASSIGNED: "Assign",
  IN_TRANSIT: "Dispatch",
  COLLECTED: "Collected",
  RECEIVED: "Received",
  COMPLETED: "Complete",
};

export default async function Collections() {
  const { organizationId, membership } = await requireMember();

  const [collections, statusCounts] = await Promise.all([
    prisma.collection.findMany({
      where: { organizationId },
      include: {
        customer: true,
        routeDate: { include: { zone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.collection.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { status: true },
    }),
  ]);

  const canManage = MANAGEMENT_ROLES.includes(membership.role);

  // Calculate metrics
  const pendingCount = statusCounts
    .filter((s) => ["DRAFT", "REQUESTED", "APPROVED", "SCHEDULED"].includes(s.status))
    .reduce((sum, s) => sum + s._count.status, 0);
  const inProgressCount = statusCounts
    .filter((s) => ["ASSIGNED", "IN_TRANSIT", "COLLECTED", "RECEIVED"].includes(s.status))
    .reduce((sum, s) => sum + s._count.status, 0);
  const completedCount = statusCounts
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + s._count.status, 0);

  return (
    <>
      <PageHeader
        title="Collections"
        description="Track and manage all collection requests"
        actions={
          canManage && (
            <Link
              href="/dashboard/collections/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Book Collection
            </Link>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Pending" value={pendingCount} icon={Package} subtitle="Awaiting action" />
        <MetricCard title="In Progress" value={inProgressCount} icon={Boxes} subtitle="Being processed" />
        <MetricCard title="Completed" value={completedCount} icon={Calendar} subtitle="This period" />
        <MetricCard title="Total" value={collections.length} icon={Hash} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Collections</CardTitle>
            <Badge variant="secondary">{collections.length} records</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {collections.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No collections yet"
              description="Book your first collection to get started."
              action={
                canManage ? { label: "Book Collection", href: "/dashboard/collections/new" } : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Reference
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Postcode
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2 justify-center">
                        <Boxes className="w-4 h-4" />
                        Items
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    {canManage && (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Action
                      </th>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collections.map((collection) => (
                    <tr key={collection.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/collections/${collection.id}`}
                          className="font-mono text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                        >
                          {collection.reference}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/customers/${collection.customerId}`}
                          className="text-slate-900 hover:text-teal-600 transition-colors"
                        >
                          {collection.customer.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{collection.postcode}</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">
                        {(collection.routeDate?.serviceDate ?? collection.requestedDate)?.toLocaleDateString(
                          "en-GB",
                          {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          }
                        ) ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                          {collection.itemEstimate}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <CollectionStatusBadge status={collection.status} />
                      </td>
                      {canManage && (
                        <td className="px-6 py-4">
                          {nextStatus[collection.status] ? (
                            <form action={updateCollectionStatus}>
                              <input type="hidden" name="id" value={collection.id} />
                              <input type="hidden" name="status" value={nextStatus[collection.status]} />
                              <button
                                type="submit"
                                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-teal-500 transition-colors"
                              >
                                {statusLabels[nextStatus[collection.status]!]}
                              </button>
                            </form>
                          ) : (
                            <span className="text-slate-400 text-sm">Complete</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/collections/${collection.id}`}
                          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 transition-colors"
                        >
                          View
                          <ChevronRight className="w-4 h-4" />
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

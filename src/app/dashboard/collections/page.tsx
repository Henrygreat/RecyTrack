import Link from "next/link";
import { Package, Plus, Calendar, MapPin, Hash, Boxes } from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { updateCollectionStatus } from "@/app/actions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CollectionStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const nextStatus: Record<string, string | undefined> = {
  REQUESTED: "CONFIRMED",
  CONFIRMED: "ASSIGNED",
  ASSIGNED: "IN_TRANSIT",
  IN_TRANSIT: "COLLECTED",
  COLLECTED: "RECEIVED",
};

const statusLabels: Record<string, string> = {
  CONFIRMED: "Confirm",
  ASSIGNED: "Assign",
  IN_TRANSIT: "Start Transit",
  COLLECTED: "Mark Collected",
  RECEIVED: "Mark Received",
};

export default async function Collections() {
  const { organizationId, membership } = await requireMember();

  const collections = await prisma.collection.findMany({
    where: { organizationId },
    include: {
      customer: true,
      routeDate: { include: { zone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const canManage = MANAGEMENT_ROLES.includes(membership.role);

  return (
    <>
      <PageHeader
        title="Collections"
        description="Track and manage all collection requests"
        actions={
          canManage && (
            <Link href="/dashboard/collections/new" className="btn">
              <Plus className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Book Collection
            </Link>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Collections ({collections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {collections.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No collections yet"
              description="Book your first collection to get started."
              action={
                canManage
                  ? { label: "Book Collection", href: "/dashboard/collections/new" }
                  : undefined
              }
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-slate-400" />
                        Reference
                      </div>
                    </th>
                    <th>Customer</th>
                    <th>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        Postcode
                      </div>
                    </th>
                    <th>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        Date
                      </div>
                    </th>
                    <th>
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-slate-400" />
                        Items
                      </div>
                    </th>
                    <th>Status</th>
                    {canManage && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {collections.map((collection) => (
                    <tr key={collection.id}>
                      <td>
                        <span className="font-medium text-slate-900">{collection.reference}</span>
                      </td>
                      <td className="text-slate-600">{collection.customer.name}</td>
                      <td className="text-slate-600">{collection.postcode}</td>
                      <td className="text-slate-600">
                        {(collection.routeDate?.serviceDate ?? collection.requestedDate)
                          ?.toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          }) ?? "—"}
                      </td>
                      <td className="text-slate-600">{collection.itemEstimate}</td>
                      <td>
                        <CollectionStatusBadge status={collection.status} />
                      </td>
                      {canManage && (
                        <td>
                          {nextStatus[collection.status] ? (
                            <form action={updateCollectionStatus}>
                              <input type="hidden" name="id" value={collection.id} />
                              <input type="hidden" name="status" value={nextStatus[collection.status]} />
                              <button type="submit" className="btn secondary" style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}>
                                {statusLabels[nextStatus[collection.status]!]}
                              </button>
                            </form>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}
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

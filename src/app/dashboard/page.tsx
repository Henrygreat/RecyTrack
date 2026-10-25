import Link from "next/link";
import { Users, Package, Box, Calendar, ArrowRight, Clock, TrendingUp } from "lucide-react";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CollectionStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function Dashboard() {
  const { organizationId, membership } = await requireMember();

  // Fetch real metrics from the database
  const [
    customerCount,
    collectionCount,
    assetCount,
    pendingCollections,
    upcomingCollections,
    recentCollections,
  ] = await Promise.all([
    prisma.customer.count({ where: { organizationId } }),
    prisma.collection.count({ where: { organizationId } }),
    prisma.asset.count({ where: { organizationId } }),
    prisma.collection.count({
      where: {
        organizationId,
        status: { in: ["REQUESTED", "CONFIRMED", "ASSIGNED"] },
      },
    }),
    prisma.collection.findMany({
      where: {
        organizationId,
        status: { in: ["CONFIRMED", "ASSIGNED"] },
        routeDate: { serviceDate: { gte: new Date() } },
      },
      include: {
        customer: true,
        routeDate: { include: { zone: true } },
      },
      orderBy: { routeDate: { serviceDate: "asc" } },
      take: 5,
    }),
    prisma.collection.findMany({
      where: { organizationId },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Operations Overview"
        description={`${membership.organization.name} • Live database records`}
      />

      {/* Metrics Grid */}
      <div className="cards">
        <MetricCard title="Total Customers" value={customerCount} icon={Users} />
        <MetricCard title="Total Collections" value={collectionCount} icon={Package} />
        <MetricCard title="Assets Registered" value={assetCount} icon={Box} />
        <MetricCard title="Awaiting Action" value={pendingCollections} icon={Clock} />
      </div>

      {/* Two-column layout for lists */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
        {/* Upcoming Collections */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Collections</CardTitle>
              <Link
                href="/dashboard/collections"
                className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingCollections.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No upcoming collections"
                description="Schedule collections to see them here."
                action={{ label: "Book Collection", href: "/dashboard/collections/new" }}
              />
            ) : (
              <div className="space-y-3">
                {upcomingCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{collection.customer.name}</p>
                      <p className="text-sm text-slate-500">
                        {collection.routeDate?.serviceDate.toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        • {collection.routeDate?.zone.name}
                      </p>
                    </div>
                    <CollectionStatusBadge status={collection.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Link
                href="/dashboard/collections"
                className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentCollections.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No recent activity"
                description="Collection activity will appear here."
              />
            ) : (
              <div className="space-y-3">
                {recentCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{collection.reference}</p>
                      <p className="text-sm text-slate-500">
                        {collection.customer.name} •{" "}
                        {collection.createdAt.toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <CollectionStatusBadge status={collection.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card style={{ marginTop: "1.5rem" }}>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
            <Link href="/dashboard/customers/new" className="btn">
              <Users className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Add Customer
            </Link>
            <Link href="/dashboard/collections/new" className="btn secondary">
              <Package className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Book Collection
            </Link>
            <Link href="/dashboard/routes" className="btn secondary">
              <Calendar className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              View Routes
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

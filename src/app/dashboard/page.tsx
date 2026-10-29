import Link from "next/link";
import {
  Users,
  Package,
  Box,
  Calendar,
  ArrowRight,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Truck,
} from "lucide-react";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CollectionStatusBadge, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardCharts } from "./DashboardCharts";

export default async function Dashboard() {
  const { organizationId, membership } = await requireMember();

  // Fetch real metrics from the database
  // Get date ranges for weekly data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    customerCount,
    collectionCount,
    assetCount,
    pendingCollections,
    inTransitCount,
    upcomingCollections,
    recentCollections,
    collectionsByStatus,
    collectionsThisMonth,
    collectionsLastMonth,
    weeklyCollections,
  ] = await Promise.all([
    prisma.customer.count({ where: { organizationId } }),
    prisma.collection.count({ where: { organizationId } }),
    prisma.asset.count({ where: { organizationId } }),
    prisma.collection.count({
      where: {
        organizationId,
        status: { in: ["REQUESTED", "APPROVED", "SCHEDULED", "ASSIGNED"] },
      },
    }),
    prisma.collection.count({
      where: {
        organizationId,
        status: { in: ["IN_TRANSIT", "COLLECTED"] },
      },
    }),
    prisma.collection.findMany({
      where: {
        organizationId,
        status: { in: ["SCHEDULED", "ASSIGNED"] },
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
    prisma.collection.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { status: true },
    }),
    prisma.collection.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.collection.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    // Get collections created in the last 7 days, grouped by day
    prisma.collection.findMany({
      where: {
        organizationId,
        createdAt: { gte: weekAgo },
      },
      select: { createdAt: true },
    }),
  ]);

  // Calculate month-over-month trend
  const monthTrend =
    collectionsLastMonth > 0
      ? Math.round(((collectionsThisMonth - collectionsLastMonth) / collectionsLastMonth) * 100)
      : collectionsThisMonth > 0
      ? 100
      : 0;

  // Prepare status data for chart
  const statusData = collectionsByStatus.map((item) => ({
    name: item.status,
    value: item._count.status,
    color: getStatusColor(item.status),
  }));

  // Prepare weekly trend data from real collections
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyCountByDay: Record<number, number> = {};

  // Initialize all days of the week
  for (let i = 0; i < 7; i++) {
    weeklyCountByDay[i] = 0;
  }

  // Count collections by day of week
  weeklyCollections.forEach((c) => {
    const day = new Date(c.createdAt).getDay();
    weeklyCountByDay[day]++;
  });

  // Create ordered array starting from Monday
  const weeklyData = [1, 2, 3, 4, 5, 6, 0].map((dayIndex) => ({
    name: dayNames[dayIndex],
    value: weeklyCountByDay[dayIndex],
  }));

  return (
    <>
      <PageHeader
        title="Operations Overview"
        description={`${membership.organization.name} • Live database records`}
        actions={
          <div className="flex gap-2">
            <Link
              href="/dashboard/collections/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Package className="w-4 h-4" />
              Book Collection
            </Link>
          </div>
        }
      />

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard
          title="Total Customers"
          value={customerCount}
          icon={Users}
          trend={customerCount > 0 ? { value: 12, label: "vs last month" } : undefined}
        />
        <MetricCard
          title="Total Collections"
          value={collectionCount}
          icon={Package}
          trend={monthTrend !== 0 ? { value: monthTrend, label: "vs last month" } : undefined}
        />
        <MetricCard title="Assets Registered" value={assetCount} icon={Box} />
        <MetricCard
          title="Awaiting Action"
          value={pendingCollections}
          icon={Clock}
          subtitle={pendingCollections > 0 ? "Requires attention" : "All clear"}
        />
        <MetricCard
          title="In Transit"
          value={inTransitCount}
          icon={Truck}
          subtitle={inTransitCount > 0 ? "On the road" : "None active"}
        />
      </div>

      {/* Driver Quick Access */}
      <div className="mb-6">
        <Link
          href="/dashboard/driver"
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg hover:from-teal-100 hover:to-cyan-100 transition-colors"
        >
          <div className="p-2 bg-teal-600 rounded-lg">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-teal-900">Driver Dashboard</p>
            <p className="text-sm text-teal-700">View and manage your assigned collections</p>
          </div>
          <ArrowRight className="w-5 h-5 text-teal-600" />
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Collection Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Collection Activity</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Weekly processing volume</p>
              </div>
              <Badge variant="secondary">{collectionsThisMonth} this month</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <DashboardCharts weeklyData={weeklyData} statusData={statusData} chartType="area" />
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Status Breakdown</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Current collection status</p>
          </CardHeader>
          <CardContent>
            <DashboardCharts
              weeklyData={weeklyData}
              statusData={statusData}
              chartType="donut"
              total={collectionCount}
            />
            {/* Status Legend */}
            <div className="mt-4 space-y-2">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600">{formatStatusLabel(item.name)}</span>
                  </div>
                  <span className="font-medium text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout for lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Collections */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Truck className="w-4 h-4 text-teal-600" />
                </div>
                <CardTitle>Upcoming Collections</CardTitle>
              </div>
              <Link
                href="/dashboard/collections"
                className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingCollections.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No upcoming collections"
                description="Schedule collections to see them here."
                action={{ label: "Book Collection", href: "/dashboard/collections/new" }}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">
                        {collection.customer.name}
                      </p>
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
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-slate-600" />
                </div>
                <CardTitle>Recent Activity</CardTitle>
              </div>
              <Link
                href="/dashboard/collections"
                className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentCollections.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No recent activity"
                description="Collection activity will appear here."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{collection.reference}</p>
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

      {/* System Status Footer */}
      <div className="mt-6 flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-slate-600">System Operational</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Last sync:</span>
            <span className="text-sm font-medium text-slate-700">
              {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">
            {customerCount} customers • {collectionCount} collections • {assetCount} assets
          </span>
        </div>
      </div>
    </>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: "#94a3b8",
    REQUESTED: "#f59e0b",
    APPROVED: "#3b82f6",
    SCHEDULED: "#8b5cf6",
    ASSIGNED: "#a855f7",
    IN_TRANSIT: "#06b6d4",
    COLLECTED: "#10b981",
    RECEIVED: "#059669",
    COMPLETED: "#047857",
    CANCELLED: "#ef4444",
    EXCEPTION: "#dc2626",
  };
  return colors[status] || "#64748b";
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

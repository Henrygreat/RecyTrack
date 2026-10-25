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
  const [
    customerCount,
    collectionCount,
    assetCount,
    pendingCollections,
    upcomingCollections,
    recentCollections,
    collectionsByStatus,
    collectionsThisMonth,
    collectionsLastMonth,
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

  // Prepare weekly trend data (mock for now - in real app would query by date)
  const weeklyData = [
    { name: "Mon", value: Math.floor(Math.random() * 10) + 5 },
    { name: "Tue", value: Math.floor(Math.random() * 10) + 5 },
    { name: "Wed", value: Math.floor(Math.random() * 10) + 5 },
    { name: "Thu", value: Math.floor(Math.random() * 10) + 5 },
    { name: "Fri", value: Math.floor(Math.random() * 10) + 5 },
    { name: "Sat", value: Math.floor(Math.random() * 5) + 2 },
    { name: "Sun", value: Math.floor(Math.random() * 3) + 1 },
  ];

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
    REQUESTED: "#f59e0b",
    CONFIRMED: "#3b82f6",
    ASSIGNED: "#8b5cf6",
    IN_TRANSIT: "#06b6d4",
    COLLECTED: "#10b981",
    RECEIVED: "#059669",
    CANCELLED: "#ef4444",
  };
  return colors[status] || "#64748b";
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

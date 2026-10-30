import Link from "next/link";
import {
  Warehouse,
  Plus,
  MapPin,
  Package,
  ChevronRight,
  CheckCircle,
  XCircle,
  LayoutGrid,
} from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function WarehousePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { organizationId, membership } = await requireMember();
  const params = await searchParams;

  const canManage = MANAGEMENT_ROLES.includes(membership.role);

  // Build filter conditions
  const where: Record<string, unknown> = { organizationId };
  if (params.status === "active") {
    where.isActive = true;
  } else if (params.status === "inactive") {
    where.isActive = false;
  }

  const [locations, metrics] = await Promise.all([
    prisma.warehouseLocation.findMany({
      where,
      include: {
        _count: { select: { assets: true } },
      },
      orderBy: [{ isActive: "desc" }, { code: "asc" }],
    }),
    prisma.warehouseLocation.aggregate({
      where: { organizationId },
      _count: { id: true },
    }),
  ]);

  const activeLocations = await prisma.warehouseLocation.count({
    where: { organizationId, isActive: true },
  });

  const totalAssets = await prisma.asset.count({
    where: { organizationId, warehouseLocationId: { not: null } },
  });

  const unassignedAssets = await prisma.asset.count({
    where: { organizationId, warehouseLocationId: null },
  });

  // Calculate capacity utilization (for locations with capacity set)
  const locationsWithCapacity = locations.filter((l) => l.capacity && l.capacity > 0);
  const totalCapacity = locationsWithCapacity.reduce((sum, l) => sum + (l.capacity || 0), 0);
  const totalUsed = locationsWithCapacity.reduce((sum, l) => sum + l._count.assets, 0);
  const utilizationPercent = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Warehouse Locations"
        description="Manage warehouse storage locations and asset placement"
        actions={
          canManage && (
            <Link
              href="/dashboard/warehouse/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Location
            </Link>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Locations"
          value={metrics._count.id}
          icon={Warehouse}
        />
        <MetricCard
          title="Active Locations"
          value={activeLocations}
          icon={CheckCircle}
        />
        <MetricCard
          title="Assets Assigned"
          value={totalAssets}
          icon={Package}
          subtitle={`${unassignedAssets} unassigned`}
        />
        <MetricCard
          title="Capacity Used"
          value={`${utilizationPercent}%`}
          icon={LayoutGrid}
          subtitle={totalCapacity > 0 ? `${totalUsed} / ${totalCapacity}` : "No capacity set"}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Link
          href="/dashboard/warehouse"
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            !params.status
              ? "bg-teal-100 text-teal-700"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </Link>
        <Link
          href="/dashboard/warehouse?status=active"
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            params.status === "active"
              ? "bg-teal-100 text-teal-700"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Active
        </Link>
        <Link
          href="/dashboard/warehouse?status=inactive"
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            params.status === "inactive"
              ? "bg-teal-100 text-teal-700"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Inactive
        </Link>
      </div>

      {/* Locations List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Locations</CardTitle>
            <Badge variant="secondary">{locations.length} locations</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {locations.length === 0 ? (
            <EmptyState
              icon={Warehouse}
              title="No warehouse locations"
              description={
                params.status
                  ? "No locations match your filter."
                  : "Create your first warehouse location to start organizing assets."
              }
              action={
                canManage && !params.status
                  ? { label: "Add Location", href: "/dashboard/warehouse/new" }
                  : undefined
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((location) => (
                <Link
                  key={location.id}
                  href={`/dashboard/warehouse/${location.id}`}
                  className="block p-4 border border-slate-200 rounded-lg hover:border-teal-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${
                          location.isActive ? "bg-teal-50" : "bg-slate-100"
                        }`}
                      >
                        <MapPin
                          className={`w-5 h-5 ${
                            location.isActive ? "text-teal-600" : "text-slate-400"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-semibold text-slate-900">
                          {location.code}
                        </p>
                        <p className="text-sm text-slate-600">{location.name}</p>
                      </div>
                    </div>
                    {location.isActive ? (
                      <Badge variant="secondary" className="bg-green-50 text-green-700">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-500">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  {location.locationType && (
                    <p className="text-xs text-slate-500 mb-2">{location.locationType}</p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Package className="w-4 h-4" />
                      <span>{location._count.assets} assets</span>
                    </div>
                    {location.capacity && (
                      <div className="text-slate-500">
                        {Math.round((location._count.assets / location.capacity) * 100)}% full
                      </div>
                    )}
                  </div>

                  {location.capacity && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            location._count.assets / location.capacity > 0.9
                              ? "bg-red-500"
                              : location._count.assets / location.capacity > 0.7
                                ? "bg-amber-500"
                                : "bg-teal-500"
                          }`}
                          style={{
                            width: `${Math.min((location._count.assets / location.capacity) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats by Type */}
      {locations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Locations by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(
                locations.reduce(
                  (acc, loc) => {
                    const type = loc.locationType || "Unspecified";
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>
                )
              )
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div
                    key={type}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg"
                  >
                    <Warehouse className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{type}</span>
                    <span className="text-sm font-medium text-slate-500">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

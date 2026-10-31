import Link from "next/link";
import {
  Package,
  Plus,
  Hash,
  Monitor,
  Laptop,
  Server,
  Smartphone,
  HardDrive,
  ChevronRight,
  Search,
  Filter,
} from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ASSET_STATUS_LABELS,
  ASSET_CATEGORY_LABELS,
  PHYSICAL_CONDITION_LABELS,
} from "@/lib/assets";
import type { AssetStatus, AssetCategory } from "@prisma/client";

// Status badge styling
const statusColors: Record<AssetStatus, string> = {
  EXPECTED: "bg-slate-100 text-slate-700",
  COLLECTED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-indigo-100 text-indigo-700",
  INSPECTION: "bg-purple-100 text-purple-700",
  QUARANTINED: "bg-red-100 text-red-700",
  DATA_ERASURE: "bg-orange-100 text-orange-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  READY: "bg-emerald-100 text-emerald-700",
  LISTED: "bg-teal-100 text-teal-700",
  SOLD: "bg-green-100 text-green-700",
  RECYCLED: "bg-cyan-100 text-cyan-700",
  DESTROYED: "bg-red-100 text-red-700",
  RETURNED: "bg-amber-100 text-amber-700",
  RELEASED: "bg-gray-100 text-gray-700",
};

// Category icons
function getCategoryIcon(category: AssetCategory) {
  switch (category) {
    case "LAPTOP":
      return <Laptop className="w-4 h-4" />;
    case "DESKTOP":
      return <Monitor className="w-4 h-4" />;
    case "SERVER":
      return <Server className="w-4 h-4" />;
    case "MOBILE_PHONE":
    case "TABLET":
      return <Smartphone className="w-4 h-4" />;
    case "STORAGE_DEVICE":
      return <HardDrive className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; search?: string }>;
}) {
  const { organizationId, membership } = await requireMember();
  const params = await searchParams;

  const canManage = MANAGEMENT_ROLES.includes(membership.role);

  // Build filter conditions
  const where: Record<string, unknown> = { organizationId };
  if (params.status && params.status !== "all") {
    where.status = params.status;
  }
  if (params.category && params.category !== "all") {
    where.category = params.category;
  }
  if (params.search) {
    where.OR = [
      { assetTag: { contains: params.search, mode: "insensitive" } },
      { serialNumber: { contains: params.search, mode: "insensitive" } },
      { manufacturer: { contains: params.search, mode: "insensitive" } },
      { model: { contains: params.search, mode: "insensitive" } },
      { customerAssetTag: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [assets, statusCounts, categoryDistribution] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        customer: { select: { name: true, reference: true } },
        collection: { select: { reference: true } },
        warehouseLocation: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.asset.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { status: true },
    }),
    prisma.asset.groupBy({
      by: ["category"],
      where: { organizationId },
      _count: { category: true },
    }),
  ]);

  // Calculate metrics
  const total = statusCounts.reduce((sum, s) => sum + s._count.status, 0);
  const inbound = statusCounts
    .filter((s) => ["EXPECTED", "COLLECTED"].includes(s.status))
    .reduce((sum, s) => sum + s._count.status, 0);
  const inProcessing = statusCounts
    .filter((s) => ["RECEIVED", "INSPECTION", "DATA_ERASURE", "PROCESSING"].includes(s.status))
    .reduce((sum, s) => sum + s._count.status, 0);
  const ready = statusCounts
    .filter((s) => ["READY", "LISTED"].includes(s.status))
    .reduce((sum, s) => sum + s._count.status, 0);

  return (
    <>
      <PageHeader
        title="Asset Inventory"
        description="Track and manage all IT assets"
        actions={
          canManage && (
            <Link
              href="/dashboard/assets/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Register Asset
            </Link>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Assets" value={total} icon={Package} />
        <MetricCard title="Inbound" value={inbound} icon={Package} subtitle="Expected & Collected" />
        <MetricCard title="Processing" value={inProcessing} icon={HardDrive} subtitle="In workflow" />
        <MetricCard title="Ready" value={ready} icon={Monitor} subtitle="Ready for disposition" />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <form className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="search"
                  placeholder="Asset tag, serial, make/model..."
                  defaultValue={params.search}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
              <select
                name="status"
                defaultValue={params.status || "all"}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Statuses</option>
                {Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Category</label>
              <select
                name="category"
                defaultValue={params.category || "all"}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Categories</option>
                {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Asset List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Assets</CardTitle>
            <Badge variant="secondary">{assets.length} records</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {assets.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No assets found"
              description={
                params.search || params.status || params.category
                  ? "Try adjusting your filters."
                  : "Register your first asset to get started."
              }
              action={
                canManage && !params.search
                  ? { label: "Register Asset", href: "/dashboard/assets/new" }
                  : undefined
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
                        Asset Tag
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Make / Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Serial Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/assets/${asset.id}`}
                          className="font-mono text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                        >
                          {asset.assetTag}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          {getCategoryIcon(asset.category)}
                          {ASSET_CATEGORY_LABELS[asset.category]}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {asset.manufacturer || asset.model ? (
                          <>
                            {asset.manufacturer && <span>{asset.manufacturer}</span>}
                            {asset.manufacturer && asset.model && <span> </span>}
                            {asset.model && <span className="text-slate-500">{asset.model}</span>}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600">
                        {asset.serialNumber || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {asset.customer ? (
                          <Link
                            href={`/dashboard/customers/${asset.customerId}`}
                            className="text-slate-900 hover:text-teal-600 transition-colors"
                          >
                            {asset.customer.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {asset.warehouseLocation ? (
                          <span>
                            {asset.warehouseLocation.name}
                            {asset.binLocation && (
                              <span className="text-slate-400"> / {asset.binLocation}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[asset.status]}`}
                        >
                          {ASSET_STATUS_LABELS[asset.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/assets/${asset.id}`}
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

      {/* Category Distribution */}
      {categoryDistribution.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {categoryDistribution
                .sort((a, b) => b._count.category - a._count.category)
                .map((c) => (
                  <Link
                    key={c.category}
                    href={`/dashboard/assets?category=${c.category}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {getCategoryIcon(c.category)}
                    <span className="text-sm text-slate-700">
                      {ASSET_CATEGORY_LABELS[c.category]}
                    </span>
                    <span className="text-sm font-medium text-slate-500">{c._count.category}</span>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Package,
  Edit,
  Trash2,
  Power,
  PowerOff,
  ChevronRight,
  Hash,
  Calendar,
  Info,
  Laptop,
  Monitor,
  Server,
  Smartphone,
  HardDrive,
} from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ASSET_STATUS_LABELS, ASSET_CATEGORY_LABELS } from "@/lib/assets";
import type { AssetStatus, AssetCategory } from "@prisma/client";
import { LocationActions } from "./components/location-actions";

// Status badge styling
const statusColors: Record<AssetStatus, string> = {
  EXPECTED: "bg-slate-100 text-slate-700",
  COLLECTED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-indigo-100 text-indigo-700",
  INSPECTION: "bg-purple-100 text-purple-700",
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

export default async function WarehouseLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId, membership } = await requireMember();

  const canManage = MANAGEMENT_ROLES.includes(membership.role);

  const location = await prisma.warehouseLocation.findFirst({
    where: { id, organizationId },
    include: {
      assets: {
        include: {
          customer: { select: { name: true, reference: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!location) {
    notFound();
  }

  // Group assets by status
  const assetsByStatus = location.assets.reduce(
    (acc, asset) => {
      acc[asset.status] = (acc[asset.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Group assets by category
  const assetsByCategory = location.assets.reduce(
    (acc, asset) => {
      acc[asset.category] = (acc[asset.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const utilizationPercent = location.capacity
    ? Math.round((location.assets.length / location.capacity) * 100)
    : null;

  return (
    <>
      <PageHeader
        title={location.name}
        description={`Location code: ${location.code}`}
        backHref="/dashboard/warehouse"
        actions={
          canManage && (
            <div className="flex gap-2">
              <Link
                href={`/dashboard/warehouse/${id}/edit`}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
              <LocationActions location={location} />
            </div>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Location Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-teal-600" />
                  Location Details
                </CardTitle>
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
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Code
                  </dt>
                  <dd className="mt-1 font-mono text-lg font-semibold text-slate-900">
                    {location.code}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Type
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {location.locationType || "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Capacity
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {location.capacity ? `${location.capacity} items` : "Unlimited"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Current Usage
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {location.assets.length} assets
                    {utilizationPercent !== null && (
                      <span className="text-slate-500"> ({utilizationPercent}%)</span>
                    )}
                  </dd>
                </div>
                {location.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Description
                    </dt>
                    <dd className="mt-1 text-slate-700">{location.description}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Created
                  </dt>
                  <dd className="mt-1 text-sm text-slate-600">
                    {formatDistanceToNow(location.createdAt, { addSuffix: true })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Last Updated
                  </dt>
                  <dd className="mt-1 text-sm text-slate-600">
                    {formatDistanceToNow(location.updatedAt, { addSuffix: true })}
                  </dd>
                </div>
              </dl>

              {/* Capacity Bar */}
              {location.capacity && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Capacity Usage</span>
                    <span className="text-sm text-slate-500">
                      {location.assets.length} / {location.capacity}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        utilizationPercent! > 90
                          ? "bg-red-500"
                          : utilizationPercent! > 70
                            ? "bg-amber-500"
                            : "bg-teal-500"
                      }`}
                      style={{ width: `${Math.min(utilizationPercent!, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assets List */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Assigned Assets</CardTitle>
                <Badge variant="secondary">{location.assets.length} assets</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {location.assets.length === 0 ? (
                <div className="py-8 text-center">
                  <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No assets assigned to this location</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Assign assets from the asset detail page
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                          Asset Tag
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                          Bin
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {location.assets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3">
                            <Link
                              href={`/dashboard/assets/${asset.id}`}
                              className="font-mono text-sm font-medium text-teal-600 hover:text-teal-700"
                            >
                              {asset.assetTag}
                            </Link>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              {getCategoryIcon(asset.category)}
                              {ASSET_CATEGORY_LABELS[asset.category]}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600">
                            {asset.binLocation || "—"}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600">
                            {asset.customer?.name || "—"}
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[asset.status]}`}
                            >
                              {ASSET_STATUS_LABELS[asset.status]}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <Link
                              href={`/dashboard/assets/${asset.id}`}
                              className="text-slate-400 hover:text-teal-600"
                            >
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assets by Status */}
          {Object.keys(assetsByStatus).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assets by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(assetsByStatus)
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status as AssetStatus]}`}
                        >
                          {ASSET_STATUS_LABELS[status as AssetStatus]}
                        </span>
                        <span className="text-sm font-medium text-slate-700">{count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assets by Category */}
          {Object.keys(assetsByCategory).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assets by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(assetsByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          {getCategoryIcon(category as AssetCategory)}
                          {ASSET_CATEGORY_LABELS[category as AssetCategory]}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4" />
                Quick Info
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <p>
                Assets can be assigned to this location from the individual asset detail pages.
              </p>
              <p>
                Use bin locations for sub-divisions within this location (e.g., shelf numbers).
              </p>
              {!location.isActive && (
                <p className="text-amber-600">
                  This location is inactive and cannot receive new asset assignments.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

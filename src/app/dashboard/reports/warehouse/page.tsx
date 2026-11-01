"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Warehouse,
  MapPin,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  getWarehouseOccupancy,
  getStocktakeSummaries,
  type WarehouseOccupancy,
  type StocktakeSummary,
} from "../actions";

// ============================================
// OCCUPANCY CARD
// ============================================

function OccupancyCard({ location }: { location: WarehouseOccupancy }) {
  const occupancyRate = location.occupancyRate;
  const hasCapacity = location.capacity !== null;

  let colorClass = "border-gray-200 bg-gray-50";
  let barColor = "bg-gray-400";

  if (hasCapacity && occupancyRate !== null) {
    if (occupancyRate >= 90) {
      colorClass = "border-red-200 bg-red-50";
      barColor = "bg-red-500";
    } else if (occupancyRate >= 70) {
      colorClass = "border-yellow-200 bg-yellow-50";
      barColor = "bg-yellow-500";
    } else {
      colorClass = "border-green-200 bg-green-50";
      barColor = "bg-green-500";
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-600" />
            <span className="font-mono font-bold text-gray-900">{location.locationCode}</span>
          </div>
          <div className="mt-1 text-sm text-gray-600">{location.locationName}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">{location.assetCount}</div>
          <div className="text-xs text-gray-500">
            {hasCapacity ? `of ${location.capacity}` : "assets"}
          </div>
        </div>
      </div>
      {hasCapacity && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full ${barColor}`}
              style={{ width: `${Math.min(occupancyRate || 0, 100)}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {occupancyRate?.toFixed(0)}% occupied
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// STOCKTAKE TABLE
// ============================================

function StocktakeTable({ summaries }: { summaries: StocktakeSummary[] }) {
  const statusColors: Record<string, string> = {
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    PAUSED: "bg-yellow-100 text-yellow-800",
    PENDING_REVIEW: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Reference
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Expected
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Found
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Missing
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Unexpected
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Accuracy
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {summaries.map((summary) => (
            <tr key={summary.sessionId} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-mono font-medium text-gray-900">
                {summary.reference}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{summary.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[summary.status] || "bg-gray-100 text-gray-800"}`}
                >
                  {summary.status.replace("_", " ")}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                {summary.expectedCount}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-green-600">
                {summary.foundCount}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-red-600">
                {summary.missingCount}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-yellow-600">
                {summary.unexpectedCount}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                <span
                  className={`font-medium ${summary.accuracy >= 95 ? "text-green-600" : summary.accuracy >= 80 ? "text-yellow-600" : "text-red-600"}`}
                >
                  {summary.accuracy.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function WarehouseIntelligencePage() {
  const [locations, setLocations] = useState<WarehouseOccupancy[]>([]);
  const [stocktakes, setStocktakes] = useState<StocktakeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locationsResult, stocktakesResult] = await Promise.all([
        getWarehouseOccupancy(),
        getStocktakeSummaries(),
      ]);

      if (locationsResult.success && locationsResult.locations) {
        setLocations(locationsResult.locations);
      }
      if (stocktakesResult.success && stocktakesResult.summaries) {
        setStocktakes(stocktakesResult.summaries);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate summary stats
  const totalAssets = locations.reduce((sum, l) => sum + l.assetCount, 0);
  const totalCapacity = locations.reduce((sum, l) => sum + (l.capacity || 0), 0);
  const locationsWithCapacity = locations.filter((l) => l.capacity !== null);
  const avgOccupancy =
    locationsWithCapacity.length > 0
      ? locationsWithCapacity.reduce((sum, l) => sum + (l.occupancyRate || 0), 0) /
        locationsWithCapacity.length
      : 0;
  const highOccupancy = locations.filter(
    (l) => l.occupancyRate !== null && l.occupancyRate >= 90
  ).length;
  const emptyLocations = locations.filter((l) => l.assetCount === 0).length;

  // Stocktake stats
  const completedStocktakes = stocktakes.filter((s) => s.status === "COMPLETED");
  const avgAccuracy =
    completedStocktakes.length > 0
      ? completedStocktakes.reduce((sum, s) => sum + s.accuracy, 0) / completedStocktakes.length
      : 0;
  const totalMissing = stocktakes.reduce((sum, s) => sum + s.missingCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/reports"
            className="rounded-lg p-2 hover:bg-gray-100"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warehouse Intelligence</h1>
            <p className="text-sm text-gray-500">Location occupancy and stocktake analysis</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Total Assets Stored</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{totalAssets.toLocaleString()}</div>
          <div className="mt-1 text-xs text-blue-600">
            {totalCapacity > 0 ? `Capacity: ${totalCapacity.toLocaleString()}` : "No capacity set"}
          </div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Avg Occupancy</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-green-900">{avgOccupancy.toFixed(0)}%</div>
          <div className="mt-1 text-xs text-green-600">
            {locationsWithCapacity.length} locations tracked
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">High Occupancy</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-red-900">{highOccupancy}</div>
          <div className="mt-1 text-xs text-red-600">Locations at 90%+ capacity</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Empty Locations</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{emptyLocations}</div>
          <div className="mt-1 text-xs text-gray-600">Available for use</div>
        </div>
      </div>

      {/* Location Occupancy Grid */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Location Occupancy</h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span className="text-gray-600">&lt;70%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-yellow-500" />
              <span className="text-gray-600">70-89%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-red-500" />
              <span className="text-gray-600">&gt;90%</span>
            </div>
          </div>
        </div>
        {locations.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {locations.map((location) => (
              <OccupancyCard key={location.locationId} location={location} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">No warehouse locations configured</div>
        )}
      </div>

      {/* Stocktake Summary */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Stocktake History</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">
                  Avg Accuracy: <span className="font-medium">{avgAccuracy.toFixed(1)}%</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-gray-600">
                  Total Missing: <span className="font-medium">{totalMissing}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        {stocktakes.length > 0 ? (
          <StocktakeTable summaries={stocktakes} />
        ) : (
          <div className="py-8 text-center text-gray-500">No stocktake sessions recorded</div>
        )}
      </div>
    </div>
  );
}

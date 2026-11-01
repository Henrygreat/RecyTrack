"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  Filter,
} from "lucide-react";
import {
  getAssetTrends,
  getCategoryDistribution,
  getStatusDistribution,
  type AssetTrend,
  type CategoryDistribution,
  type StatusDistribution,
} from "../actions";

// ============================================
// TREND TABLE COMPONENT
// ============================================

function TrendTable({ trends }: { trends: AssetTrend[] }) {
  // Show last 30 days, most recent first
  const displayTrends = [...trends].reverse().slice(0, 30);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Date
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Received
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Processed
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Released
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Net Change
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {displayTrends.map((trend, index) => {
            const netChange = trend.received - trend.released;
            return (
              <tr key={index} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {new Date(trend.date).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-blue-600">
                  {trend.received}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-purple-600">
                  {trend.processed}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-green-600">
                  {trend.released}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                  <span
                    className={`inline-flex items-center gap-1 ${netChange > 0 ? "text-blue-600" : netChange < 0 ? "text-red-600" : "text-gray-500"}`}
                  >
                    {netChange > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : netChange < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : null}
                    {netChange > 0 ? "+" : ""}
                    {netChange}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// CATEGORY TABLE
// ============================================

function CategoryTable({ categories }: { categories: CategoryDistribution[] }) {
  const total = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Category
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Count
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Distribution
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Percentage
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {categories.map((cat, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                {cat.category}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                {cat.count.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-full rounded-full bg-gray-200">
                  <div
                    className="h-4 rounded-full bg-blue-500"
                    style={{ width: `${(cat.count / total) * 100}%` }}
                  />
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">
                {cat.percentage.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td className="px-4 py-3 text-sm font-semibold text-gray-900">Total</td>
            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
              {total.toLocaleString()}
            </td>
            <td></td>
            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ============================================
// STATUS TABLE
// ============================================

function StatusTable({ statuses }: { statuses: StatusDistribution[] }) {
  const statusLabels: Record<string, string> = {
    RECEIVED: "Received / Awaiting Inspection",
    INSPECTION: "In Inspection",
    QUARANTINED: "Quarantined",
    PROCESSING: "Processing",
    READY: "Ready for Release",
    RELEASED: "Released",
  };

  const statusColors: Record<string, string> = {
    RECEIVED: "bg-yellow-100 text-yellow-800",
    INSPECTION: "bg-blue-100 text-blue-800",
    QUARANTINED: "bg-red-100 text-red-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    READY: "bg-green-100 text-green-800",
    RELEASED: "bg-gray-100 text-gray-800",
  };

  const total = statuses.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statuses.map((status) => (
        <div
          key={status.status}
          className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[status.status] || "bg-gray-100 text-gray-800"}`}
            >
              {status.status}
            </span>
            <span className="text-2xl font-bold text-gray-900">{status.count}</span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {statusLabels[status.status] || status.status}
          </div>
          <div className="mt-2">
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${(status.count / total) * 100}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {status.percentage.toFixed(1)}% of total
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function AssetAnalyticsPage() {
  const [trends, setTrends] = useState<AssetTrend[]>([]);
  const [categories, setCategories] = useState<CategoryDistribution[]>([]);
  const [statuses, setStatuses] = useState<StatusDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  const loadData = async () => {
    setLoading(true);
    try {
      const [trendsResult, categoriesResult, statusesResult] = await Promise.all([
        getAssetTrends(dateRange),
        getCategoryDistribution(),
        getStatusDistribution(),
      ]);

      if (trendsResult.success && trendsResult.trends) {
        setTrends(trendsResult.trends);
      }
      if (categoriesResult.success && categoriesResult.distribution) {
        setCategories(categoriesResult.distribution);
      }
      if (statusesResult.success && statusesResult.distribution) {
        setStatuses(statusesResult.distribution);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Calculate summary stats
  const totalReceived = trends.reduce((sum, t) => sum + t.received, 0);
  const totalProcessed = trends.reduce((sum, t) => sum + t.processed, 0);
  const totalReleased = trends.reduce((sum, t) => sum + t.released, 0);
  const avgDailyReceived = trends.length > 0 ? totalReceived / trends.length : 0;

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
            <h1 className="text-2xl font-bold text-gray-900">Asset Processing Analytics</h1>
            <p className="text-sm text-gray-500">Detailed asset flow and distribution analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="border-none bg-transparent text-sm focus:ring-0"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Total Received</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{totalReceived}</div>
          <div className="mt-1 text-xs text-blue-600">
            Avg {avgDailyReceived.toFixed(1)}/day
          </div>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Total Processed</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-900">{totalProcessed}</div>
          <div className="mt-1 text-xs text-purple-600">
            {totalReceived > 0 ? ((totalProcessed / totalReceived) * 100).toFixed(0) : 0}%
            processing rate
          </div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Total Released</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-green-900">{totalReleased}</div>
          <div className="mt-1 text-xs text-green-600">
            {totalReceived > 0 ? ((totalReleased / totalReceived) * 100).toFixed(0) : 0}%
            throughput
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Net Change</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {totalReceived - totalReleased > 0 ? "+" : ""}
            {totalReceived - totalReleased}
          </div>
          <div className="mt-1 text-xs text-gray-600">In the period</div>
        </div>
      </div>

      {/* Daily Trends Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Daily Processing Trends</h2>
        </div>
        <TrendTable trends={trends} />
      </div>

      {/* Status Distribution */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Current Status Distribution</h2>
        <StatusTable statuses={statuses} />
      </div>

      {/* Category Distribution */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Category Distribution</h2>
        </div>
        <CategoryTable categories={categories} />
      </div>
    </div>
  );
}

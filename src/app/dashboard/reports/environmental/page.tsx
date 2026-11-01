"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Leaf,
  Recycle,
  Scale,
  TrendingUp,
  Download,
} from "lucide-react";
import { getEnvironmentalMetrics, type EnvironmentalMetrics } from "../actions";

// ============================================
// DONUT CHART
// ============================================

function DonutChart({
  reuseRate,
  recycleRate,
}: {
  reuseRate: number;
  recycleRate: number;
}) {
  const otherRate = Math.max(0, 100 - reuseRate - recycleRate);

  // Create conic gradient
  const gradient = `conic-gradient(
    #10B981 0deg ${(reuseRate / 100) * 360}deg,
    #3B82F6 ${(reuseRate / 100) * 360}deg ${((reuseRate + recycleRate) / 100) * 360}deg,
    #9CA3AF ${((reuseRate + recycleRate) / 100) * 360}deg 360deg
  )`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div
          className="h-48 w-48 rounded-full"
          style={{ background: gradient }}
        />
        <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {(reuseRate + recycleRate).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-500">Diverted</div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-sm text-gray-700">Reuse ({reuseRate.toFixed(1)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-700">Recycle ({recycleRate.toFixed(1)}%)</span>
        </div>
        {otherRate > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-400" />
            <span className="text-sm text-gray-700">Other ({otherRate.toFixed(1)}%)</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MONTHLY TREND CHART
// ============================================

function MonthlyTrendChart({
  trends,
}: {
  trends: { month: string; reuse: number; recycle: number }[];
}) {
  const maxValue = Math.max(
    ...trends.map((t) => Math.max(t.reuse, t.recycle)),
    1
  );

  return (
    <div className="flex h-64 items-end gap-2">
      {trends.map((trend, index) => {
        const reuseHeight = (trend.reuse / maxValue) * 100;
        const recycleHeight = (trend.recycle / maxValue) * 100;
        const monthLabel = new Date(trend.month + "-01").toLocaleDateString("en-US", {
          month: "short",
        });

        return (
          <div key={index} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end gap-1" style={{ height: "200px" }}>
              <div
                className="flex-1 rounded-t bg-green-500 transition-all"
                style={{ height: `${reuseHeight}%` }}
                title={`Reuse: ${trend.reuse.toFixed(1)} kg`}
              />
              <div
                className="flex-1 rounded-t bg-blue-500 transition-all"
                style={{ height: `${recycleHeight}%` }}
                title={`Recycle: ${trend.recycle.toFixed(1)} kg`}
              />
            </div>
            <span className="text-xs text-gray-500">{monthLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// DISPOSITION TABLE
// ============================================

function DispositionTable({
  dispositions,
}: {
  dispositions: { disposition: string; count: number; weight: number }[];
}) {
  const totalCount = dispositions.reduce((sum, d) => sum + d.count, 0);
  const totalWeight = dispositions.reduce((sum, d) => sum + d.weight, 0);

  const dispositionLabels: Record<string, string> = {
    REUSE: "Reuse (Direct)",
    RESALE: "Resale",
    RECYCLE: "Recycling",
    SCRAP: "Scrap/Disposal",
    DONATE: "Donation",
    UNKNOWN: "Pending Classification",
  };

  const dispositionColors: Record<string, string> = {
    REUSE: "bg-green-100 text-green-800",
    RESALE: "bg-emerald-100 text-emerald-800",
    RECYCLE: "bg-blue-100 text-blue-800",
    SCRAP: "bg-red-100 text-red-800",
    DONATE: "bg-purple-100 text-purple-800",
    UNKNOWN: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Disposition
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Assets
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Weight (kg)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Distribution
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {dispositions.map((d) => (
            <tr key={d.disposition} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${dispositionColors[d.disposition] || "bg-gray-100 text-gray-800"}`}
                >
                  {dispositionLabels[d.disposition] || d.disposition}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                {d.count.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                {d.weight.toFixed(1)}
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-full max-w-xs rounded-full bg-gray-100">
                  <div
                    className={`h-4 rounded-full ${d.disposition === "REUSE" || d.disposition === "RESALE" ? "bg-green-500" : d.disposition === "RECYCLE" ? "bg-blue-500" : "bg-gray-400"}`}
                    style={{
                      width: `${totalWeight > 0 ? (d.weight / totalWeight) * 100 : 0}%`,
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td className="px-4 py-3 text-sm font-semibold text-gray-900">Total</td>
            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
              {totalCount.toLocaleString()}
            </td>
            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
              {totalWeight.toFixed(1)}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function EnvironmentalReportsPage() {
  const [metrics, setMetrics] = useState<EnvironmentalMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getEnvironmentalMetrics();
      if (result.success && result.metrics) {
        setMetrics(result.metrics);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasData = metrics && metrics.totalWeightKg > 0;

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
            <h1 className="text-2xl font-bold text-gray-900">Environmental Reports</h1>
            <p className="text-sm text-gray-500">Recycling rates and environmental impact</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <a
            href="/dashboard/reports/export?type=environmental"
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            Export Report
          </a>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : !hasData ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center">
          <Leaf className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-4 text-lg font-semibold text-yellow-800">
            No Environmental Data Available
          </h2>
          <p className="mt-2 text-sm text-yellow-700">
            Environmental metrics will appear once assets have been released with disposition and
            weight data recorded.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Total Weight Processed</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-green-900">
                {(metrics?.totalWeightKg || 0).toFixed(0)} kg
              </div>
              <div className="mt-1 text-xs text-green-600">
                {((metrics?.totalWeightKg || 0) / 1000).toFixed(2)} tonnes
              </div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">Reuse Weight</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-900">
                {(metrics?.reuseWeightKg || 0).toFixed(0)} kg
              </div>
              <div className="mt-1 text-xs text-emerald-600">
                {(metrics?.reuseRate || 0).toFixed(1)}% of total
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2">
                <Recycle className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Recycle Weight</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-blue-900">
                {(metrics?.recycleWeightKg || 0).toFixed(0)} kg
              </div>
              <div className="mt-1 text-xs text-blue-600">
                {(metrics?.recycleRate || 0).toFixed(1)}% of total
              </div>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Diversion Rate</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-purple-900">
                {((metrics?.reuseRate || 0) + (metrics?.recycleRate || 0)).toFixed(1)}%
              </div>
              <div className="mt-1 text-xs text-purple-600">Materials diverted from landfill</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Diversion Donut Chart */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 font-semibold text-gray-900">Material Diversion</h2>
              <DonutChart
                reuseRate={metrics?.reuseRate || 0}
                recycleRate={metrics?.recycleRate || 0}
              />
            </div>

            {/* Monthly Trends */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Monthly Trends (Last 6 Months)</h2>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-green-500" />
                    <span className="text-gray-600">Reuse</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-blue-500" />
                    <span className="text-gray-600">Recycle</span>
                  </div>
                </div>
              </div>
              {metrics?.monthlyTrends && metrics.monthlyTrends.length > 0 ? (
                <MonthlyTrendChart trends={metrics.monthlyTrends} />
              ) : (
                <div className="flex h-64 items-center justify-center text-gray-500">
                  No monthly data available
                </div>
              )}
            </div>
          </div>

          {/* Disposition Table */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="font-semibold text-gray-900">Disposition Breakdown</h2>
            </div>
            <DispositionTable dispositions={metrics?.assetsByDisposition || []} />
          </div>
        </>
      )}
    </div>
  );
}

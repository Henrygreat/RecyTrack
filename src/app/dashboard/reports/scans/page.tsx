"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  ScanLine,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { getScanAnalytics, type ScanAnalytics } from "../actions";

// ============================================
// SCAN TYPE CHART
// ============================================

function ScanTypeChart({ data }: { data: { type: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const typeLabels: Record<string, string> = {
    LOOKUP: "Asset Lookup",
    RECEIVE: "Receive Asset",
    TRANSFER: "Transfer",
    INSPECT: "Inspection",
    STOCKTAKE: "Stocktake",
    LABEL_PRINT: "Label Print",
    STATUS_UPDATE: "Status Update",
    BULK_OPERATION: "Bulk Operation",
  };

  const typeColors: Record<string, string> = {
    LOOKUP: "bg-blue-500",
    RECEIVE: "bg-green-500",
    TRANSFER: "bg-purple-500",
    INSPECT: "bg-yellow-500",
    STOCKTAKE: "bg-orange-500",
    LABEL_PRINT: "bg-gray-500",
    STATUS_UPDATE: "bg-cyan-500",
    BULK_OPERATION: "bg-pink-500",
  };

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.type} className="flex items-center gap-4">
          <div className="w-28 truncate text-sm text-gray-700">
            {typeLabels[item.type] || item.type}
          </div>
          <div className="flex-1">
            <div className="h-6 rounded-full bg-gray-100">
              <div
                className={`h-6 rounded-full ${typeColors[item.type] || "bg-gray-400"} flex items-center justify-end pr-2`}
                style={{ width: `${(item.count / maxCount) * 100}%`, minWidth: "40px" }}
              >
                <span className="text-xs font-medium text-white">{item.count}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// OPERATOR TABLE
// ============================================

function OperatorTable({ data }: { data: { operatorName: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Operator
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Scans
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Distribution
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.map((operator, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                {operator.operatorName}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                {operator.count.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-full max-w-xs rounded-full bg-gray-100">
                  <div
                    className="h-4 rounded-full bg-blue-500"
                    style={{ width: `${total > 0 ? (operator.count / total) * 100 : 0}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// DAILY SCAN CHART
// ============================================

function DailyScanChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const displayData = data.slice(-14); // Last 14 days

  return (
    <div className="flex h-48 items-end gap-1">
      {displayData.map((item, index) => {
        const height = (item.count / maxCount) * 100;
        const dayLabel = new Date(item.date).toLocaleDateString("en-US", { weekday: "short" });

        return (
          <div key={index} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end justify-center" style={{ height: "160px" }}>
              <div
                className="w-full max-w-8 rounded-t bg-blue-500 transition-all hover:bg-blue-600"
                style={{ height: `${height}%`, minHeight: item.count > 0 ? "4px" : "0" }}
                title={`${item.date}: ${item.count} scans`}
              />
            </div>
            <span className="text-[10px] text-gray-500">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function ScanAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ScanAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getScanAnalytics(dateRange);
      if (result.success && result.analytics) {
        setAnalytics(result.analytics);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const hasData = analytics && analytics.totalScans > 0;

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
            <h1 className="text-2xl font-bold text-gray-900">Scan Mode Analytics</h1>
            <p className="text-sm text-gray-500">Scanning activity and operator performance</p>
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

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : !hasData ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center">
          <ScanLine className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-4 text-lg font-semibold text-yellow-800">No Scan Data Available</h2>
          <p className="mt-2 text-sm text-yellow-700">
            Scan analytics will appear once scanning operations are performed using the Scan Mode
            features.
          </p>
          <Link
            href="/dashboard/scan"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
          >
            <ScanLine className="h-4 w-4" />
            Go to Scan Mode
          </Link>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2">
                <ScanLine className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Total Scans</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-blue-900">
                {analytics?.totalScans.toLocaleString() || 0}
              </div>
              <div className="mt-1 text-xs text-blue-600">In the selected period</div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Successful</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-green-900">
                {analytics?.successfulScans.toLocaleString() || 0}
              </div>
              <div className="mt-1 text-xs text-green-600">
                {analytics?.successRate.toFixed(1) || 0}% success rate
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-800">Failed</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-red-900">
                {analytics?.failedScans.toLocaleString() || 0}
              </div>
              <div className="mt-1 text-xs text-red-600">
                {(100 - (analytics?.successRate || 0)).toFixed(1)}% failure rate
              </div>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Daily Average</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-purple-900">
                {analytics && analytics.scansByDate.length > 0
                  ? Math.round(analytics.totalScans / analytics.scansByDate.length)
                  : 0}
              </div>
              <div className="mt-1 text-xs text-purple-600">Scans per day</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Scans by Type */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gray-500" />
                <h2 className="font-semibold text-gray-900">Scans by Type</h2>
              </div>
              {analytics && analytics.scansByType.length > 0 ? (
                <ScanTypeChart data={analytics.scansByType} />
              ) : (
                <div className="flex h-32 items-center justify-center text-gray-500">
                  No type data available
                </div>
              )}
            </div>

            {/* Daily Trends */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <h2 className="font-semibold text-gray-900">Daily Scan Volume</h2>
              </div>
              {analytics && analytics.scansByDate.length > 0 ? (
                <DailyScanChart data={analytics.scansByDate} />
              ) : (
                <div className="flex h-48 items-center justify-center text-gray-500">
                  No daily data available
                </div>
              )}
            </div>
          </div>

          {/* Operator Performance */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
              <Users className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Operator Performance</h2>
            </div>
            {analytics && analytics.scansByOperator.length > 0 ? (
              <OperatorTable data={analytics.scansByOperator} />
            ) : (
              <div className="py-8 text-center text-gray-500">No operator data available</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

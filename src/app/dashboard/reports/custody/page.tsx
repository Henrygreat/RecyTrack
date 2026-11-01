"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Calendar,
} from "lucide-react";
import { getCustodyReport, type CustodyReport } from "../actions";

// ============================================
// HANDOVER TIMELINE
// ============================================

function HandoverTimeline({
  handovers,
}: {
  handovers: CustodyReport["recentHandovers"];
}) {
  const eventTypeLabels: Record<string, string> = {
    RECEIVED: "Received",
    TRANSFERRED: "Transferred",
    INSPECTED: "Inspected",
    QUARANTINED: "Quarantined",
    RELEASED: "Released",
    ASSIGNED: "Assigned",
  };

  const eventTypeColors: Record<string, string> = {
    RECEIVED: "bg-blue-500",
    TRANSFERRED: "bg-purple-500",
    INSPECTED: "bg-green-500",
    QUARANTINED: "bg-red-500",
    RELEASED: "bg-gray-500",
    ASSIGNED: "bg-yellow-500",
  };

  return (
    <div className="space-y-4">
      {handovers.map((handover, index) => (
        <div key={index} className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 rounded-full ${eventTypeColors[handover.eventType] || "bg-gray-400"}`}
            />
            {index < handovers.length - 1 && (
              <div className="h-full w-0.5 bg-gray-200" style={{ minHeight: "40px" }} />
            )}
          </div>
          <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-gray-900">
                  {handover.assetTag}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    eventTypeColors[handover.eventType]
                      ? eventTypeColors[handover.eventType].replace("bg-", "bg-opacity-20 text-").replace("-500", "-700")
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {eventTypeLabels[handover.eventType] || handover.eventType}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(handover.timestamp).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              {handover.fromName && (
                <>
                  <span>{handover.fromName}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </>
              )}
              <span className="font-medium">{handover.toName || "System"}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// EXCEPTION CHART
// ============================================

function ExceptionChart({ exceptions }: { exceptions: { type: string; count: number }[] }) {
  const total = exceptions.reduce((sum, e) => sum + e.count, 0);
  const maxCount = Math.max(...exceptions.map((e) => e.count), 1);

  const typeLabels: Record<string, string> = {
    MISSING_SIGNATURE: "Missing Signature",
    UNAUTHORIZED_ACCESS: "Unauthorized Access",
    CONDITION_MISMATCH: "Condition Mismatch",
    LOCATION_DISCREPANCY: "Location Discrepancy",
    TIMESTAMP_ANOMALY: "Timestamp Anomaly",
    CHAIN_BREAK: "Chain Break",
  };

  const typeColors: Record<string, string> = {
    MISSING_SIGNATURE: "bg-yellow-500",
    UNAUTHORIZED_ACCESS: "bg-red-500",
    CONDITION_MISMATCH: "bg-orange-500",
    LOCATION_DISCREPANCY: "bg-purple-500",
    TIMESTAMP_ANOMALY: "bg-blue-500",
    CHAIN_BREAK: "bg-red-700",
  };

  if (exceptions.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-gray-500">
        <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
        No exceptions recorded
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exceptions.map((exception) => (
        <div key={exception.type} className="flex items-center gap-4">
          <div className="w-32 truncate text-sm text-gray-700">
            {typeLabels[exception.type] || exception.type}
          </div>
          <div className="flex-1">
            <div className="h-6 rounded-full bg-gray-100">
              <div
                className={`h-6 rounded-full ${typeColors[exception.type] || "bg-gray-400"} flex items-center justify-end pr-2`}
                style={{ width: `${(exception.count / maxCount) * 100}%` }}
              >
                <span className="text-xs font-medium text-white">{exception.count}</span>
              </div>
            </div>
          </div>
          <div className="w-16 text-right text-sm text-gray-500">
            {total > 0 ? ((exception.count / total) * 100).toFixed(0) : 0}%
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function CustodyReportsPage() {
  const [report, setReport] = useState<CustodyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getCustodyReport(dateRange);
      if (result.success && result.report) {
        setReport(result.report);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const exceptionRate =
    report && report.totalHandovers > 0
      ? (report.totalExceptions / report.totalHandovers) * 100
      : 0;

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
            <h1 className="text-2xl font-bold text-gray-900">Chain of Custody Reports</h1>
            <p className="text-sm text-gray-500">Asset handover tracking and exception analysis</p>
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
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Total Handovers</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-blue-900">
                {report?.totalHandovers || 0}
              </div>
              <div className="mt-1 text-xs text-blue-600">In the selected period</div>
            </div>
            <div
              className={`rounded-lg border p-4 ${report && report.totalExceptions > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-5 w-5 ${report && report.totalExceptions > 0 ? "text-red-600" : "text-green-600"}`}
                />
                <span
                  className={`text-sm font-medium ${report && report.totalExceptions > 0 ? "text-red-800" : "text-green-800"}`}
                >
                  Exceptions
                </span>
              </div>
              <div
                className={`mt-2 text-2xl font-bold ${report && report.totalExceptions > 0 ? "text-red-900" : "text-green-900"}`}
              >
                {report?.totalExceptions || 0}
              </div>
              <div
                className={`mt-1 text-xs ${report && report.totalExceptions > 0 ? "text-red-600" : "text-green-600"}`}
              >
                {exceptionRate.toFixed(1)}% exception rate
              </div>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Avg Handover Time</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-purple-900">
                {report?.averageHandoverTime !== null
                  ? `${report?.averageHandoverTime}m`
                  : "N/A"}
              </div>
              <div className="mt-1 text-xs text-purple-600">Average processing time</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-800">Compliance Rate</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {(100 - exceptionRate).toFixed(1)}%
              </div>
              <div className="mt-1 text-xs text-gray-600">Handovers without exceptions</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Exception Analysis */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 font-semibold text-gray-900">Exception Analysis</h2>
              <ExceptionChart exceptions={report?.exceptionsByType || []} />
            </div>

            {/* Recent Handovers */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 font-semibold text-gray-900">Recent Handovers</h2>
              {report && report.recentHandovers.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <HandoverTimeline handovers={report.recentHandovers} />
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-gray-500">
                  No handovers recorded
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

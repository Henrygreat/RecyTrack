"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Truck,
  Users,
  Warehouse,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Scale,
  Clipboard,
} from "lucide-react";
import {
  getDashboardMetrics,
  getAssetTrends,
  getCategoryDistribution,
  getStatusDistribution,
  type DashboardMetrics,
  type AssetTrend,
  type CategoryDistribution,
  type StatusDistribution,
} from "./actions";

// ============================================
// STAT CARD COMPONENT
// ============================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "gray";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    red: "bg-red-50 text-red-600 border-red-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  };

  const iconColorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    red: "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-600",
    gray: "bg-gray-100 text-gray-600",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {subtitle && <p className="mt-1 text-xs opacity-70">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3" />
              <span>
                {trend.value > 0 ? "+" : ""}
                {trend.value}% {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={`rounded-lg p-2 ${iconColorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// SIMPLE BAR CHART
// ============================================

function SimpleBarChart({ data, maxValue }: { data: AssetTrend[]; maxValue: number }) {
  // Show last 14 days for cleaner display
  const displayData = data.slice(-14);

  return (
    <div className="flex h-48 items-end gap-1">
      {displayData.map((item, index) => {
        const receivedHeight = maxValue > 0 ? (item.received / maxValue) * 100 : 0;
        const processedHeight = maxValue > 0 ? (item.processed / maxValue) * 100 : 0;
        const dayLabel = new Date(item.date).toLocaleDateString("en-US", { weekday: "short" });

        return (
          <div key={index} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end gap-0.5" style={{ height: "160px" }}>
              <div
                className="flex-1 rounded-t bg-blue-500 transition-all"
                style={{ height: `${receivedHeight}%` }}
                title={`Received: ${item.received}`}
              />
              <div
                className="flex-1 rounded-t bg-green-500 transition-all"
                style={{ height: `${processedHeight}%` }}
                title={`Processed: ${item.processed}`}
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
// PIE CHART (Simple CSS)
// ============================================

function SimplePieChart({
  data,
  colors,
}: {
  data: { label: string; value: number; percentage: number }[];
  colors: string[];
}) {
  // Create conic gradient
  let gradientParts: string[] = [];
  let currentAngle = 0;

  data.forEach((item, index) => {
    const angle = (item.percentage / 100) * 360;
    gradientParts.push(
      `${colors[index % colors.length]} ${currentAngle}deg ${currentAngle + angle}deg`
    );
    currentAngle += angle;
  });

  const gradient = `conic-gradient(${gradientParts.join(", ")})`;

  return (
    <div className="flex items-center gap-4">
      <div
        className="h-32 w-32 rounded-full"
        style={{ background: gradient }}
        title={data.map((d) => `${d.label}: ${d.percentage.toFixed(1)}%`).join("\n")}
      />
      <div className="flex flex-col gap-1">
        {data.slice(0, 6).map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="h-3 w-3 rounded"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-gray-700">{item.label}</span>
            <span className="text-gray-500">({item.percentage.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export default function ReportsDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trends, setTrends] = useState<AssetTrend[]>([]);
  const [categories, setCategories] = useState<CategoryDistribution[]>([]);
  const [statuses, setStatuses] = useState<StatusDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [metricsResult, trendsResult, categoriesResult, statusesResult] = await Promise.all([
        getDashboardMetrics(),
        getAssetTrends(30),
        getCategoryDistribution(),
        getStatusDistribution(),
      ]);

      if (metricsResult.success && metricsResult.metrics) {
        setMetrics(metricsResult.metrics);
      }
      if (trendsResult.success && trendsResult.trends) {
        setTrends(trendsResult.trends);
      }
      if (categoriesResult.success && categoriesResult.distribution) {
        setCategories(categoriesResult.distribution);
      }
      if (statusesResult.success && statusesResult.distribution) {
        setStatuses(statusesResult.distribution);
      }
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const maxTrendValue = Math.max(...trends.map((t) => Math.max(t.received, t.processed)), 1);

  const categoryColors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#84CC16",
  ];

  const statusColors: Record<string, string> = {
    RECEIVED: "#F59E0B",
    INSPECTION: "#3B82F6",
    QUARANTINED: "#EF4444",
    PROCESSING: "#8B5CF6",
    READY: "#10B981",
    RELEASED: "#6B7280",
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time insights into your operations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <a
            href="/dashboard/reports/export"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Export Reports
          </a>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Assets"
          value={metrics?.totalAssets.toLocaleString() || 0}
          subtitle={`${metrics?.assetsReceivedMonth || 0} received this month`}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Active Collections"
          value={metrics?.activeCollections || 0}
          subtitle={`${metrics?.completedCollectionsMonth || 0} completed this month`}
          icon={Truck}
          color="green"
        />
        <StatCard
          title="Active Customers"
          value={metrics?.activeCustomers || 0}
          subtitle={`${metrics?.totalCustomers || 0} total customers`}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Warehouse Occupancy"
          value={`${(metrics?.warehouseOccupancy || 0).toFixed(0)}%`}
          subtitle={`${metrics?.usedLocations || 0}/${metrics?.totalLocations || 0} locations in use`}
          icon={Warehouse}
          color="yellow"
        />
      </div>

      {/* Processing Status */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Awaiting Inspection"
          value={metrics?.assetsAwaitingInspection || 0}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="In Inspection"
          value={metrics?.assetsInspected || 0}
          icon={Clipboard}
          color="blue"
        />
        <StatCard
          title="In Quarantine"
          value={metrics?.assetsInQuarantine || 0}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Ready for Release"
          value={metrics?.assetsReadyForRelease || 0}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Asset Trends */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Asset Processing Trends</h2>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-blue-500" />
                <span className="text-gray-600">Received</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-green-500" />
                <span className="text-gray-600">Processed</span>
              </div>
            </div>
          </div>
          {trends.length > 0 ? (
            <SimpleBarChart data={trends} maxValue={maxTrendValue} />
          ) : (
            <div className="flex h-48 items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Assets by Category</h2>
          </div>
          {categories.length > 0 ? (
            <SimplePieChart
              data={categories.map((c) => ({
                label: c.category,
                value: c.count,
                percentage: c.percentage,
              }))}
              colors={categoryColors}
            />
          ) : (
            <div className="flex h-32 items-center justify-center text-gray-500">
              No category data available
            </div>
          )}
        </div>
      </div>

      {/* Status Distribution */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Scale className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Assets by Status</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {statuses.map((status) => (
            <div
              key={status.status}
              className="rounded-lg border p-4"
              style={{ borderColor: statusColors[status.status] || "#6B7280" }}
            >
              <div
                className="text-2xl font-bold"
                style={{ color: statusColors[status.status] || "#6B7280" }}
              >
                {status.count}
              </div>
              <div className="text-sm text-gray-600">{status.status.replace("_", " ")}</div>
              <div className="text-xs text-gray-400">{status.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <a
          href="/dashboard/reports/assets"
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
        >
          <Package className="h-8 w-8 text-blue-600" />
          <div>
            <div className="font-medium text-gray-900">Asset Analytics</div>
            <div className="text-sm text-gray-500">Detailed asset reports</div>
          </div>
        </a>
        <a
          href="/dashboard/reports/warehouse"
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
        >
          <Warehouse className="h-8 w-8 text-yellow-600" />
          <div>
            <div className="font-medium text-gray-900">Warehouse Intelligence</div>
            <div className="text-sm text-gray-500">Location & stocktake reports</div>
          </div>
        </a>
        <a
          href="/dashboard/reports/custody"
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
        >
          <Clipboard className="h-8 w-8 text-purple-600" />
          <div>
            <div className="font-medium text-gray-900">Chain of Custody</div>
            <div className="text-sm text-gray-500">Handover & exception reports</div>
          </div>
        </a>
        <a
          href="/dashboard/reports/environmental"
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
        >
          <Scale className="h-8 w-8 text-green-600" />
          <div>
            <div className="font-medium text-gray-900">Environmental</div>
            <div className="text-sm text-gray-500">Recycling & reuse metrics</div>
          </div>
        </a>
      </div>
    </div>
  );
}

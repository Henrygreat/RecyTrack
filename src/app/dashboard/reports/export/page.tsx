"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  FileJson,
  Table,
  Package,
  Truck,
  Scale,
  Clipboard,
  Warehouse,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { exportReportData } from "../actions";

// ============================================
// TYPES
// ============================================

type ReportType = "assets" | "collections" | "custody" | "stocktake" | "environmental";
type ExportFormat = "csv" | "json";

interface ExportOption {
  id: ReportType;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

// ============================================
// EXPORT OPTIONS
// ============================================

const exportOptions: ExportOption[] = [
  {
    id: "assets",
    name: "Asset Export",
    description: "All assets with status, location, and processing details",
    icon: Package,
    color: "blue",
  },
  {
    id: "collections",
    name: "Collections Export",
    description: "Collection records with customer and completion data",
    icon: Truck,
    color: "green",
  },
  {
    id: "custody",
    name: "Chain of Custody",
    description: "Asset handover and custody transfer records",
    icon: Clipboard,
    color: "purple",
  },
  {
    id: "stocktake",
    name: "Stocktake Reports",
    description: "Stocktake session summaries and accuracy metrics",
    icon: Warehouse,
    color: "yellow",
  },
  {
    id: "environmental",
    name: "Environmental Data",
    description: "Released assets with weight and disposition data",
    icon: Scale,
    color: "emerald",
  },
];

// ============================================
// MAIN PAGE
// ============================================

export default function ExportReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    filename?: string;
  } | null>(null);

  const handleExport = async () => {
    if (!selectedReport) return;

    setExporting(true);
    setResult(null);

    try {
      const exportResult = await exportReportData(selectedReport, format);

      if (exportResult.success && exportResult.data) {
        // Create blob and download
        const mimeType = format === "json" ? "application/json" : "text/csv";
        const blob = new Blob([exportResult.data], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = exportResult.filename || `export.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setResult({
          success: true,
          message: "Export completed successfully",
          filename: exportResult.filename,
        });
      } else {
        setResult({
          success: false,
          message: exportResult.error || "Export failed",
        });
      }
    } catch {
      setResult({
        success: false,
        message: "An error occurred during export",
      });
    } finally {
      setExporting(false);
    }
  };

  const colorClasses: Record<string, { bg: string; border: string; icon: string; selected: string }> = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      selected: "ring-blue-500",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "text-green-600",
      selected: "ring-green-500",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: "text-purple-600",
      selected: "ring-purple-500",
    },
    yellow: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      icon: "text-yellow-600",
      selected: "ring-yellow-500",
    },
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: "text-emerald-600",
      selected: "ring-emerald-500",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/reports"
          className="rounded-lg p-2 hover:bg-gray-100"
          title="Back to Dashboard"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export Reports</h1>
          <p className="text-sm text-gray-500">Download report data in CSV or JSON format</p>
        </div>
      </div>

      {/* Report Selection */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Select Report Type</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exportOptions.map((option) => {
            const colors = colorClasses[option.color];
            const isSelected = selectedReport === option.id;
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                onClick={() => setSelectedReport(option.id)}
                className={`flex items-start gap-4 rounded-lg border p-4 text-left transition-all ${
                  isSelected
                    ? `${colors.border} ${colors.bg} ring-2 ${colors.selected}`
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className={`rounded-lg p-2 ${isSelected ? colors.bg : "bg-gray-100"}`}>
                  <Icon className={`h-6 w-6 ${isSelected ? colors.icon : "text-gray-500"}`} />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{option.name}</div>
                  <div className="mt-1 text-sm text-gray-500">{option.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Format Selection */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Select Format</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setFormat("csv")}
            className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${
              format === "csv"
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Table className={`h-8 w-8 ${format === "csv" ? "text-blue-600" : "text-gray-500"}`} />
            <div className="text-left">
              <div className="font-medium text-gray-900">CSV</div>
              <div className="text-sm text-gray-500">Spreadsheet compatible</div>
            </div>
          </button>
          <button
            onClick={() => setFormat("json")}
            className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${
              format === "json"
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <FileJson
              className={`h-8 w-8 ${format === "json" ? "text-blue-600" : "text-gray-500"}`}
            />
            <div className="text-left">
              <div className="font-medium text-gray-900">JSON</div>
              <div className="text-sm text-gray-500">Developer-friendly</div>
            </div>
          </button>
        </div>
      </div>

      {/* Export Button */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Ready to Export</h2>
            {selectedReport ? (
              <p className="mt-1 text-sm text-gray-500">
                Export {exportOptions.find((o) => o.id === selectedReport)?.name} as{" "}
                {format.toUpperCase()}
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-500">Select a report type to continue</p>
            )}
          </div>
          <button
            onClick={handleExport}
            disabled={!selectedReport || exporting}
            className={`flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-colors ${
              selectedReport && !exporting
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export Report
              </>
            )}
          </button>
        </div>

        {/* Result Message */}
        {result && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg p-4 ${
              result.success
                ? "border border-green-200 bg-green-50 text-green-800"
                : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {result.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <div>
              <div className="font-medium">{result.message}</div>
              {result.filename && (
                <div className="text-sm opacity-80">Downloaded: {result.filename}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 text-gray-500" />
          <div className="text-sm text-gray-600">
            <p className="font-medium">Security Information</p>
            <p className="mt-1">
              All exports are filtered to your organization&apos;s data only. CSV exports include
              protection against formula injection attacks. Access to exports requires management
              permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

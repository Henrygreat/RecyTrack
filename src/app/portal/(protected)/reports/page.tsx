"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Calendar,
  Loader2,
  FileSpreadsheet,
  Package,
  Award,
  Truck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getPortalReportData } from "../actions";

type ReportType = "collection_summary" | "asset_processing" | "certificate_register";

const reportTypes: Array<{
  id: ReportType;
  title: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    id: "collection_summary",
    title: "Collection Summary",
    description: "Summary of all collections including dates, locations, and asset counts",
    icon: Truck,
  },
  {
    id: "asset_processing",
    title: "Asset Processing Report",
    description: "Detailed breakdown of assets and their processing status",
    icon: Package,
  },
  {
    id: "certificate_register",
    title: "Certificate Register",
    description: "Register of all issued certificates with media counts and methods",
    icon: Award,
  },
];

export default function PortalReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async (format: "csv" | "xlsx") => {
    if (!selectedReport) return;

    setGenerating(true);
    setError(null);

    try {
      const filters: { startDate?: Date; endDate?: Date } = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const result = await getPortalReportData(selectedReport, filters);

      if (!result.success || !result.data) {
        setError(result.error || "Failed to generate report");
        setGenerating(false);
        return;
      }

      // Convert data to CSV or TSV (Excel-compatible)
      const data = result.data as Array<Record<string, string | number>>;
      if (data.length === 0) {
        setError("No data available for the selected criteria");
        setGenerating(false);
        return;
      }

      const headers = Object.keys(data[0]);
      const separator = format === "xlsx" ? "\t" : ",";

      const csvContent = [
        headers.join(separator),
        ...data.map(row =>
          headers.map(h => {
            const val = row[h];
            // Escape quotes and wrap in quotes if contains separator or quotes
            if (typeof val === "string" && (val.includes(separator) || val.includes('"') || val.includes('\n'))) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val ?? "";
          }).join(separator)
        )
      ].join("\n");

      // Create and download file
      const blob = new Blob(
        [format === "xlsx" ? "\ufeff" + csvContent : csvContent],
        { type: format === "xlsx" ? "text/tab-separated-values;charset=utf-8" : "text/csv;charset=utf-8" }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedReport}_${new Date().toISOString().split("T")[0]}.${format === "xlsx" ? "tsv" : "csv"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Compliance Reports</h1>
        <p className="text-slate-500 mt-1">
          Generate and download compliance reports for your records
        </p>
      </div>

      {/* Report Selection */}
      <div className="grid md:grid-cols-3 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReport === report.id;
          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    isSelected ? "bg-teal-100" : "bg-slate-100"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      isSelected ? "text-teal-600" : "text-slate-600"
                    }`}
                  />
                </div>
                <h3
                  className={`font-semibold ${
                    isSelected ? "text-teal-700" : "text-slate-900"
                  }`}
                >
                  {report.title}
                </h3>
              </div>
              <p className="text-sm text-slate-500">{report.description}</p>
            </button>
          );
        })}
      </div>

      {/* Report Options */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Report Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Date Range */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Download Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => generateReport("csv")}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download CSV
                </button>
                <button
                  onClick={() => generateReport("xlsx")}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  Download for Excel
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900">About Reports</h4>
              <p className="text-sm text-slate-500 mt-1">
                Reports include all data up to the current date. Use the date filters
                to narrow down to a specific period. CSV files can be opened in any
                spreadsheet application. The Excel-compatible format uses tab-separated
                values for better compatibility with Microsoft Excel.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

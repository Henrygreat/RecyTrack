"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  QrCode,
  Package,
  ArrowRightLeft,
  ClipboardCheck,
  RefreshCw,
  ClipboardList,
  Search,
  Printer,
  Box,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BarcodeScanner, type ScanResult } from "@/components/scanning/barcode-scanner";
import { AssetLabel } from "@/components/scanning/asset-label";
import {
  lookupAssetByTag,
  receiveAssetByScan,
  transferAssetByScan,
  updateAssetStatusByScan,
  generateAssetLabels,
} from "./actions";
import type { AssetStatus } from "@prisma/client";
import type { LabelData } from "@/lib/barcodes";

// ============================================
// TYPES
// ============================================

type ScanMode = "lookup" | "receive" | "transfer" | "status" | null;

interface ScannedAsset {
  id: string;
  assetTag: string;
  category: string;
  status: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  location?: {
    code: string;
    name: string;
  } | null;
  customer?: {
    name: string;
  } | null;
}

interface ScanLog {
  id: string;
  assetTag: string;
  action: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

// ============================================
// SCAN MODE ACTIONS
// ============================================

const SCAN_MODES = [
  {
    id: "lookup" as ScanMode,
    label: "Find Asset",
    description: "Look up asset details",
    icon: Search,
    color: "bg-blue-500",
  },
  {
    id: "receive" as ScanMode,
    label: "Receive Asset",
    description: "Mark as received at warehouse",
    icon: Package,
    color: "bg-green-500",
  },
  {
    id: "transfer" as ScanMode,
    label: "Transfer Asset",
    description: "Move to another location",
    icon: ArrowRightLeft,
    color: "bg-purple-500",
  },
  {
    id: "status" as ScanMode,
    label: "Update Status",
    description: "Change asset status",
    icon: RefreshCw,
    color: "bg-amber-500",
  },
];

const QUICK_LINKS = [
  {
    href: "/dashboard/scan/stocktake",
    label: "Stocktake",
    description: "Inventory reconciliation",
    icon: ClipboardList,
    color: "bg-teal-500",
  },
  {
    href: "/dashboard/scan/bulk",
    label: "Bulk Operations",
    description: "Process multiple assets",
    icon: Box,
    color: "bg-indigo-500",
  },
  {
    href: "/dashboard/scan/labels",
    label: "Print Labels",
    description: "Generate asset labels",
    icon: Printer,
    color: "bg-rose-500",
  },
  {
    href: "/dashboard/inspections/new",
    label: "New Inspection",
    description: "Scan to start inspection",
    icon: ClipboardCheck,
    color: "bg-orange-500",
  },
];

// ============================================
// STATUS OPTIONS
// ============================================

const STATUS_OPTIONS: { value: AssetStatus; label: string; color: string }[] = [
  { value: "RECEIVED", label: "Received", color: "bg-blue-500" },
  { value: "INSPECTION", label: "Inspection", color: "bg-amber-500" },
  { value: "QUARANTINED", label: "Quarantined", color: "bg-red-500" },
  { value: "PROCESSING", label: "Processing", color: "bg-purple-500" },
  { value: "READY", label: "Ready", color: "bg-green-500" },
  { value: "RELEASED", label: "Released", color: "bg-slate-500" },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ScanPage() {
  const [mode, setMode] = useState<ScanMode>(null);
  const [currentAsset, setCurrentAsset] = useState<ScannedAsset | null>(null);
  const [labelData, setLabelData] = useState<LabelData | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferLocationId, setTransferLocationId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus>("RECEIVED");
  const [statusNotes, setStatusNotes] = useState("");
  const [locations, setLocations] = useState<{ id: string; code: string; name: string }[]>([]);

  // Fetch locations for transfer mode
  useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await fetch("/api/warehouse/locations");
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations || []);
        }
      } catch {
        // Ignore - locations will be empty
      }
    }
    if (mode === "transfer") {
      fetchLocations();
    }
  }, [mode]);

  // Handle scan
  const handleScan = useCallback(
    async (result: ScanResult) => {
      setIsLoading(true);
      setError(null);

      try {
        // First, look up the asset
        const lookupResult = await lookupAssetByTag(result.value);

        if (!lookupResult.found || !lookupResult.asset) {
          setError(lookupResult.error || "Asset not found");
          addScanLog(result.value, "Lookup", false, lookupResult.error || "Asset not found");
          setCurrentAsset(null);
          return;
        }

        setCurrentAsset(lookupResult.asset);

        // Generate label data
        const labelResult = await generateAssetLabels([lookupResult.asset.id]);
        if (labelResult.success && labelResult.labels && labelResult.labels.length > 0) {
          setLabelData(labelResult.labels[0]);
        }

        // If we're in a specific mode, perform the action
        if (mode === "receive") {
          const actionResult = await receiveAssetByScan(lookupResult.asset.assetTag);
          addScanLog(
            lookupResult.asset.assetTag,
            "Receive",
            actionResult.success ?? false,
            actionResult.message || actionResult.error || ""
          );
          if (!actionResult.success) {
            setError(actionResult.error || "Failed to receive asset");
          }
        } else if (mode === "lookup") {
          addScanLog(lookupResult.asset.assetTag, "Lookup", true, "Asset found");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        addScanLog(result.value, "Error", false, message);
      } finally {
        setIsLoading(false);
      }
    },
    [mode]
  );

  // Add to scan log
  const addScanLog = (assetTag: string, action: string, success: boolean, message: string) => {
    setScanLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        assetTag,
        action,
        success,
        message,
        timestamp: new Date(),
      },
      ...prev.slice(0, 49), // Keep last 50 logs
    ]);
  };

  // Handle transfer action
  const handleTransfer = async () => {
    if (!currentAsset || !transferLocationId) return;

    setIsLoading(true);
    try {
      const result = await transferAssetByScan(currentAsset.assetTag, transferLocationId);
      addScanLog(currentAsset.assetTag, "Transfer", result.success ?? false, result.message || result.error || "");
      if (!result.success) {
        setError(result.error || "Transfer failed");
      } else {
        // Refresh asset data
        const lookupResult = await lookupAssetByTag(currentAsset.assetTag);
        if (lookupResult.found && lookupResult.asset) {
          setCurrentAsset(lookupResult.asset);
        }
        setTransferLocationId("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transfer failed";
      setError(message);
      addScanLog(currentAsset.assetTag, "Transfer", false, message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle status update action
  const handleStatusUpdate = async () => {
    if (!currentAsset) return;

    setIsLoading(true);
    try {
      const result = await updateAssetStatusByScan(
        currentAsset.assetTag,
        selectedStatus,
        statusNotes || undefined
      );
      addScanLog(currentAsset.assetTag, "Status Update", result.success ?? false, result.message || result.error || "");
      if (!result.success) {
        setError(result.error || "Status update failed");
      } else {
        // Refresh asset data
        const lookupResult = await lookupAssetByTag(currentAsset.assetTag);
        if (lookupResult.found && lookupResult.asset) {
          setCurrentAsset(lookupResult.asset);
        }
        setStatusNotes("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Status update failed";
      setError(message);
      addScanLog(currentAsset.assetTag, "Status Update", false, message);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear current asset
  const clearAsset = () => {
    setCurrentAsset(null);
    setLabelData(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Scan Mode"
        description="Scan QR codes or barcodes to quickly manage assets"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Scan" },
        ]}
      />

      {/* Mode Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SCAN_MODES.map((scanMode) => {
          const Icon = scanMode.icon;
          const isActive = mode === scanMode.id;

          return (
            <button
              key={scanMode.id}
              onClick={() => {
                setMode(isActive ? null : scanMode.id);
                clearAsset();
              }}
              className={`relative p-4 rounded-xl text-left transition-all ${
                isActive
                  ? "bg-white ring-2 ring-teal-500 shadow-lg"
                  : "bg-white border border-slate-200 hover:border-slate-300 hover:shadow"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg ${scanMode.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900">{scanMode.label}</h3>
              <p className="text-sm text-slate-500 mt-1">{scanMode.description}</p>
              {isActive && (
                <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-teal-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow transition-all"
            >
              <div className={`w-8 h-8 rounded-lg ${link.color} flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-sm text-slate-900">{link.label}</h4>
                <p className="text-xs text-slate-500">{link.description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Scanner Section */}
      {mode && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Scanner</h2>
                <p className="text-sm text-slate-500">
                  {mode === "lookup" && "Scan to find asset details"}
                  {mode === "receive" && "Scan to mark as received"}
                  {mode === "transfer" && "Scan asset, then select location"}
                  {mode === "status" && "Scan asset, then select new status"}
                </p>
              </div>
            </div>

            <BarcodeScanner
              onScan={handleScan}
              onError={(err) => setError(err)}
              continuous={true}
              debounceMs={2000}
              placeholder="Enter asset tag..."
              disabled={isLoading}
            />

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Asset Details / Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">
              {currentAsset ? "Scanned Asset" : "Scan an Asset"}
            </h2>

            {currentAsset ? (
              <div className="space-y-4">
                {/* Asset Info Card */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-slate-400" />
                        <span className="font-mono font-bold text-lg">{currentAsset.assetTag}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{currentAsset.category}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        currentAsset.status === "AVAILABLE"
                          ? "bg-green-100 text-green-700"
                          : currentAsset.status === "IN_USE"
                          ? "bg-blue-100 text-blue-700"
                          : currentAsset.status === "QUARANTINED"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {currentAsset.status}
                    </span>
                  </div>

                  {(currentAsset.manufacturer || currentAsset.model) && (
                    <p className="text-sm text-slate-600 mt-2">
                      {currentAsset.manufacturer} {currentAsset.model}
                    </p>
                  )}

                  {currentAsset.serialNumber && (
                    <p className="text-sm text-slate-500 font-mono mt-1">
                      S/N: {currentAsset.serialNumber}
                    </p>
                  )}

                  {currentAsset.location && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {currentAsset.location.code} - {currentAsset.location.name}
                      </span>
                    </div>
                  )}

                  {currentAsset.customer && (
                    <p className="text-sm text-slate-500 mt-1">
                      Customer: {currentAsset.customer.name}
                    </p>
                  )}
                </div>

                {/* Mode-specific actions */}
                {mode === "transfer" && (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Transfer to Location</span>
                      <select
                        value={transferLocationId}
                        onChange={(e) => setTransferLocationId(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="">Select location...</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.code} - {loc.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      onClick={handleTransfer}
                      disabled={!transferLocationId || isLoading}
                      className="w-full px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? "Transferring..." : "Transfer Asset"}
                    </button>
                  </div>
                )}

                {mode === "status" && (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">New Status</span>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setSelectedStatus(opt.value)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                              selectedStatus === opt.value
                                ? "border-teal-500 bg-teal-50 text-teal-700"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <span className={`inline-block w-2 h-2 rounded-full ${opt.color} mr-2`} />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Notes (optional)</span>
                      <textarea
                        value={statusNotes}
                        onChange={(e) => setStatusNotes(e.target.value)}
                        rows={2}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Reason for status change..."
                      />
                    </label>
                    <button
                      onClick={handleStatusUpdate}
                      disabled={isLoading}
                      className="w-full px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? "Updating..." : "Update Status"}
                    </button>
                  </div>
                )}

                {/* View full details link */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                  <Link
                    href={`/dashboard/assets/${currentAsset.id}`}
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    View Full Details
                  </Link>
                  <button
                    onClick={clearAsset}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Clear
                  </button>
                </div>

                {/* Label preview */}
                {labelData && (
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-sm font-medium text-slate-700 mb-3">Label Preview</p>
                    <AssetLabel label={labelData} size="medium" showPrintButton={true} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <QrCode className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">
                  {isLoading ? "Looking up asset..." : "Scan a QR code or barcode to begin"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan History */}
      {scanLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent Scans</h2>
            <button
              onClick={() => setScanLogs([])}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Clear History
            </button>
          </div>
          <div className="space-y-2">
            {scanLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
              >
                {log.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{log.assetTag}</span>
                    <span className="text-sm text-slate-500">{log.action}</span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{log.message}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  {log.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

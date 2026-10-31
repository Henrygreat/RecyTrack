"use client";

import { useState, useCallback } from "react";
import {
  Package,
  ArrowRightLeft,
  RefreshCw,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BarcodeScanner, type ScanResult } from "@/components/scanning/barcode-scanner";
import {
  bulkReceiveAssets,
  bulkTransferAssets,
  bulkUpdateStatus,
} from "../actions";
import type { AssetStatus } from "@prisma/client";

// ============================================
// TYPES
// ============================================

type BulkMode = "receive" | "transfer" | "status";

interface QueuedAsset {
  id: string;
  assetTag: string;
  addedAt: Date;
}

interface OperationResult {
  assetTag: string;
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================
// CONSTANTS
// ============================================

const BULK_MODES = [
  {
    id: "receive" as BulkMode,
    label: "Bulk Receive",
    description: "Mark multiple assets as received",
    icon: Package,
    color: "bg-green-500",
  },
  {
    id: "transfer" as BulkMode,
    label: "Bulk Transfer",
    description: "Move multiple assets to a location",
    icon: ArrowRightLeft,
    color: "bg-purple-500",
  },
  {
    id: "status" as BulkMode,
    label: "Bulk Status Update",
    description: "Change status for multiple assets",
    icon: RefreshCw,
    color: "bg-amber-500",
  },
];

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: "RECEIVED", label: "Received" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "QUARANTINED", label: "Quarantined" },
  { value: "PROCESSING", label: "Processing" },
  { value: "READY", label: "Ready" },
  { value: "RELEASED", label: "Released" },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function BulkOperationsPage() {
  const [mode, setMode] = useState<BulkMode>("receive");
  const [queue, setQueue] = useState<QueuedAsset[]>([]);
  const [results, setResults] = useState<OperationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [transferLocationId, setTransferLocationId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus>("RECEIVED");
  const [statusNotes, setStatusNotes] = useState("");
  const [locations, setLocations] = useState<{ id: string; code: string; name: string }[]>([]);
  const [pasteInput, setPasteInput] = useState("");
  const [showPasteModal, setShowPasteModal] = useState(false);

  // Fetch locations when transfer mode is selected
  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch("/api/warehouse/locations");
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Handle scan - add to queue
  const handleScan = useCallback(
    (result: ScanResult) => {
      const assetTag = result.value.trim().toUpperCase();

      // Check for duplicate in queue
      if (queue.some((q) => q.assetTag === assetTag)) {
        return; // Already in queue
      }

      setQueue((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          assetTag,
          addedAt: new Date(),
        },
      ]);
    },
    [queue]
  );

  // Remove from queue
  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear queue
  const clearQueue = () => {
    setQueue([]);
    setResults([]);
    setShowResults(false);
  };

  // Handle paste import
  const handlePasteImport = () => {
    const lines = pasteInput
      .split(/[\n,;]/)
      .map((line) => line.trim().toUpperCase())
      .filter((line) => line.length > 0);

    const existingTags = new Set(queue.map((q) => q.assetTag));
    const newItems: QueuedAsset[] = [];

    for (const tag of lines) {
      if (!existingTags.has(tag)) {
        existingTags.add(tag);
        newItems.push({
          id: `${Date.now()}-${Math.random()}`,
          assetTag: tag,
          addedAt: new Date(),
        });
      }
    }

    setQueue((prev) => [...prev, ...newItems]);
    setPasteInput("");
    setShowPasteModal(false);
  };

  // Process bulk operation
  const processOperation = async () => {
    if (queue.length === 0) return;

    setIsProcessing(true);
    setShowResults(false);

    const assetTags = queue.map((q) => q.assetTag);

    try {
      let result;

      switch (mode) {
        case "receive":
          result = await bulkReceiveAssets(assetTags);
          break;
        case "transfer":
          if (!transferLocationId) {
            setIsProcessing(false);
            return;
          }
          result = await bulkTransferAssets(assetTags, transferLocationId);
          break;
        case "status":
          result = await bulkUpdateStatus(assetTags, selectedStatus, statusNotes || undefined);
          break;
      }

      setResults(result.results);
      setShowResults(true);

      // Remove successful items from queue
      const successfulTags = new Set(
        result.results.filter((r) => r.success).map((r) => r.assetTag)
      );
      setQueue((prev) => prev.filter((q) => !successfulTags.has(q.assetTag)));
    } catch (err) {
      console.error("Bulk operation error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Switch mode
  const handleModeChange = (newMode: BulkMode) => {
    setMode(newMode);
    setShowResults(false);
    if (newMode === "transfer") {
      fetchLocations();
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Operations"
        description="Process multiple assets at once"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Scan", href: "/dashboard/scan" },
          { label: "Bulk Operations" },
        ]}
        backHref="/dashboard/scan"
      />

      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BULK_MODES.map((bulkMode) => {
          const Icon = bulkMode.icon;
          const isActive = mode === bulkMode.id;

          return (
            <button
              key={bulkMode.id}
              onClick={() => handleModeChange(bulkMode.id)}
              className={`p-4 rounded-xl text-left transition-all ${
                isActive
                  ? "bg-white ring-2 ring-teal-500 shadow-lg"
                  : "bg-white border border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg ${bulkMode.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900">{bulkMode.label}</h3>
              <p className="text-sm text-slate-500 mt-1">{bulkMode.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner & Input */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Add Assets</h2>
            <BarcodeScanner
              onScan={handleScan}
              continuous={true}
              debounceMs={500}
              placeholder="Scan or type asset tag..."
            />
          </div>

          {/* Import Options */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <button
              onClick={() => setShowPasteModal(true)}
              className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5 text-slate-400" />
              <div className="text-left">
                <p className="font-medium text-slate-900">Import from List</p>
                <p className="text-sm text-slate-500">Paste asset tags from a spreadsheet</p>
              </div>
            </button>
          </div>

          {/* Mode-specific options */}
          {mode === "transfer" && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Transfer Destination</h3>
              <select
                value={transferLocationId}
                onChange={(e) => setTransferLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select location...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === "status" && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-3">New Status</h3>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as AssetStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 mb-3"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Notes (optional)..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          )}
        </div>

        {/* Queue & Results */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">Asset Queue</h2>
              <p className="text-sm text-slate-500">{queue.length} asset(s) ready to process</p>
            </div>
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Queue List */}
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Upload className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-slate-500">No assets in queue</p>
                <p className="text-sm text-slate-400">Scan or paste asset tags to add</p>
              </div>
            ) : (
              queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                >
                  <span className="font-mono font-medium">{item.assetTag}</span>
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Process Button */}
          <button
            onClick={processOperation}
            disabled={queue.length === 0 || isProcessing || (mode === "transfer" && !transferLocationId)}
            className="w-full px-4 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {mode === "receive" && <Package className="w-5 h-5" />}
                {mode === "transfer" && <ArrowRightLeft className="w-5 h-5" />}
                {mode === "status" && <RefreshCw className="w-5 h-5" />}
                Process {queue.length} Asset(s)
              </>
            )}
          </button>

          {/* Results */}
          {showResults && results.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="font-semibold text-slate-900">Results</h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    {successCount} success
                  </span>
                  {failCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      {failCount} failed
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      result.success ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-mono font-medium">{result.assetTag}</span>
                      {result.error && (
                        <p className="text-sm text-red-600 truncate">{result.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Import Asset Tags</h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Paste asset tags separated by commas, semicolons, or new lines
            </p>
            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="RT-000001&#10;RT-000002&#10;RT-000003"
              rows={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono text-sm"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteImport}
                disabled={!pasteInput.trim()}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

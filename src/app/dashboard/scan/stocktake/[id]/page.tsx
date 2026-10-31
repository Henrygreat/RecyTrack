"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  QrCode,
  Loader2,
  Clock,
  MapPin,
  Tag,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BarcodeScanner, type ScanResult } from "@/components/scanning/barcode-scanner";
import {
  getStocktakeSession,
  scanStocktakeAsset,
  updateStocktakeStatus,
} from "../actions";

// Local type definitions (matches Prisma schema)
type StocktakeStatus = "IN_PROGRESS" | "PAUSED" | "PENDING_REVIEW" | "COMPLETED" | "CANCELLED";
type StocktakeItemStatus = "EXPECTED" | "FOUND" | "MISSING" | "UNEXPECTED" | "DISCREPANCY";

// ============================================
// TYPES
// ============================================

interface StocktakeSession {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  status: StocktakeStatus;
  warehouseLocation: {
    id: string;
    code: string;
    name: string;
  } | null;
  includeAllLocations: boolean;
  startedAt: Date;
  startedByName: string | null;
  expectedCount: number;
  scannedCount: number;
  foundCount: number;
  missingCount: number;
  unexpectedCount: number;
}

interface StocktakeItem {
  id: string;
  assetId: string;
  asset: {
    assetTag: string;
    category: string;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
  };
  status: StocktakeItemStatus;
  expectedLocationCode: string | null;
  actualLocationCode: string | null;
  scannedAt: Date | null;
  scannedByName: string | null;
  scanCount: number;
  notes: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG: Record<StocktakeItemStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  EXPECTED: { label: "Expected", color: "bg-slate-100 text-slate-700", icon: Clock },
  FOUND: { label: "Found", color: "bg-green-100 text-green-700", icon: CheckCircle },
  MISSING: { label: "Missing", color: "bg-red-100 text-red-700", icon: XCircle },
  UNEXPECTED: { label: "Unexpected", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  DISCREPANCY: { label: "Discrepancy", color: "bg-purple-100 text-purple-700", icon: AlertTriangle },
};

type FilterStatus = "all" | StocktakeItemStatus;

// ============================================
// MAIN COMPONENT
// ============================================

export default function StocktakeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<StocktakeSession | null>(null);
  const [items, setItems] = useState<StocktakeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<{ item: StocktakeItem; isNew: boolean } | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [reconciliationNotes, setReconciliationNotes] = useState("");

  // Fetch session data
  const fetchSession = useCallback(async () => {
    const result = await getStocktakeSession(sessionId);
    if (result.success && result.session) {
      setSession(result.session);
      setItems(result.items || []);
    }
    setIsLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Handle scan
  const handleScan = useCallback(
    async (result: ScanResult) => {
      if (!session || session.status !== "IN_PROGRESS") return;

      setIsScanning(true);
      const scanResult = await scanStocktakeAsset(sessionId, result.value);

      if (scanResult.success && scanResult.item) {
        setLastScan({ item: scanResult.item, isNew: scanResult.isNew || false });
        fetchSession(); // Refresh data
      }

      setIsScanning(false);
    },
    [session, sessionId, fetchSession]
  );

  // Handle status changes
  const handlePause = async () => {
    if (!session) return;
    await updateStocktakeStatus(sessionId, "PAUSED");
    fetchSession();
  };

  const handleResume = async () => {
    if (!session) return;
    await updateStocktakeStatus(sessionId, "IN_PROGRESS");
    fetchSession();
  };

  const handleFinishScanning = async () => {
    if (!session) return;
    await updateStocktakeStatus(sessionId, "PENDING_REVIEW");
    fetchSession();
  };

  const handleComplete = async () => {
    if (!session) return;
    await updateStocktakeStatus(sessionId, "COMPLETED", reconciliationNotes);
    router.push("/dashboard/scan/stocktake");
  };

  const handleCancel = async () => {
    if (!session) return;
    if (confirm("Are you sure you want to cancel this stocktake?")) {
      await updateStocktakeStatus(sessionId, "CANCELLED");
      router.push("/dashboard/scan/stocktake");
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesFilter = filter === "all" || item.status === filter;
    const matchesSearch =
      !searchQuery ||
      item.asset.assetTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: items.length,
    expected: items.filter((i) => i.status === "EXPECTED").length,
    found: items.filter((i) => i.status === "FOUND").length,
    missing: items.filter((i) => i.status === "MISSING").length,
    unexpected: items.filter((i) => i.status === "UNEXPECTED").length,
    discrepancy: items.filter((i) => i.status === "DISCREPANCY").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Stocktake not found</h2>
        <Link href="/dashboard/scan/stocktake" className="text-teal-600 hover:text-teal-700 mt-2 inline-block">
          Back to stocktakes
        </Link>
      </div>
    );
  }

  const progress = session.expectedCount > 0
    ? Math.round((session.scannedCount / session.expectedCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={session.name}
        description={`${session.reference} - Started ${new Date(session.startedAt).toLocaleDateString()}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Scan", href: "/dashboard/scan" },
          { label: "Stocktake", href: "/dashboard/scan/stocktake" },
          { label: session.reference },
        ]}
        backHref="/dashboard/scan/stocktake"
        actions={
          <div className="flex items-center gap-2">
            {session.status === "IN_PROGRESS" && (
              <>
                <button
                  onClick={handlePause}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={handleFinishScanning}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Finish Scanning
                </button>
              </>
            )}
            {session.status === "PAUSED" && (
              <button
                onClick={handleResume}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            )}
            {session.status === "PENDING_REVIEW" && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Complete & Approve
              </button>
            )}
            {(session.status === "IN_PROGRESS" || session.status === "PAUSED") && (
              <button
                onClick={handleCancel}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Cancel stocktake"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        }
      />

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-900">Progress</h2>
            <p className="text-sm text-slate-500">
              {session.scannedCount} of {session.expectedCount} assets scanned
            </p>
          </div>
          <span className="text-3xl font-bold text-teal-600">{progress}%</span>
        </div>
        <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          <div className="text-center p-3 rounded-lg bg-slate-50">
            <p className="text-2xl font-bold text-slate-700">{stats.expected}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-50">
            <p className="text-2xl font-bold text-green-700">{stats.found}</p>
            <p className="text-xs text-green-600">Found</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50">
            <p className="text-2xl font-bold text-red-700">{stats.missing}</p>
            <p className="text-xs text-red-600">Missing</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-amber-50">
            <p className="text-2xl font-bold text-amber-700">{stats.unexpected}</p>
            <p className="text-xs text-amber-600">Unexpected</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-purple-50">
            <p className="text-2xl font-bold text-purple-700">{stats.discrepancy}</p>
            <p className="text-xs text-purple-600">Discrepancy</p>
          </div>
        </div>
      </div>

      {/* Scanner (only for in-progress) */}
      {session.status === "IN_PROGRESS" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Scanner</h2>
                <p className="text-sm text-slate-500">Scan assets to mark as found</p>
              </div>
            </div>

            <BarcodeScanner
              onScan={handleScan}
              continuous={true}
              debounceMs={1000}
              scannerHeight={250}
              placeholder="Scan asset barcode or QR..."
              disabled={isScanning}
            />
          </div>

          {/* Last Scan Result */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Last Scan</h2>

            {lastScan ? (
              <div
                className={`p-4 rounded-lg ${
                  lastScan.item.status === "FOUND"
                    ? "bg-green-50 border border-green-200"
                    : lastScan.item.status === "UNEXPECTED"
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-purple-50 border border-purple-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-slate-400" />
                      <span className="font-mono font-bold text-lg">{lastScan.item.asset.assetTag}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{lastScan.item.asset.category}</p>
                    {lastScan.item.asset.serialNumber && (
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        S/N: {lastScan.item.asset.serialNumber}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      STATUS_CONFIG[lastScan.item.status].color
                    }`}
                  >
                    {lastScan.isNew ? "Unexpected" : "Found"}
                  </span>
                </div>

                {lastScan.item.scanCount > 1 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-amber-600">
                    <RefreshCw className="w-4 h-4" />
                    Scanned {lastScan.item.scanCount} times
                  </div>
                )}

                {lastScan.item.status === "DISCREPANCY" && (
                  <div className="mt-3 p-2 rounded bg-purple-100 text-sm text-purple-700">
                    <strong>Location mismatch:</strong> Expected{" "}
                    {lastScan.item.expectedLocationCode || "N/A"}, found at{" "}
                    {lastScan.item.actualLocationCode || "N/A"}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <QrCode className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500">Scan an asset to see details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold text-slate-900">Assets ({filteredItems.length})</h2>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 w-48 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterStatus)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="all">All statuses</option>
                <option value="EXPECTED">Pending</option>
                <option value="FOUND">Found</option>
                <option value="MISSING">Missing</option>
                <option value="UNEXPECTED">Unexpected</option>
                <option value="DISCREPANCY">Discrepancy</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500">No assets match your filter</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const statusConfig = STATUS_CONFIG[item.status];
              const StatusIcon = statusConfig.icon;

              return (
                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusConfig.color}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{item.asset.assetTag}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {item.asset.category}
                        {item.asset.manufacturer && ` - ${item.asset.manufacturer}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-sm">
                    {item.scannedAt && (
                      <p className="text-slate-500">
                        Scanned {new Date(item.scannedAt).toLocaleTimeString()}
                      </p>
                    )}
                    {item.expectedLocationCode && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                        <MapPin className="w-3 h-3" />
                        {item.expectedLocationCode}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Complete Stocktake</h3>

            <div className="mb-4 p-4 rounded-lg bg-slate-50">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Found</p>
                  <p className="font-bold text-green-600">{stats.found}</p>
                </div>
                <div>
                  <p className="text-slate-500">Missing</p>
                  <p className="font-bold text-red-600">{stats.missing}</p>
                </div>
                <div>
                  <p className="text-slate-500">Unexpected</p>
                  <p className="font-bold text-amber-600">{stats.unexpected}</p>
                </div>
                <div>
                  <p className="text-slate-500">Discrepancy</p>
                  <p className="font-bold text-purple-600">{stats.discrepancy}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reconciliation Notes
              </label>
              <textarea
                value={reconciliationNotes}
                onChange={(e) => setReconciliationNotes(e.target.value)}
                rows={3}
                placeholder="Add any notes about discrepancies or actions taken..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Complete Stocktake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

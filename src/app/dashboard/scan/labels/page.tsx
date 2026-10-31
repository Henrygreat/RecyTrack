"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Printer,
  Search,
  X,
  CheckCircle,
  Loader2,
  Tag,
  Grid3X3,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BarcodeScanner, type ScanResult } from "@/components/scanning/barcode-scanner";
import { LabelSheet, type LabelSheetProps } from "@/components/scanning/asset-label";
import { lookupAssetByTag, generateAssetLabels } from "../actions";
import type { LabelData } from "@/lib/barcodes";

// ============================================
// TYPES
// ============================================

interface QueuedAsset {
  id: string;
  assetTag: string;
  assetId: string;
  category: string;
}

type LabelLayout = LabelSheetProps["layout"];

// ============================================
// CONSTANTS
// ============================================

const LAYOUT_OPTIONS: { value: LabelLayout; label: string; description: string }[] = [
  { value: "a4-24", label: "A4 - 24 Labels", description: "Avery L7159 (63.5 x 33.9mm)" },
  { value: "a4-21", label: "A4 - 21 Labels", description: "Avery L7160 (63.5 x 38.1mm)" },
  { value: "a4-14", label: "A4 - 14 Labels", description: "Avery L7163 (99.1 x 38.1mm)" },
  { value: "thermal", label: "Thermal Roll", description: "60 x 40mm continuous" },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function LabelsPage() {
  const [queue, setQueue] = useState<QueuedAsset[]>([]);
  const [labels, setLabels] = useState<LabelData[]>([]);
  const [layout, setLayout] = useState<LabelLayout>("a4-24");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<QueuedAsset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle scan - add to queue
  const handleScan = useCallback(
    async (result: ScanResult) => {
      setError(null);

      // Look up the asset first
      const lookupResult = await lookupAssetByTag(result.value);

      if (!lookupResult.found || !lookupResult.asset) {
        setError(lookupResult.error || "Asset not found");
        return;
      }

      const asset = lookupResult.asset;

      // Check for duplicate in queue
      if (queue.some((q) => q.assetId === asset.id)) {
        return; // Already in queue
      }

      setQueue((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          assetTag: asset.assetTag,
          assetId: asset.id,
          category: asset.category,
        },
      ]);
    },
    [queue]
  );

  // Search for assets
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/assets/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(
          data.assets.map((a: { id: string; assetTag: string; category: string }) => ({
            id: `search-${a.id}`,
            assetTag: a.assetTag,
            assetId: a.id,
            category: a.category,
          }))
        );
      }
    } catch {
      // Ignore search errors
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Add from search results
  const addFromSearch = (asset: QueuedAsset) => {
    if (queue.some((q) => q.assetId === asset.assetId)) {
      return; // Already in queue
    }

    setQueue((prev) => [
      ...prev,
      {
        ...asset,
        id: `${Date.now()}-${Math.random()}`,
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Remove from queue
  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    setLabels([]);
    setShowPreview(false);
  };

  // Clear queue
  const clearQueue = () => {
    setQueue([]);
    setLabels([]);
    setShowPreview(false);
  };

  // Generate labels
  const generateLabels = async () => {
    if (queue.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      const assetIds = queue.map((q) => q.assetId);
      const result = await generateAssetLabels(assetIds);

      if (result.success && result.labels) {
        setLabels(result.labels);
        setShowPreview(true);
      } else {
        setError(result.error || "Failed to generate labels");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate labels");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Print Labels"
        description="Generate and print asset labels with QR codes and barcodes"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Scan", href: "/dashboard/scan" },
          { label: "Labels" },
        ]}
        backHref="/dashboard/scan"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner & Search */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Add Assets</h2>
            <BarcodeScanner
              onScan={handleScan}
              continuous={true}
              debounceMs={500}
              scannerHeight={200}
              placeholder="Scan or type asset tag..."
            />

            {error && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {searchResults.map((asset) => (
                  <button
                    key={asset.assetId}
                    onClick={() => addFromSearch(asset)}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="text-left">
                      <span className="font-mono font-medium">{asset.assetTag}</span>
                      <p className="text-xs text-slate-500">{asset.category}</p>
                    </div>
                    {queue.some((q) => q.assetId === asset.assetId) ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <span className="text-xs text-teal-600">Add</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Layout Selection */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Label Layout</h3>
            <div className="space-y-2">
              {LAYOUT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLayout(option.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    layout === option.value
                      ? "border-teal-500 bg-teal-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Grid3X3 className={`w-5 h-5 ${layout === option.value ? "text-teal-600" : "text-slate-400"}`} />
                  <div className="text-left">
                    <p className={`font-medium ${layout === option.value ? "text-teal-700" : "text-slate-700"}`}>
                      {option.label}
                    </p>
                    <p className="text-xs text-slate-500">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Queue */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">Label Queue</h2>
              <p className="text-sm text-slate-500">{queue.length} label(s)</p>
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

          <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Tag className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-slate-500">No assets in queue</p>
                <p className="text-sm text-slate-400">Scan or search for assets to add</p>
              </div>
            ) : (
              queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                >
                  <div>
                    <span className="font-mono font-medium">{item.assetTag}</span>
                    <p className="text-xs text-slate-500">{item.category}</p>
                  </div>
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

          <button
            onClick={generateLabels}
            disabled={queue.length === 0 || isGenerating}
            className="w-full px-4 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                Generate Labels
              </>
            )}
          </button>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          {showPreview && labels.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Preview</h2>
              <LabelSheet labels={labels} layout={layout} showPrintButton={true} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Printer className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="font-medium text-slate-700">Label Preview</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Add assets and click Generate to preview labels
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

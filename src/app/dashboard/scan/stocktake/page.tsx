"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  Play,
  Pause,
  CheckCircle,
  X,
  Clock,
  MapPin,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  createStocktakeSession,
  getStocktakeSessions,
  updateStocktakeStatus,
} from "./actions";

// Local type definitions (matches Prisma schema)
type StocktakeStatus = "IN_PROGRESS" | "PAUSED" | "PENDING_REVIEW" | "COMPLETED" | "CANCELLED";

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

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG: Record<StocktakeStatus, { label: string; color: string; icon: typeof ClipboardList }> = {
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Play },
  PAUSED: { label: "Paused", color: "bg-amber-100 text-amber-700", icon: Pause },
  PENDING_REVIEW: { label: "Pending Review", color: "bg-purple-100 text-purple-700", icon: Clock },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-700", icon: X },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function StocktakeListPage() {
  const [sessions, setSessions] = useState<StocktakeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [locations, setLocations] = useState<{ id: string; code: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    warehouseLocationId: "",
    includeAllLocations: true,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    const result = await getStocktakeSessions();
    if (result.success && result.sessions) {
      setSessions(result.sessions);
    }
    setIsLoading(false);
  }, []);

  // Fetch locations
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

  useEffect(() => {
    fetchSessions();
    fetchLocations();
  }, [fetchSessions, fetchLocations]);

  // Create session
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    const result = await createStocktakeSession({
      name: formData.name,
      description: formData.description || undefined,
      warehouseLocationId: formData.warehouseLocationId || undefined,
      includeAllLocations: formData.includeAllLocations,
    });

    if (result.success) {
      setShowCreateModal(false);
      setFormData({ name: "", description: "", warehouseLocationId: "", includeAllLocations: true });
      fetchSessions();
    } else {
      setError(result.error || "Failed to create stocktake");
    }

    setIsCreating(false);
  };

  // Quick status update
  const handleStatusUpdate = async (sessionId: string, status: StocktakeStatus) => {
    const result = await updateStocktakeStatus(sessionId, status);
    if (result.success) {
      fetchSessions();
    }
  };

  const activeSession = sessions.find((s) => s.status === "IN_PROGRESS");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stocktake"
        description="Inventory reconciliation and counting"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Scan", href: "/dashboard/scan" },
          { label: "Stocktake" },
        ]}
        backHref="/dashboard/scan"
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Stocktake
          </button>
        }
      />

      {/* Active Session Banner */}
      {activeSession && (
        <Link
          href={`/dashboard/scan/stocktake/${activeSession.id}`}
          className="block p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Active Stocktake</h3>
                <p className="text-sm text-blue-700">
                  {activeSession.reference} - {activeSession.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-700">
                {activeSession.scannedCount} / {activeSession.expectedCount}
              </p>
              <p className="text-sm text-blue-600">assets scanned</p>
            </div>
          </div>
        </Link>
      )}

      {/* Sessions List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">All Stocktakes</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="font-medium text-slate-700">No stocktakes yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              Create a new stocktake to start counting inventory
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((session) => {
              const statusConfig = STATUS_CONFIG[session.status];
              const StatusIcon = statusConfig.icon;
              const progress = session.expectedCount > 0
                ? Math.round((session.scannedCount / session.expectedCount) * 100)
                : 0;

              return (
                <div key={session.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <Link href={`/dashboard/scan/stocktake/${session.id}`} className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-slate-900">
                              {session.reference}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mt-0.5">{session.name}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            {session.warehouseLocation ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {session.warehouseLocation.code}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                All locations
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(session.startedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-6">
                      {/* Progress */}
                      <div className="text-right">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-700 w-12">{progress}%</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {session.scannedCount} / {session.expectedCount} scanned
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-green-50 text-green-700">
                          {session.foundCount} found
                        </span>
                        {session.missingCount > 0 && (
                          <span className="px-2 py-1 rounded bg-red-50 text-red-700">
                            {session.missingCount} missing
                          </span>
                        )}
                        {session.unexpectedCount > 0 && (
                          <span className="px-2 py-1 rounded bg-amber-50 text-amber-700">
                            {session.unexpectedCount} unexpected
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      {session.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleStatusUpdate(session.id, "PAUSED")}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Pause"
                        >
                          <Pause className="w-5 h-5" />
                        </button>
                      )}
                      {session.status === "PAUSED" && (
                        <button
                          onClick={() => handleStatusUpdate(session.id, "IN_PROGRESS")}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Resume"
                        >
                          <Play className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">New Stocktake</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Monthly Inventory Count"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.includeAllLocations}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        includeAllLocations: e.target.checked,
                        warehouseLocationId: e.target.checked ? "" : prev.warehouseLocationId,
                      }))
                    }
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-700">Include all locations</span>
                </label>
              </div>

              {!formData.includeAllLocations && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Location
                  </label>
                  <select
                    value={formData.warehouseLocationId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, warehouseLocationId: e.target.value }))
                    }
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
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Stocktake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

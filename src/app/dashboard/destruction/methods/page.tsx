"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Plus,
  RefreshCw,
  ChevronLeft,
  Loader2,
  Edit,
  CheckCircle,
  XCircle,
  Sparkles,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getErasureMethods, seedDefaultErasureMethods, updateErasureMethod } from "../actions";
import type { ErasureMethodCategory, MediaType, EvidenceType } from "@prisma/client";

const categoryColors: Record<ErasureMethodCategory, string> = {
  CLEAR: "bg-blue-100 text-blue-700",
  PURGE: "bg-purple-100 text-purple-700",
  CRYPTO_ERASE: "bg-indigo-100 text-indigo-700",
  BLOCK_ERASE: "bg-cyan-100 text-cyan-700",
  SECURE_ERASE: "bg-teal-100 text-teal-700",
  SANITIZE: "bg-emerald-100 text-emerald-700",
  DEGAUSS: "bg-amber-100 text-amber-700",
  OTHER: "bg-slate-100 text-slate-700",
};

type ErasureMethod = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: ErasureMethodCategory;
  supportedMediaTypes: MediaType[];
  toolName: string | null;
  toolVersion: string | null;
  procedureRef: string | null;
  requiresEvidence: boolean;
  requiredEvidenceTypes: EvidenceType[];
  requiresVerification: boolean;
  complianceStandards: string[];
  verificationMethod: string | null;
  verificationCriteria: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
};

type Notification = {
  type: "success" | "error";
  message: string;
} | null;

export default function ErasureMethodsPage() {
  const [methods, setMethods] = useState<ErasureMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [notification, setNotification] = useState<Notification>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    // Auto-dismiss after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  const loadMethods = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getErasureMethods(!showInactive);
      if (result.success && result.methods) {
        setMethods(result.methods as unknown as ErasureMethod[]);
      } else {
        showNotification("error", result.error || "Failed to load erasure methods");
      }
    } catch {
      showNotification("error", "An unexpected error occurred while loading methods");
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    setNotification(null);
    try {
      const result = await seedDefaultErasureMethods();
      if (result.success) {
        showNotification("success", result.message || "Default methods loaded successfully");
        await loadMethods();
      } else {
        showNotification("error", result.error || "Failed to load default methods");
      }
    } catch {
      showNotification("error", "An unexpected error occurred while loading default methods");
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setTogglingId(id);
    try {
      const result = await updateErasureMethod(id, { isActive: !currentActive });
      if (result.success) {
        showNotification(
          "success",
          `Method ${currentActive ? "deactivated" : "activated"} successfully`
        );
        await loadMethods();
      } else {
        showNotification("error", result.error || "Failed to update method");
      }
    } catch {
      showNotification("error", "An unexpected error occurred");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
            notification.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {notification.message}
          <button
            onClick={() => setNotification(null)}
            className="ml-auto text-current hover:opacity-70"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/destruction"
            className="rounded-lg p-2 hover:bg-slate-100"
            title="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Erasure Methods</h1>
            <p className="text-sm text-slate-500">
              Configure approved data sanitisation procedures
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMethods}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/destruction/methods/new"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Add Method
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700">Show inactive methods</span>
          </label>
        </CardContent>
      </Card>

      {/* Methods List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : methods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No Erasure Methods</h3>
            <p className="mt-2 text-sm text-slate-500">
              Configure erasure methods to define approved sanitisation procedures
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100"
              >
                {seeding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Load Default Methods
              </button>
              <Link
                href="/dashboard/destruction/methods/new"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                <Plus className="h-4 w-4" />
                Create Custom Method
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {methods.length > 0 && methods.length < 5 && (
            <Card className="border-teal-200 bg-teal-50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-teal-600" />
                  <span className="text-sm text-teal-700">
                    Need more methods? Load industry-standard defaults
                  </span>
                </div>
                <button
                  onClick={handleSeedDefaults}
                  disabled={seeding}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
                >
                  {seeding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Load Defaults
                </button>
              </CardContent>
            </Card>
          )}

          {methods.map((method) => (
            <Card
              key={method.id}
              className={!method.isActive ? "border-slate-200 bg-slate-50 opacity-60" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{method.name}</h3>
                      <span className="font-mono text-xs text-slate-500">({method.code})</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[method.category]}`}
                      >
                        {method.category.replace("_", " ")}
                      </span>
                      {!method.isActive && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    {method.description && (
                      <p className="mt-1 text-sm text-slate-600">{method.description}</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-xs">
                      <div>
                        <span className="text-slate-500">Supported media:</span>{" "}
                        <span className="font-medium text-slate-700">
                          {method.supportedMediaTypes.join(", ")}
                        </span>
                      </div>
                      {method.toolName && (
                        <div>
                          <span className="text-slate-500">Tool:</span>{" "}
                          <span className="font-medium text-slate-700">
                            {method.toolName}
                            {method.toolVersion && ` v${method.toolVersion}`}
                          </span>
                        </div>
                      )}
                      {method.complianceStandards.length > 0 && (
                        <div>
                          <span className="text-slate-500">Standards:</span>{" "}
                          <span className="font-medium text-slate-700">
                            {method.complianceStandards.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs">
                      <span
                        className={`flex items-center gap-1 ${method.requiresEvidence ? "text-teal-600" : "text-slate-400"}`}
                      >
                        {method.requiresEvidence ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        Evidence required
                      </span>
                      <span
                        className={`flex items-center gap-1 ${method.requiresVerification ? "text-teal-600" : "text-slate-400"}`}
                      >
                        {method.requiresVerification ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        Verification required
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(method.id, method.isActive)}
                      disabled={togglingId === method.id}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                        method.isActive
                          ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          : "bg-teal-600 text-white hover:bg-teal-700"
                      }`}
                    >
                      {togglingId === method.id && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      {method.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <Link
                      href={`/dashboard/destruction/methods/${method.id}`}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/dashboard/destruction/methods/${method.id}/edit`}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                      title="Edit method"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

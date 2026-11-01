"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Plus,
  Filter,
  RefreshCw,
  Loader2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAudits } from "../actions";
import type { AuditStatus } from "@prisma/client";

const statusColors: Record<AuditStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  PENDING_REVIEW: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const statusIcons: Record<AuditStatus, typeof CheckCircle> = {
  PLANNED: Calendar,
  IN_PROGRESS: Play,
  PENDING_REVIEW: Clock,
  COMPLETED: CheckCircle,
  CANCELLED: Clock,
};

type AuditItem = {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  auditType: string | null;
  status: AuditStatus;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  auditorName: string | null;
  externalAuditor: boolean;
  totalFindings: number;
  criticalFindings: number;
  majorFindings: number;
  createdAt: Date;
  _count: {
    findings: number;
  };
};

export default function AuditsPage() {
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AuditStatus | "">("");

  const loadAudits = async () => {
    setLoading(true);
    const result = await getAudits({
      status: statusFilter || undefined,
    });
    if (result.success && result.audits) {
      setAudits(result.audits as AuditItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAudits();
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Audits</h1>
          <p className="text-sm text-slate-500">
            Plan and manage internal and external compliance audits
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAudits}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/compliance/audits/new"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            New Audit
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AuditStatus | "")}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Audits List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : audits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardCheck className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No Audits</h3>
              <p className="mt-2 text-sm text-slate-500">
                {statusFilter
                  ? "No audits match your filter"
                  : "No compliance audits have been scheduled"}
              </p>
              {!statusFilter && (
                <Link
                  href="/dashboard/compliance/audits/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  Schedule Audit
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {audits.map((audit) => {
                const StatusIcon = statusIcons[audit.status];
                const hasFindings = audit.totalFindings > 0;
                const hasCritical = audit.criticalFindings > 0;

                return (
                  <Link
                    key={audit.id}
                    href={`/dashboard/compliance/audits/${audit.id}`}
                    className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                      <ClipboardCheck className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">
                          {audit.title}
                        </p>
                        <span className="font-mono text-xs text-slate-500">
                          {audit.reference}
                        </span>
                        {audit.externalAuditor && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            External
                          </span>
                        )}
                      </div>
                      {audit.description && (
                        <p className="mt-1 text-sm text-slate-600 line-clamp-1">
                          {audit.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                        {audit.auditType && <span>{audit.auditType}</span>}
                        {audit.auditorName && <span>Auditor: {audit.auditorName}</span>}
                        {audit.plannedStartDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(audit.plannedStartDate).toLocaleDateString("en-GB")}
                            {audit.plannedEndDate && ` - ${new Date(audit.plannedEndDate).toLocaleDateString("en-GB")}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[audit.status]}`}>
                        <StatusIcon className="h-3 w-3" />
                        {audit.status.replace(/_/g, " ")}
                      </span>
                      {hasFindings && (
                        <div className="flex items-center gap-2 text-xs">
                          {hasCritical && (
                            <span className="flex items-center gap-1 text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              {audit.criticalFindings} critical
                            </span>
                          )}
                          <span className="text-slate-500">
                            {audit.totalFindings} finding{audit.totalFindings !== 1 && "s"}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

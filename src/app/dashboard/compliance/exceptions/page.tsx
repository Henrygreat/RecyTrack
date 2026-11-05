"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertOctagon,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getExceptions } from "../actions";
import type {
  ComplianceExceptionSeverity,
  ComplianceExceptionStatus,
  ComplianceExceptionCategory,
} from "@prisma/client";

const severityColors: Record<ComplianceExceptionSeverity, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-slate-100 text-slate-700 border-slate-200",
};

const statusColors: Record<ComplianceExceptionStatus, string> = {
  OPEN: "bg-red-100 text-red-700",
  INVESTIGATING: "bg-blue-100 text-blue-700",
  PENDING_ACTION: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-100 text-slate-500",
  ESCALATED: "bg-purple-100 text-purple-700",
};

type ExceptionItem = {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: ComplianceExceptionCategory;
  severity: ComplianceExceptionSeverity;
  status: ComplianceExceptionStatus;
  isBlocking: boolean;
  assignedToName: string | null;
  correctiveActionDue: Date | null;
  createdAt: Date;
};

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ComplianceExceptionStatus | "">("");
  const [severityFilter, setSeverityFilter] = useState<ComplianceExceptionSeverity | "">("");
  const [categoryFilter, setCategoryFilter] = useState<ComplianceExceptionCategory | "">("");

  const loadExceptions = async () => {
    setLoading(true);
    const result = await getExceptions({
      status: statusFilter || undefined,
      severity: severityFilter || undefined,
      category: categoryFilter || undefined,
    });
    if (result.success && result.exceptions) {
      setExceptions(result.exceptions as ExceptionItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadExceptions();
  }, [statusFilter, severityFilter, categoryFilter]);

  const isOverdue = (exception: ExceptionItem) => {
    if (!exception.correctiveActionDue) return false;
    return new Date(exception.correctiveActionDue) < new Date() &&
      ["OPEN", "PENDING_ACTION", "INVESTIGATING"].includes(exception.status);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Exceptions</h1>
          <p className="text-sm text-slate-500">
            Track and manage compliance issues and deviations
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadExceptions}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/compliance/exceptions/new"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Report Exception
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as ComplianceExceptionSeverity | "")}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ComplianceExceptionStatus | "")}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="PENDING_ACTION">Pending Action</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="ESCALATED">Escalated</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ComplianceExceptionCategory | "")}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Categories</option>
              <option value="ERASURE_FAILURE">Erasure Failure</option>
              <option value="MISSING_MEDIA">Missing Media</option>
              <option value="SERIAL_MISMATCH">Serial Number Mismatch</option>
              <option value="MISSING_EVIDENCE">Missing Evidence</option>
              <option value="UNAPPROVED_METHOD">Unapproved Method</option>
              <option value="UNVERIFIED_DESTRUCTION">Unverified Destruction</option>
              <option value="OVERDUE_APPROVAL">Overdue Approval</option>
              <option value="CERTIFICATE_ERROR">Certificate Error</option>
              <option value="EXPIRED_POLICY">Expired Policy</option>
              <option value="CUSTODY_DISCREPANCY">Custody Discrepancy</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Exceptions List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : exceptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No Exceptions</h3>
              <p className="mt-2 text-sm text-slate-500">
                {statusFilter || severityFilter || categoryFilter
                  ? "No exceptions match your filters"
                  : "No compliance exceptions have been recorded"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {exceptions.map((exception) => (
                <Link
                  key={exception.id}
                  href={`/dashboard/compliance/exceptions/${exception.id}`}
                  className={`flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors ${
                    exception.severity === "CRITICAL" ? "border-l-4 border-l-red-500" :
                    exception.severity === "HIGH" ? "border-l-4 border-l-orange-500" : ""
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    exception.severity === "CRITICAL" ? "bg-red-100" :
                    exception.severity === "HIGH" ? "bg-orange-100" :
                    exception.severity === "MEDIUM" ? "bg-amber-100" : "bg-slate-100"
                  }`}>
                    {exception.severity === "CRITICAL" ? (
                      <AlertOctagon className="h-5 w-5 text-red-600" />
                    ) : (
                      <AlertTriangle className={`h-5 w-5 ${
                        exception.severity === "HIGH" ? "text-orange-600" :
                        exception.severity === "MEDIUM" ? "text-amber-600" : "text-slate-600"
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">
                        {exception.title}
                      </p>
                      <span className="font-mono text-xs text-slate-500">
                        {exception.reference}
                      </span>
                      {exception.isBlocking && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Blocking
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-1">
                      {exception.description}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span className="capitalize">
                        {exception.category.replace(/_/g, " ").toLowerCase()}
                      </span>
                      {exception.assignedToName && (
                        <span>Assigned to: {exception.assignedToName}</span>
                      )}
                      <span>
                        Created: {new Date(exception.createdAt).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColors[exception.severity]}`}>
                        {exception.severity}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[exception.status]}`}>
                        {exception.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {isOverdue(exception) && (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Overdue
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

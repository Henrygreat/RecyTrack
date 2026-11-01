"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  Archive,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPolicies } from "../actions";
import type { CompliancePolicyStatus } from "@prisma/client";

const statusColors: Record<CompliancePolicyStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-green-100 text-green-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
  SUPERSEDED: "bg-purple-100 text-purple-700",
};

const statusIcons: Record<CompliancePolicyStatus, typeof CheckCircle> = {
  DRAFT: FileText,
  PENDING_APPROVAL: Clock,
  ACTIVE: CheckCircle,
  ARCHIVED: Archive,
  SUPERSEDED: Archive,
};

type PolicyItem = {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  status: CompliancePolicyStatus;
  effectiveDate: Date | null;
  reviewDate: Date | null;
  version: number;
  ownerName: string | null;
  createdAt: Date;
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CompliancePolicyStatus | "">("");
  const [search, setSearch] = useState("");

  const loadPolicies = async () => {
    setLoading(true);
    const result = await getPolicies({
      status: statusFilter || undefined,
      search: search || undefined,
    });
    if (result.success && result.policies) {
      setPolicies(result.policies as PolicyItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPolicies();
  }, [statusFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Policies</h1>
          <p className="text-sm text-slate-500">
            Manage data sanitisation and destruction policies
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadPolicies}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/compliance/policies/new"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            New Policy
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="h-4 w-4 text-slate-400" />
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search policies..."
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CompliancePolicyStatus | "")}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Policies List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : policies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No Policies</h3>
              <p className="mt-2 text-sm text-slate-500">
                {statusFilter || search
                  ? "No policies match your filters"
                  : "Create your first compliance policy"}
              </p>
              {!statusFilter && !search && (
                <Link
                  href="/dashboard/compliance/policies/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  New Policy
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {policies.map((policy) => {
                const StatusIcon = statusIcons[policy.status];
                const isReviewDue = policy.reviewDate && new Date(policy.reviewDate) <= new Date();

                return (
                  <Link
                    key={policy.id}
                    href={`/dashboard/compliance/policies/${policy.id}`}
                    className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">
                          {policy.title}
                        </p>
                        <span className="font-mono text-xs text-slate-500">
                          {policy.reference}
                        </span>
                      </div>
                      {policy.description && (
                        <p className="mt-1 text-sm text-slate-600 line-clamp-1">
                          {policy.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                        <span>Version {policy.version}</span>
                        {policy.ownerName && (
                          <span>Owner: {policy.ownerName}</span>
                        )}
                        {policy.effectiveDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Effective: {new Date(policy.effectiveDate).toLocaleDateString("en-GB")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[policy.status]}`}>
                        <StatusIcon className="h-3 w-3" />
                        {policy.status.replace(/_/g, " ")}
                      </span>
                      {isReviewDue && policy.status === "ACTIVE" && (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Review due
                        </span>
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

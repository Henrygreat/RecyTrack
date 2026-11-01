"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Award,
  AlertTriangle,
  FileText,
  ClipboardCheck,
  AlertOctagon,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getComplianceStats } from "./actions";

type Stats = {
  totalCertificates: number;
  pendingApprovalCerts: number;
  revokedCerts: number;
  failedErasures: number;
  openExceptions: number;
  criticalExceptions: number;
  overdueActions: number;
  upcomingPolicyReviews: number;
  activeAudits: number;
  openFindings: number;
};

export default function ComplianceDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  const loadStats = async () => {
    setLoading(true);
    const result = await getComplianceStats();
    if (result.success && result.stats) {
      setStats(result.stats);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Centre</h1>
          <p className="text-sm text-slate-500">
            Monitor compliance status, exceptions, and audit findings
          </p>
        </div>
        <button
          onClick={loadStats}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Certificates */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.totalCertificates || 0}
                </p>
                <p className="text-sm text-slate-500">Active Certificates</p>
              </div>
              <Award className="h-10 w-10 text-green-500" />
            </div>
            {(stats?.pendingApprovalCerts || 0) > 0 && (
              <div className="mt-2 text-sm text-amber-600">
                {stats?.pendingApprovalCerts} pending approval
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Exceptions */}
        <Card className={`border-l-4 ${stats?.openExceptions ? "border-l-amber-500" : "border-l-slate-200"}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.openExceptions || 0}
                </p>
                <p className="text-sm text-slate-500">Open Exceptions</p>
              </div>
              <AlertTriangle className={`h-10 w-10 ${stats?.openExceptions ? "text-amber-500" : "text-slate-300"}`} />
            </div>
            {(stats?.criticalExceptions || 0) > 0 && (
              <div className="mt-2 text-sm text-red-600">
                {stats?.criticalExceptions} critical
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Actions */}
        <Card className={`border-l-4 ${stats?.overdueActions ? "border-l-red-500" : "border-l-slate-200"}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.overdueActions || 0}
                </p>
                <p className="text-sm text-slate-500">Overdue Actions</p>
              </div>
              <Clock className={`h-10 w-10 ${stats?.overdueActions ? "text-red-500" : "text-slate-300"}`} />
            </div>
          </CardContent>
        </Card>

        {/* Active Audits */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.activeAudits || 0}
                </p>
                <p className="text-sm text-slate-500">Active Audits</p>
              </div>
              <ClipboardCheck className="h-10 w-10 text-blue-500" />
            </div>
            {(stats?.openFindings || 0) > 0 && (
              <div className="mt-2 text-sm text-amber-600">
                {stats?.openFindings} open findings
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance Health */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertOctagon className="h-5 w-5 text-red-500" />
              Compliance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(stats?.criticalExceptions || 0) > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 border border-red-200">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">Critical Exceptions</p>
                    <p className="text-sm text-red-600">
                      {stats?.criticalExceptions} critical exception{stats?.criticalExceptions !== 1 && "s"} require immediate attention
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/compliance/exceptions?severity=CRITICAL"
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  View
                </Link>
              </div>
            )}

            {(stats?.overdueActions || 0) > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3 border border-amber-200">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">Overdue Corrective Actions</p>
                    <p className="text-sm text-amber-600">
                      {stats?.overdueActions} action{stats?.overdueActions !== 1 && "s"} past due date
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/compliance/exceptions?overdue=true"
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  View
                </Link>
              </div>
            )}

            {(stats?.failedErasures || 0) > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3 border border-amber-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">Failed Erasures</p>
                    <p className="text-sm text-amber-600">
                      {stats?.failedErasures} erasure job{stats?.failedErasures !== 1 && "s"} failed
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(stats?.upcomingPolicyReviews || 0) > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3 border border-blue-200">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Upcoming Policy Reviews</p>
                    <p className="text-sm text-blue-600">
                      {stats?.upcomingPolicyReviews} polic{stats?.upcomingPolicyReviews !== 1 ? "ies" : "y"} due for review
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/compliance/policies"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View
                </Link>
              </div>
            )}

            {!stats?.criticalExceptions && !stats?.overdueActions && !stats?.failedErasures && !stats?.upcomingPolicyReviews && (
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm">No compliance alerts</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/dashboard/certificates"
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="font-medium text-slate-900">Certificates</p>
                  <p className="text-sm text-slate-500">Manage sanitisation certificates</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </Link>

            <Link
              href="/dashboard/compliance/policies"
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-900">Policies</p>
                  <p className="text-sm text-slate-500">View and manage compliance policies</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </Link>

            <Link
              href="/dashboard/compliance/exceptions"
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-slate-900">Exceptions</p>
                  <p className="text-sm text-slate-500">Track compliance exceptions</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </Link>

            <Link
              href="/dashboard/compliance/audits"
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-slate-900">Audits</p>
                  <p className="text-sm text-slate-500">Manage compliance audits</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

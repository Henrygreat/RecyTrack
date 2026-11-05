import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Mail,
  Shield,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Administrator",
  OPERATIONS: "Operations Manager",
  WAREHOUSE: "Warehouse Staff",
  DRIVER: "Driver",
  CUSTOMER: "Customer",
};

const ROLE_COLORS: Record<Role, string> = {
  OWNER: "bg-purple-100 text-purple-700 border-purple-200",
  ADMIN: "bg-blue-100 text-blue-700 border-blue-200",
  OPERATIONS: "bg-teal-100 text-teal-700 border-teal-200",
  WAREHOUSE: "bg-amber-100 text-amber-700 border-amber-200",
  DRIVER: "bg-slate-100 text-slate-700 border-slate-200",
  CUSTOMER: "bg-gray-100 text-gray-700 border-gray-200",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;
  const { organizationId } = await requireMember(undefined, ADMIN_ROLES);

  const membership = await prisma.membership.findFirst({
    where: {
      userId: id,
      organizationId,
      role: { not: "CUSTOMER" },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          lastLoginAt: true,
        },
      },
      organization: {
        select: { name: true },
      },
      deactivatedBy: {
        select: { name: true, email: true },
      },
    },
  });

  if (!membership) {
    notFound();
  }

  // Get recent audit logs for this user
  const recentActivity = await prisma.auditLog.findMany({
    where: {
      organizationId,
      actorUserId: id,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/users"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Users
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-2xl font-bold text-teal-700">
            {membership.user.name?.[0]?.toUpperCase() || membership.user.email[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {membership.user.name || "Unnamed User"}
            </h1>
            <p className="text-gray-500">{membership.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {membership.isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              <CheckCircle className="h-4 w-4" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
              <XCircle className="h-4 w-4" />
              Inactive
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="font-semibold text-gray-900">User Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1 flex items-center gap-2 text-gray-900">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {membership.user.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <p className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${ROLE_COLORS[membership.role]}`}
                    >
                      <Shield className="h-3 w-3" />
                      {ROLE_LABELS[membership.role]}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Organization</p>
                  <p className="mt-1 text-gray-900">{membership.organization.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Account Created</p>
                  <p className="mt-1 flex items-center gap-2 text-gray-900">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatDate(membership.user.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Joined Organization</p>
                  <p className="mt-1 flex items-center gap-2 text-gray-900">
                    <User className="h-4 w-4 text-gray-400" />
                    {formatDate(membership.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Login</p>
                  <p className="mt-1 flex items-center gap-2 text-gray-900">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {formatDate(membership.user.lastLoginAt)}
                  </p>
                </div>
              </div>

              {!membership.isActive && membership.deactivatedAt && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">Account Deactivated</p>
                  <p className="mt-1 text-sm text-red-600">
                    Deactivated on {formatDate(membership.deactivatedAt)}
                    {membership.deactivatedBy && (
                      <> by {membership.deactivatedBy.name || membership.deactivatedBy.email}</>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {log.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.entityType} {log.entityId ? `#${log.entityId.slice(-8)}` : ""}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400">
                        {log.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-gray-500 py-8">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Actions</span>
                <span className="font-medium text-gray-900">{recentActivity.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span
                  className={`text-sm font-medium ${
                    membership.isActive ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {membership.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Role Permissions */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Role Permissions</h3>
            <div className="space-y-2 text-sm">
              {membership.role === "OWNER" && (
                <>
                  <p className="text-gray-600">Full administrative access</p>
                  <p className="text-gray-600">User management</p>
                  <p className="text-gray-600">Organization settings</p>
                  <p className="text-gray-600">All operational features</p>
                </>
              )}
              {membership.role === "ADMIN" && (
                <>
                  <p className="text-gray-600">User management (non-owners)</p>
                  <p className="text-gray-600">Organization settings</p>
                  <p className="text-gray-600">All operational features</p>
                </>
              )}
              {membership.role === "OPERATIONS" && (
                <>
                  <p className="text-gray-600">Manage customers</p>
                  <p className="text-gray-600">Manage collections</p>
                  <p className="text-gray-600">Manage routes</p>
                  <p className="text-gray-600">View reports</p>
                </>
              )}
              {membership.role === "WAREHOUSE" && (
                <>
                  <p className="text-gray-600">Process assets</p>
                  <p className="text-gray-600">Run inspections</p>
                  <p className="text-gray-600">Manage warehouse</p>
                  <p className="text-gray-600">Scan operations</p>
                </>
              )}
              {membership.role === "DRIVER" && (
                <>
                  <p className="text-gray-600">View assigned collections</p>
                  <p className="text-gray-600">Update collection status</p>
                  <p className="text-gray-600">Scan assets</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

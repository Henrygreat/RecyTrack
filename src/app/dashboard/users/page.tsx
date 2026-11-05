import Link from "next/link";
import {
  UserPlus,
  Users,
  Mail,
  Clock,
  Shield,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { UserRowActions } from "./components/user-row-actions";
import { InvitationRowActions } from "./components/invitation-row-actions";

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
  OWNER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  OPERATIONS: "bg-teal-100 text-teal-700",
  WAREHOUSE: "bg-amber-100 text-amber-700",
  DRIVER: "bg-slate-100 text-slate-700",
  CUSTOMER: "bg-gray-100 text-gray-700",
};

export default async function UsersPage() {
  const { organizationId, membership: currentMembership } = await requireMember(
    undefined,
    ADMIN_ROLES
  );

  const [memberships, pendingInvitations] = await Promise.all([
    prisma.membership.findMany({
      where: {
        organizationId,
        role: { not: "CUSTOMER" },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    }),
    prisma.staffInvitation.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        revokedAt: null,
      },
      include: {
        invitedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const now = new Date();
  const activeUsers = memberships.filter((m) => m.isActive);
  const inactiveUsers = memberships.filter((m) => !m.isActive);
  const activePendingInvitations = pendingInvitations.filter((inv) => inv.expiresAt > now);
  const expiredInvitations = pendingInvitations.filter((inv) => inv.expiresAt <= now);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">
            Manage staff access and permissions for your organization
          </p>
        </div>
        <Link
          href="/dashboard/users/invite"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          <UserPlus className="h-4 w-4" />
          Invite Staff
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-100 p-2">
              <Users className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeUsers.length}</p>
              <p className="text-sm text-gray-500">Active Users</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Mail className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activePendingInvitations.length}</p>
              <p className="text-sm text-gray-500">Pending Invitations</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-2">
              <XCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{inactiveUsers.length}</p>
              <p className="text-sm text-gray-500">Inactive Users</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{expiredInvitations.length}</p>
              <p className="text-sm text-gray-500">Expired Invitations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Mail className="h-5 w-5 text-amber-500" />
              Pending Invitations
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-sm font-medium text-gray-500">
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Invited By</th>
                  <th className="px-6 py-3">Sent</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingInvitations.map((invitation) => {
                  const isExpired = invitation.expiresAt <= now;
                  return (
                    <tr key={invitation.id} className={isExpired ? "bg-gray-50" : ""}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{invitation.email}</p>
                          {invitation.name && (
                            <p className="text-sm text-gray-500">{invitation.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${ROLE_COLORS[invitation.role]}`}
                        >
                          {ROLE_LABELS[invitation.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {invitation.invitedBy.name || invitation.invitedBy.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {invitation.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                            <Clock className="h-3 w-3" />
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <InvitationRowActions invitationId={invitation.id} isExpired={isExpired} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Users */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Active Users ({activeUsers.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-sm font-medium text-gray-500">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3">Last Login</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeUsers.map((m) => (
                <tr key={m.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 font-medium text-teal-700">
                        {m.user.name?.[0]?.toUpperCase() || m.user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {m.user.name || "—"}
                          {m.userId === currentMembership.userId && (
                            <span className="ml-2 text-xs text-gray-400">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{m.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${ROLE_COLORS[m.role]}`}
                    >
                      {ROLE_LABELS[m.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {m.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {m.user.lastLoginAt
                      ? m.user.lastLoginAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Never"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <UserRowActions
                      userId={m.user.id}
                      membershipId={m.id}
                      role={m.role}
                      isCurrentUser={m.userId === currentMembership.userId}
                      currentUserRole={currentMembership.role}
                      isActive={m.isActive}
                    />
                  </td>
                </tr>
              ))}
              {activeUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No active users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inactive Users */}
      {inactiveUsers.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <XCircle className="h-5 w-5 text-gray-400" />
              Inactive Users ({inactiveUsers.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-sm font-medium text-gray-500">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Deactivated</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inactiveUsers.map((m) => (
                  <tr key={m.id} className="bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 font-medium text-gray-500">
                          {m.user.name?.[0]?.toUpperCase() || m.user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-500">{m.user.name || "—"}</p>
                          <p className="text-sm text-gray-400">{m.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
                        {ROLE_LABELS[m.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {m.deactivatedAt
                        ? m.deactivatedAt.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <UserRowActions
                        userId={m.user.id}
                        membershipId={m.id}
                        role={m.role}
                        isCurrentUser={false}
                        currentUserRole={currentMembership.role}
                        isActive={m.isActive}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

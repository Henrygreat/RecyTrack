"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Shield,
  UserPlus,
  Loader2,
  Mail,
  Clock,
  XCircle,
  Building,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  getPortalUsers,
  revokePortalUserAccess,
  cancelPortalInvitation,
} from "../actions";
import type { CustomerRole } from "@prisma/client";

const roleLabels: Record<CustomerRole, string> = {
  CUSTOMER_ADMIN: "Administrator",
  CUSTOMER_USER: "User",
};

const roleColors: Record<CustomerRole, string> = {
  CUSTOMER_ADMIN: "bg-purple-100 text-purple-700",
  CUSTOMER_USER: "bg-slate-100 text-slate-700",
};

type UserData = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: CustomerRole;
  createdAt: Date;
  sites: Array<{ id: string; name: string }>;
};

type InvitationData = {
  id: string;
  email: string;
  role: CustomerRole;
  createdAt: Date;
  expiresAt: Date;
};

export default function PortalUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    const result = await getPortalUsers();
    if (result.success) {
      setUsers(result.users as UserData[]);
      setInvitations(result.invitations as InvitationData[]);
    } else {
      setError(result.error || "Failed to load users");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRevokeAccess = async (accessId: string) => {
    if (!confirm("Are you sure you want to revoke this user's access?")) return;

    setActionLoading(accessId);
    const result = await revokePortalUserAccess(accessId);
    if (result.success) {
      setUsers(users.filter((u) => u.id !== accessId));
    } else {
      alert(result.error || "Failed to revoke access");
    }
    setActionLoading(null);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return;

    setActionLoading(invitationId);
    const result = await cancelPortalInvitation(invitationId);
    if (result.success) {
      setInvitations(invitations.filter((i) => i.id !== invitationId));
    } else {
      alert(result.error || "Failed to cancel invitation");
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error === "Unauthorized") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage portal access for your team</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Access Restricted
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Only Customer Administrators can manage users. Contact your administrator
              if you need to add or remove team members.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage portal access for your team</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-300 mx-auto" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Error</h3>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
            <button
              onClick={loadUsers}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage portal access for your team</p>
        </div>
        <button
          onClick={loadUsers}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Administrator Access</p>
              <p className="text-sm text-blue-700 mt-1">
                As a Customer Administrator, you can manage access for your team.
                Contact your service provider to invite new users to your organization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Active Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No users have access yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <span className="text-sm font-medium text-slate-600">
                        {user.name?.charAt(0)?.toUpperCase() ||
                          user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {user.name || "No name"}
                      </p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                      {user.sites.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Building className="h-3 w-3 text-slate-400" />
                          <p className="text-xs text-slate-500">
                            {user.sites.map((s) => s.name).join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[user.role]}`}
                    >
                      {roleLabels[user.role]}
                    </span>
                    {user.role !== "CUSTOMER_ADMIN" && (
                      <button
                        onClick={() => handleRevokeAccess(user.id)}
                        disabled={actionLoading === user.id}
                        className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Revoke"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" />
              Pending Invitations ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {invitations.map((invitation) => {
                const isExpired = new Date(invitation.expiresAt) < new Date();
                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                        <Mail className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {invitation.email}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>
                            Sent:{" "}
                            {new Date(invitation.createdAt).toLocaleDateString(
                              "en-GB"
                            )}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span
                            className={
                              isExpired ? "text-red-500" : "text-slate-500"
                            }
                          >
                            {isExpired ? (
                              "Expired"
                            ) : (
                              <>
                                Expires:{" "}
                                {new Date(
                                  invitation.expiresAt
                                ).toLocaleDateString("en-GB")}
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[invitation.role]}`}
                      >
                        {roleLabels[invitation.role]}
                      </span>
                      <button
                        onClick={() => handleCancelInvitation(invitation.id)}
                        disabled={actionLoading === invitation.id}
                        className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {actionLoading === invitation.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            Cancel
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  UserCog,
  UserMinus,
  UserPlus,
  Shield,
  Eye,
  Loader2,
} from "lucide-react";
import { Role } from "@prisma/client";
import { deactivateUser, reactivateUser, updateUserRole } from "../actions";
import { ASSIGNABLE_STAFF_ROLES, ROLE_LABELS, ROLE_HIERARCHY } from "../constants";

interface UserRowActionsProps {
  userId: string;
  membershipId: string;
  role: Role;
  isCurrentUser: boolean;
  currentUserRole: Role;
  isActive: boolean;
}

export function UserRowActions({
  userId,
  membershipId,
  role,
  isCurrentUser,
  currentUserRole,
  isActive,
}: UserRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Can modify if: not self, and target role is below actor's role (unless actor is OWNER)
  const canModify =
    !isCurrentUser &&
    (currentUserRole === "OWNER" || ROLE_HIERARCHY[role] < ROLE_HIERARCHY[currentUserRole]);

  // Can change role if: can modify and target is not OWNER
  const canChangeRole = canModify && role !== "OWNER";

  // Available roles to assign (must be below actor's role)
  const availableRoles = ASSIGNABLE_STAFF_ROLES.filter(
    (r) => ROLE_HIERARCHY[r] < ROLE_HIERARCHY[currentUserRole]
  );

  const handleDeactivate = () => {
    setError(null);
    startTransition(async () => {
      const result = await deactivateUser(userId);
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  const handleReactivate = () => {
    setError(null);
    startTransition(async () => {
      const result = await reactivateUser(userId);
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  const handleRoleChange = (newRole: Role) => {
    setError(null);
    const formData = new FormData();
    formData.set("membershipId", membershipId);
    formData.set("role", newRole);

    startTransition(async () => {
      const result = await updateUserRole({}, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setShowRoleModal(false);
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  if (isCurrentUser) {
    return (
      <span className="text-sm text-gray-400">—</span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-2 hover:bg-gray-100"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        ) : (
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {error && (
              <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-b border-gray-100">
                {error}
              </div>
            )}

            <a
              href={`/dashboard/users/${userId}`}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Eye className="h-4 w-4" />
              View Details
            </a>

            {canChangeRole && availableRoles.length > 0 && (
              <button
                onClick={() => setShowRoleModal(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Shield className="h-4 w-4" />
                Change Role
              </button>
            )}

            {canModify && (
              <>
                <div className="my-1 border-t border-gray-100" />
                {isActive ? (
                  <button
                    onClick={handleDeactivate}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    disabled={isPending}
                  >
                    <UserMinus className="h-4 w-4" />
                    Deactivate User
                  </button>
                ) : (
                  <button
                    onClick={handleReactivate}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                    disabled={isPending}
                  >
                    <UserPlus className="h-4 w-4" />
                    Reactivate User
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change User Role</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select a new role for this user. This will take effect immediately.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              {availableRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  disabled={isPending || r === role}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                    r === role
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium text-gray-900">{ROLE_LABELS[r]}</span>
                  {r === role && (
                    <span className="text-xs text-teal-600">Current</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setError(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

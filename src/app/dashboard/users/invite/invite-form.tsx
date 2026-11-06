"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Mail, User, Shield, Loader2, CheckCircle } from "lucide-react";
import { Role } from "@prisma/client";
import { inviteStaffMember, type ActionState } from "../actions";
import { ASSIGNABLE_STAFF_ROLES, ROLE_LABELS, ROLE_HIERARCHY, ROLE_DESCRIPTIONS } from "../constants";

interface InviteStaffFormProps {
  currentUserRole: Role;
}

export function InviteStaffForm({ currentUserRole }: InviteStaffFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(inviteStaffMember, {});

  // Roles this user can assign (below their own level)
  const availableRoles = ASSIGNABLE_STAFF_ROLES.filter(
    (r) => ROLE_HIERARCHY[r] < ROLE_HIERARCHY[currentUserRole]
  );

  useEffect(() => {
    if (state.success) {
      // Redirect after short delay to show success message
      const timer = setTimeout(() => {
        router.push("/dashboard/users");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.success, router]);

  if (state.success) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Invitation Sent</h3>
        <p className="mt-1 text-sm text-gray-500">
          The invitation email has been sent. Redirecting...
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
          Email Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="colleague@company.com"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        {state.fieldErrors?.email && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p>
        )}
      </div>

      {/* Name (optional) */}
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
          Full Name <span className="text-gray-400">(optional)</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            id="name"
            name="name"
            placeholder="John Smith"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          They can update their name when they accept the invitation
        </p>
      </div>

      {/* Role */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          <Shield className="mr-1 inline h-4 w-4" />
          Role <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {availableRoles.map((role) => (
            <label
              key={role}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50"
            >
              <input
                type="radio"
                name="role"
                value={role}
                defaultChecked={role === "OPERATIONS"}
                className="mt-0.5 h-4 w-4 border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <p className="font-medium text-gray-900">{ROLE_LABELS[role]}</p>
                <p className="text-sm text-gray-500">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
            </label>
          ))}
        </div>
        {state.fieldErrors?.role && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.role}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || availableRoles.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Send Invitation
            </>
          )}
        </button>
      </div>

      {availableRoles.length === 0 && (
        <p className="text-sm text-amber-600">
          You cannot invite staff members with your current role level.
        </p>
      )}
    </form>
  );
}

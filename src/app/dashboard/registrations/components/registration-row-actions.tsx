"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { RegistrationStatus } from "@prisma/client";
import { approveRegistration, rejectRegistration } from "../actions";

interface RegistrationRowActionsProps {
  registrationId: string;
  status: RegistrationStatus;
  companyName: string;
  contactName: string;
  email: string;
}

export function RegistrationRowActions({
  registrationId,
  status,
  companyName,
  contactName,
  email,
}: RegistrationRowActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveRegistration(registrationId);
      if (!result.success) {
        setError(result.error || "Failed to approve registration");
      }
    });
  };

  const handleReject = () => {
    setError(null);
    startTransition(async () => {
      const result = await rejectRegistration(registrationId, rejectionReason);
      if (!result.success) {
        setError(result.error || "Failed to reject registration");
      } else {
        setShowRejectModal(false);
        setRejectionReason("");
      }
    });
  };

  // Only show actions for pending approval status
  if (status !== "PENDING_APPROVAL") {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {error && (
          <span className="text-xs text-rose-600">{error}</span>
        )}
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Approve
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />
          Reject
        </button>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Reject Registration
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to reject the registration for{" "}
              <strong>{companyName}</strong>?
            </p>

            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-700">
                <strong>Contact:</strong> {contactName}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Email:</strong> {email}
              </p>
            </div>

            <div className="mt-4">
              <label
                htmlFor="rejectionReason"
                className="block text-sm font-medium text-gray-700"
              >
                Reason for rejection (optional)
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason that will be included in the notification email..."
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-rose-600">{error}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                  setError(null);
                }}
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  "Reject Registration"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

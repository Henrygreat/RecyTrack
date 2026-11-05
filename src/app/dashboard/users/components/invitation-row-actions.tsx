"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, RefreshCw, XCircle, Loader2 } from "lucide-react";
import { resendStaffInvitation, revokeStaffInvitation } from "../actions";

interface InvitationRowActionsProps {
  invitationId: string;
  isExpired: boolean;
}

export function InvitationRowActions({ invitationId, isExpired }: InvitationRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleResend = () => {
    setError(null);
    startTransition(async () => {
      const result = await resendStaffInvitation(invitationId);
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  const handleRevoke = () => {
    setError(null);
    startTransition(async () => {
      const result = await revokeStaffInvitation(invitationId);
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

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
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {error && (
              <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-b border-gray-100">
                {error}
              </div>
            )}

            <button
              onClick={handleResend}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              disabled={isPending}
            >
              <RefreshCw className="h-4 w-4" />
              {isExpired ? "Resend Invitation" : "Resend Email"}
            </button>

            <div className="my-1 border-t border-gray-100" />

            <button
              onClick={handleRevoke}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              disabled={isPending}
            >
              <XCircle className="h-4 w-4" />
              Revoke Invitation
            </button>
          </div>
        </>
      )}
    </div>
  );
}

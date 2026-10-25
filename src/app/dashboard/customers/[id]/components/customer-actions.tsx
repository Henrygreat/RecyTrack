"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit, Archive, RotateCcw, MoreVertical } from "lucide-react";
import { archiveCustomer, reactivateCustomer } from "../../actions";

interface CustomerActionsProps {
  customerId: string;
  customerStatus: "ACTIVE" | "ARCHIVED";
}

export function CustomerActions({ customerId, customerStatus }: CustomerActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this customer? They will no longer appear in active customer lists.")) {
      return;
    }

    setShowMenu(false);
    startTransition(async () => {
      const result = await archiveCustomer(customerId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleReactivate = async () => {
    setShowMenu(false);
    startTransition(async () => {
      const result = await reactivateCustomer(customerId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      {error && (
        <span style={{ color: "#dc2626", fontSize: "0.875rem" }}>{error}</span>
      )}

      <Link
        href={`/dashboard/customers/${customerId}/edit`}
        className="btn btn-secondary"
        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
      >
        <Edit className="w-4 h-4" />
        Edit
      </Link>

      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="btn btn-secondary"
          style={{ padding: "0.5rem" }}
          disabled={isPending}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 40,
              }}
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: "0.25rem",
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                zIndex: 50,
                minWidth: "160px",
              }}
            >
              {customerStatus === "ACTIVE" ? (
                <button
                  onClick={handleArchive}
                  disabled={isPending}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    width: "100%",
                    textAlign: "left",
                    fontSize: "0.875rem",
                    color: "#dc2626",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: isPending ? "not-allowed" : "pointer",
                  }}
                >
                  <Archive className="w-4 h-4" />
                  Archive Customer
                </button>
              ) : (
                <button
                  onClick={handleReactivate}
                  disabled={isPending}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    width: "100%",
                    textAlign: "left",
                    fontSize: "0.875rem",
                    color: "#059669",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: isPending ? "not-allowed" : "pointer",
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reactivate Customer
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

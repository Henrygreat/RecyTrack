"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Check,
  X,
  AlertTriangle,
  Truck,
  Calendar,
  Loader2,
} from "lucide-react";
import { changeCollectionStatus, assignDriver, cancelCollection } from "../actions";
import { STATUS_LABELS } from "@/lib/collections";
import type { CollectionStatus } from "@prisma/client";

interface CollectionActionsProps {
  collectionId: string;
  currentStatus: CollectionStatus;
  availableTransitions: CollectionStatus[];
  drivers: { id: string; name: string }[];
}

export function CollectionActions({
  collectionId,
  currentStatus,
  availableTransitions,
  drivers,
}: CollectionActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleStatusChange = (newStatus: CollectionStatus) => {
    setShowStatusMenu(false);
    const formData = new FormData();
    formData.set("id", collectionId);
    formData.set("status", newStatus);

    startTransition(async () => {
      const result = await changeCollectionStatus({}, formData);
      if (result.error) {
        alert(result.error);
      }
      router.refresh();
    });
  };

  const handleAssign = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", collectionId);

    startTransition(async () => {
      const result = await assignDriver({}, formData);
      if (result.error) {
        alert(result.error);
      } else {
        setShowAssignModal(false);
      }
      router.refresh();
    });
  };

  const handleCancel = (reason: string) => {
    startTransition(async () => {
      const result = await cancelCollection(collectionId, reason);
      if (result.error) {
        alert(result.error);
      } else {
        setShowCancelModal(false);
      }
      router.refresh();
    });
  };

  // Determine primary action
  const primaryAction = availableTransitions.find((t) => t !== "CANCELLED" && t !== "EXCEPTION");
  const canCancel = availableTransitions.includes("CANCELLED");
  const canAssign = ["APPROVED", "SCHEDULED", "ASSIGNED"].includes(currentStatus);

  return (
    <div style={{ display: "flex", gap: "0.5rem", position: "relative" }}>
      {/* Primary Action Button */}
      {primaryAction && (
        <button
          onClick={() => handleStatusChange(primaryAction)}
          disabled={isPending}
          className="btn"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {STATUS_LABELS[primaryAction]}
        </button>
      )}

      {/* Assign Driver */}
      {canAssign && drivers.length > 0 && (
        <button
          onClick={() => setShowAssignModal(true)}
          disabled={isPending}
          className="btn btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Truck className="w-4 h-4" />
          Assign
        </button>
      )}

      {/* More Actions Dropdown */}
      {(availableTransitions.length > 1 || canCancel) && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            disabled={isPending}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            More
            <ChevronDown className="w-4 h-4" />
          </button>

          {showStatusMenu && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 40 }}
                onClick={() => setShowStatusMenu(false)}
              />
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "0.25rem",
                  backgroundColor: "white",
                  borderRadius: "0.375rem",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  border: "1px solid #e2e8f0",
                  minWidth: "180px",
                  zIndex: 50,
                }}
              >
                {availableTransitions
                  .filter((t) => t !== primaryAction)
                  .map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      style={{
                        width: "100%",
                        padding: "0.5rem 1rem",
                        textAlign: "left",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        color: status === "CANCELLED" || status === "EXCEPTION" ? "#dc2626" : "#0f172a",
                      }}
                    >
                      {status === "CANCELLED" && <X className="w-4 h-4" />}
                      {status === "EXCEPTION" && <AlertTriangle className="w-4 h-4" />}
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Cancel Button (if primary action not available) */}
      {canCancel && !primaryAction && (
        <button
          onClick={() => setShowCancelModal(true)}
          disabled={isPending}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            border: "1px solid #fecaca",
            borderRadius: "0.375rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      )}

      {/* Assign Driver Modal */}
      {showAssignModal && (
        <Modal title="Assign Driver" onClose={() => setShowAssignModal(false)}>
          <form onSubmit={handleAssign}>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div className="field">
                <label htmlFor="driverId">Driver</label>
                <select id="driverId" name="driverId">
                  <option value="">Select driver...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="driverName">Or enter driver name</label>
                <input id="driverName" name="driverName" placeholder="Driver name" />
              </div>

              <div className="field">
                <label htmlFor="vehicleReg">Vehicle Registration</label>
                <input id="vehicleReg" name="vehicleReg" placeholder="e.g., AB12 CDE" />
              </div>

              <div className="field">
                <label htmlFor="scheduledDate">Scheduled Date</label>
                <input
                  id="scheduledDate"
                  name="scheduledDate"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="btn btn-secondary"
                disabled={isPending}
              >
                Cancel
              </button>
              <button type="submit" className="btn" disabled={isPending}>
                {isPending ? "Assigning..." : "Assign Driver"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Collection Modal */}
      {showCancelModal && (
        <Modal title="Cancel Collection" onClose={() => setShowCancelModal(false)}>
          <CancelForm
            onCancel={handleCancel}
            onClose={() => setShowCancelModal(false)}
            isPending={isPending}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 50,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "white",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          minWidth: "400px",
          maxWidth: "90vw",
          zIndex: 51,
          boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        }}
      >
        <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>{title}</h3>
        {children}
      </div>
    </>
  );
}

function CancelForm({
  onCancel,
  onClose,
  isPending,
}: {
  onCancel: (reason: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div>
      <p style={{ color: "#64748b", marginBottom: "1rem" }}>
        Are you sure you want to cancel this collection? This action cannot be undone.
      </p>

      <div className="field">
        <label htmlFor="cancelReason">Reason for cancellation</label>
        <textarea
          id="cancelReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Enter reason..."
        />
      </div>

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isPending}>
          Keep Collection
        </button>
        <button
          type="button"
          onClick={() => onCancel(reason)}
          disabled={isPending}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: isPending ? "not-allowed" : "pointer",
          }}
        >
          {isPending ? "Cancelling..." : "Cancel Collection"}
        </button>
      </div>
    </div>
  );
}

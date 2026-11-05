"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Package,
  User,
  Calendar,
  FileText,
} from "lucide-react";
import { createExceptionFromForm, type ExceptionFormState } from "../../actions";
import type {
  Asset,
  User as PrismaUser,
  Customer,
} from "@prisma/client";

const CATEGORY_LABELS: Record<string, string> = {
  ERASURE_FAILURE: "Erasure Failure",
  MISSING_MEDIA: "Missing Media",
  SERIAL_MISMATCH: "Serial Number Mismatch",
  MISSING_EVIDENCE: "Missing Evidence",
  UNAPPROVED_METHOD: "Unapproved Method",
  UNVERIFIED_DESTRUCTION: "Unverified Destruction",
  OVERDUE_APPROVAL: "Overdue Approval",
  CERTIFICATE_ERROR: "Certificate Error",
  EXPIRED_POLICY: "Expired Policy",
  CUSTODY_DISCREPANCY: "Custody Discrepancy",
  OTHER: "Other",
};

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  LOW: { label: "Low", color: "#64748b" },
  MEDIUM: { label: "Medium", color: "#f59e0b" },
  HIGH: { label: "High", color: "#f97316" },
  CRITICAL: { label: "Critical", color: "#dc2626" },
};

interface ExceptionFormProps {
  assets: Pick<Asset, "id" | "assetTag" | "manufacturer" | "model">[];
  users: Pick<PrismaUser, "id" | "name" | "email">[];
  customers: Pick<Customer, "id" | "name">[];
}

export function ExceptionForm({
  assets,
  users,
  customers,
}: ExceptionFormProps) {
  const router = useRouter();
  const [selectedSeverity, setSelectedSeverity] = useState<string>("");

  const [state, formAction, isPending] = useActionState<ExceptionFormState, FormData>(
    createExceptionFromForm,
    {}
  );

  useEffect(() => {
    if (state.success && state.exceptionId) {
      router.push(`/dashboard/compliance/exceptions/${state.exceptionId}`);
    }
  }, [state.success, state.exceptionId, router]);

  return (
    <form action={formAction} className="form">
      {/* Error Display */}
      {state.error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.375rem",
            color: "#b91c1c",
            marginBottom: "1rem",
          }}
        >
          {state.error}
        </div>
      )}

      {/* Success Display */}
      {state.success && state.reference && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "0.375rem",
            color: "#15803d",
            marginBottom: "1rem",
          }}
        >
          Exception reported successfully. Reference: <strong>{state.reference}</strong>
        </div>
      )}

      {/* Exception Details */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertTriangle className="w-4 h-4 text-teal-600" />
          Exception Details
        </legend>

        <div className="field">
          <label htmlFor="title">Exception Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            required
            maxLength={200}
            placeholder="Brief summary of the exception"
          />
        </div>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="category">Category *</label>
            <select id="category" name="category" required>
              <option value="">Select category</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="severity">Severity *</label>
            <select
              id="severity"
              name="severity"
              required
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
            >
              <option value="">Select severity</option>
              {Object.entries(SEVERITY_LABELS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSeverity && (
          <div
            style={{
              padding: "0.5rem 0.75rem",
              backgroundColor:
                selectedSeverity === "CRITICAL"
                  ? "#fef2f2"
                  : selectedSeverity === "HIGH"
                  ? "#fff7ed"
                  : selectedSeverity === "MEDIUM"
                  ? "#fffbeb"
                  : "#f8fafc",
              border: `1px solid ${
                selectedSeverity === "CRITICAL"
                  ? "#fecaca"
                  : selectedSeverity === "HIGH"
                  ? "#fed7aa"
                  : selectedSeverity === "MEDIUM"
                  ? "#fde68a"
                  : "#e2e8f0"
              }`,
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}
          >
            {selectedSeverity === "CRITICAL" && (
              <span style={{ color: "#dc2626" }}>
                <strong>Critical:</strong> Immediate action required. May block certificate issuance.
              </span>
            )}
            {selectedSeverity === "HIGH" && (
              <span style={{ color: "#ea580c" }}>
                <strong>High:</strong> Requires prompt attention within 24 hours.
              </span>
            )}
            {selectedSeverity === "MEDIUM" && (
              <span style={{ color: "#d97706" }}>
                <strong>Medium:</strong> Should be addressed within the current week.
              </span>
            )}
            {selectedSeverity === "LOW" && (
              <span style={{ color: "#64748b" }}>
                <strong>Low:</strong> Minor issue to be addressed during routine operations.
              </span>
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            maxLength={4000}
            placeholder="Detailed description of the exception, including what happened, when it was discovered, and any immediate actions taken..."
          />
        </div>

        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input type="checkbox" name="isBlocking" value="true" />
            <span>Blocking Exception</span>
          </label>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", marginLeft: "1.5rem" }}>
            Check if this exception should prevent certificate issuance until resolved
          </p>
        </div>
      </fieldset>

      {/* Related Records */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Package className="w-4 h-4 text-teal-600" />
          Related Records (Optional)
        </legend>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="assetId">Related Asset</label>
            <select id="assetId" name="assetId">
              <option value="">Select asset (optional)</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetTag} — {asset.manufacturer || "Unknown"} {asset.model || ""}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="customerId">Related Customer</label>
            <select id="customerId" name="customerId">
              <option value="">Select customer (optional)</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* Assignment */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <User className="w-4 h-4 text-teal-600" />
          Assignment
        </legend>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="assignedToUserId">Assign To</label>
            <select id="assignedToUserId" name="assignedToUserId">
              <option value="">Select user (optional)</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="correctiveActionDue">Corrective Action Due</label>
            <input
              type="date"
              id="correctiveActionDue"
              name="correctiveActionDue"
            />
          </div>
        </div>
      </fieldset>

      {/* Submit */}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn"
          disabled={isPending}
        >
          {isPending ? "Submitting..." : "Report Exception"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Calendar,
  User,
  Building,
  FileText,
} from "lucide-react";
import { createAuditFromForm, type AuditFormState } from "../../actions";
import type {
  Customer,
  User as PrismaUser,
} from "@prisma/client";

const AUDIT_TYPES = [
  "Internal Compliance Audit",
  "External Certification Audit",
  "Customer Audit",
  "Regulatory Inspection",
  "Process Verification",
  "Documentation Review",
  "Security Assessment",
  "Annual Review",
];

interface AuditFormProps {
  users: Pick<PrismaUser, "id" | "name" | "email">[];
  customers: Pick<Customer, "id" | "name">[];
}

export function AuditForm({
  users,
  customers,
}: AuditFormProps) {
  const router = useRouter();
  const [isExternalAuditor, setIsExternalAuditor] = useState(false);

  const [state, formAction, isPending] = useActionState<AuditFormState, FormData>(
    createAuditFromForm,
    {}
  );

  useEffect(() => {
    if (state.success && state.auditId) {
      router.push(`/dashboard/compliance/audits/${state.auditId}`);
    }
  }, [state.success, state.auditId, router]);

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
          Audit created successfully. Reference: <strong>{state.reference}</strong>
        </div>
      )}

      {/* Audit Details */}
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
          <ClipboardCheck className="w-4 h-4 text-teal-600" />
          Audit Details
        </legend>

        <div className="field">
          <label htmlFor="title">Audit Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            required
            maxLength={200}
            placeholder="e.g., Q4 2024 Data Destruction Compliance Audit"
          />
        </div>

        <div className="field">
          <label htmlFor="auditType">Audit Type</label>
          <select id="auditType" name="auditType">
            <option value="">Select type</option>
            {AUDIT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={4000}
            placeholder="Describe the purpose and objectives of this audit..."
          />
        </div>

        <div className="field">
          <label htmlFor="scope">Audit Scope</label>
          <textarea
            id="scope"
            name="scope"
            rows={3}
            maxLength={2000}
            placeholder="Define what will be covered in this audit (processes, time period, locations, etc.)..."
          />
        </div>

        <div className="field">
          <label htmlFor="customerId">Customer (if customer-specific)</label>
          <select id="customerId" name="customerId">
            <option value="">Organisation-wide audit</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            Leave empty for organisation-wide audits, or select a customer for customer-specific audits
          </p>
        </div>
      </fieldset>

      {/* Schedule */}
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
          <Calendar className="w-4 h-4 text-teal-600" />
          Schedule
        </legend>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="plannedStartDate">Planned Start Date</label>
            <input
              type="date"
              id="plannedStartDate"
              name="plannedStartDate"
            />
          </div>
          <div className="field">
            <label htmlFor="plannedEndDate">Planned End Date</label>
            <input
              type="date"
              id="plannedEndDate"
              name="plannedEndDate"
            />
          </div>
        </div>
      </fieldset>

      {/* Auditor */}
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
          Auditor Information
        </legend>

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="auditorTypeSelector"
                value="internal"
                checked={!isExternalAuditor}
                onChange={() => setIsExternalAuditor(false)}
              />
              Internal Auditor
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="auditorTypeSelector"
                value="external"
                checked={isExternalAuditor}
                onChange={() => setIsExternalAuditor(true)}
              />
              External Auditor
            </label>
          </div>
        </div>

        <input type="hidden" name="externalAuditor" value={isExternalAuditor ? "true" : "false"} />

        {!isExternalAuditor ? (
          <div className="field">
            <label htmlFor="auditorName">Assigned Auditor</label>
            <select id="auditorName" name="auditorName">
              <option value="">Select internal auditor</option>
              {users.map((user) => (
                <option key={user.id} value={user.name || user.email}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
              <div className="field">
                <label htmlFor="auditorName">Auditor Name</label>
                <input
                  type="text"
                  id="auditorName"
                  name="auditorName"
                  maxLength={100}
                  placeholder="Enter auditor name"
                />
              </div>
              <div className="field">
                <label htmlFor="auditorEmail">Auditor Email</label>
                <input
                  type="email"
                  id="auditorEmail"
                  name="auditorEmail"
                  placeholder="auditor@example.com"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="auditorOrganization">Auditor Organisation</label>
              <input
                type="text"
                id="auditorOrganization"
                name="auditorOrganization"
                maxLength={200}
                placeholder="e.g., ISO Certification Body Ltd"
              />
            </div>
          </>
        )}
      </fieldset>

      {/* Submit */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            padding: "0.625rem 1.25rem",
            backgroundColor: "#f1f5f9",
            color: "#475569",
            border: "none",
            borderRadius: "0.375rem",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "0.625rem 1.25rem",
            backgroundColor: isPending ? "#94a3b8" : "#0d9488",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            fontWeight: "500",
            cursor: isPending ? "not-allowed" : "pointer",
          }}
        >
          {isPending ? "Creating..." : "Schedule Audit"}
        </button>
      </div>
    </form>
  );
}

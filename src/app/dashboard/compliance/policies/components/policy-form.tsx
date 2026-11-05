"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  FileText,
  Calendar,
  Shield,
  Info,
} from "lucide-react";
import { createPolicyFromForm, type PolicyFormState } from "../../actions";

const COMPLIANCE_STANDARDS = [
  "NIST 800-88",
  "DoD 5220.22-M",
  "ISO 27001",
  "GDPR",
  "PCI DSS",
  "HIPAA",
  "SOC 2",
];

const ERASURE_METHODS = [
  "Secure Erase",
  "Enhanced Secure Erase",
  "Block Erase",
  "Cryptographic Erase",
  "NIST Clear",
  "NIST Purge",
  "DoD 3-pass",
  "DoD 7-pass",
  "Gutmann",
];

const DESTRUCTION_METHODS = [
  "Shredding",
  "Crushing",
  "Degaussing",
  "Incineration",
  "Disintegration",
  "Melting",
];

export function PolicyForm() {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState<PolicyFormState, FormData>(
    createPolicyFromForm,
    {}
  );

  useEffect(() => {
    if (state.success && state.policyId) {
      router.push(`/dashboard/compliance/policies/${state.policyId}`);
    }
  }, [state.success, state.policyId, router]);

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
          Policy created successfully. Reference: <strong>{state.reference}</strong>
        </div>
      )}

      {/* Basic Information */}
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
          <FileText className="w-4 h-4 text-teal-600" />
          Policy Details
        </legend>

        <div className="field">
          <label htmlFor="title">Policy Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            required
            maxLength={200}
            placeholder="e.g., Data Sanitisation Policy v2.0"
          />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={2000}
            placeholder="Brief description of this policy's purpose and scope..."
          />
        </div>

        <div className="field">
          <label htmlFor="policyContent">Policy Content</label>
          <textarea
            id="policyContent"
            name="policyContent"
            rows={8}
            maxLength={50000}
            placeholder="Full policy text (or attach a document below)..."
          />
        </div>

        <div className="field">
          <label htmlFor="documentUrl">Document URL</label>
          <input
            type="url"
            id="documentUrl"
            name="documentUrl"
            placeholder="https://example.com/policy-document.pdf"
          />
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            Link to the full policy document (PDF, Word, etc.)
          </p>
        </div>
      </fieldset>

      {/* Dates */}
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
          Effective Dates
        </legend>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="effectiveDate">Effective Date</label>
            <input
              type="date"
              id="effectiveDate"
              name="effectiveDate"
            />
          </div>
          <div className="field">
            <label htmlFor="reviewDate">Review Date</label>
            <input
              type="date"
              id="reviewDate"
              name="reviewDate"
            />
            <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
              When should this policy be reviewed?
            </p>
          </div>
        </div>
      </fieldset>

      {/* Compliance Standards */}
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
          <Shield className="w-4 h-4 text-teal-600" />
          Compliance Standards
        </legend>

        <div className="field">
          <label htmlFor="complianceStandards">Applicable Standards</label>
          <input
            type="text"
            id="complianceStandards"
            name="complianceStandards"
            placeholder="e.g., NIST 800-88, ISO 27001, GDPR"
          />
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            Comma-separated list of standards this policy addresses
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            {COMPLIANCE_STANDARDS.map((standard) => (
              <button
                key={standard}
                type="button"
                onClick={(e) => {
                  const input = document.getElementById("complianceStandards") as HTMLInputElement;
                  const current = input.value.split(",").map((s) => s.trim()).filter(Boolean);
                  if (!current.includes(standard)) {
                    input.value = [...current, standard].join(", ");
                  }
                }}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.25rem",
                  cursor: "pointer",
                }}
              >
                + {standard}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Approved Methods */}
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
          <Info className="w-4 h-4 text-teal-600" />
          Approved Methods
        </legend>

        <div className="field">
          <label htmlFor="approvedErasureMethods">Approved Erasure Methods</label>
          <input
            type="text"
            id="approvedErasureMethods"
            name="approvedErasureMethods"
            placeholder="e.g., Secure Erase, NIST Purge, DoD 3-pass"
          />
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            Comma-separated list of data erasure methods approved under this policy
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            {ERASURE_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={(e) => {
                  const input = document.getElementById("approvedErasureMethods") as HTMLInputElement;
                  const current = input.value.split(",").map((s) => s.trim()).filter(Boolean);
                  if (!current.includes(method)) {
                    input.value = [...current, method].join(", ");
                  }
                }}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.25rem",
                  cursor: "pointer",
                }}
              >
                + {method}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="approvedDestructionMethods">Approved Destruction Methods</label>
          <input
            type="text"
            id="approvedDestructionMethods"
            name="approvedDestructionMethods"
            placeholder="e.g., Shredding, Crushing, Degaussing"
          />
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            Comma-separated list of physical destruction methods approved under this policy
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            {DESTRUCTION_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={(e) => {
                  const input = document.getElementById("approvedDestructionMethods") as HTMLInputElement;
                  const current = input.value.split(",").map((s) => s.trim()).filter(Boolean);
                  if (!current.includes(method)) {
                    input.value = [...current, method].join(", ");
                  }
                }}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.25rem",
                  cursor: "pointer",
                }}
              >
                + {method}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Disclaimer */}
      <div
        style={{
          padding: "0.75rem 1rem",
          backgroundColor: "#fef3c7",
          border: "1px solid #fcd34d",
          borderRadius: "0.375rem",
          marginBottom: "1.5rem",
          fontSize: "0.875rem",
          color: "#92400e",
        }}
      >
        <strong>Note:</strong> Creating a policy in RecyTrack does not automatically ensure legal compliance.
        Policies must be reviewed by qualified compliance personnel and legal counsel as appropriate.
      </div>

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
          {isPending ? "Creating..." : "Create Policy"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Mail, Shield, AlertCircle } from "lucide-react";
import { createInvitation, type InvitationActionState } from "../actions";
import type { Site } from "@prisma/client";

interface InvitationFormProps {
  customerId: string;
  customerName: string;
  sites?: Site[];
  onSuccess?: (invitationId: string) => void;
}

export function InvitationForm({ customerId, customerName, sites = [], onSuccess }: InvitationFormProps) {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState<InvitationActionState, FormData>(
    createInvitation,
    {}
  );

  useEffect(() => {
    if (state.success) {
      if (onSuccess && state.invitationId) {
        onSuccess(state.invitationId);
      } else {
        router.push(`/dashboard/customers/${customerId}?tab=access`);
      }
    }
  }, [state.success, state.invitationId, customerId, router, onSuccess]);

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="customerId" value={customerId} />

      {/* Warning about email */}
      <div
        style={{
          padding: "0.75rem 1rem",
          backgroundColor: "#fef3c7",
          border: "1px solid #fde68a",
          borderRadius: "0.375rem",
          marginBottom: "1rem",
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-start",
        }}
      >
        <AlertCircle className="w-5 h-5 text-amber-600" style={{ flexShrink: 0, marginTop: "0.125rem" }} />
        <div>
          <strong style={{ color: "#b45309" }}>Email delivery pending</strong>
          <p style={{ color: "#92400e", fontSize: "0.875rem", margin: "0.25rem 0 0 0" }}>
            The invitation will be created but email delivery is not yet configured.
            You will need to manually share the invitation link with the user.
          </p>
        </div>
      </div>

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
      {state.success && state.emailPending && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#d1fae5",
            border: "1px solid #a7f3d0",
            borderRadius: "0.375rem",
            color: "#065f46",
            marginBottom: "1rem",
          }}
        >
          Invitation created successfully. Email delivery is pending.
        </div>
      )}

      {/* Invitation Details */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
          }}
        >
          Invitation Details
        </legend>

        <div className="field">
          <label htmlFor="email">
            <Mail className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Email Address *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="e.g., user@company.com"
          />
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            The user will receive an invitation at this email address.
          </p>
        </div>

        <div className="field">
          <label htmlFor="role">
            <Shield className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Access Level
          </label>
          <select id="role" name="role" defaultValue="CUSTOMER_USER">
            <option value="CUSTOMER_USER">Customer User</option>
            <option value="CUSTOMER_ADMIN">Customer Administrator</option>
          </select>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            <strong>Customer User:</strong> Can view and manage collections for {customerName}.<br />
            <strong>Customer Administrator:</strong> Can also invite other users and manage access.
          </p>
        </div>
      </fieldset>

      {/* Site Access */}
      {sites.filter(s => s.isActive).length > 0 && (
        <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
          <legend
            style={{
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#334155",
              marginBottom: "1rem",
            }}
          >
            Site Access (Optional)
          </legend>

          <div className="field">
            <label htmlFor="siteId">Restrict to Specific Site</label>
            <select id="siteId" name="siteId" defaultValue="">
              <option value="">All sites (full customer access)</option>
              {sites.filter(s => s.isActive).map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.reference})
                </option>
              ))}
            </select>
            <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
              Optionally restrict this user to only view collections for a specific site.
            </p>
          </div>
        </fieldset>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </button>
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? "Sending..." : "Create Invitation"}
        </button>
      </div>
    </form>
  );
}

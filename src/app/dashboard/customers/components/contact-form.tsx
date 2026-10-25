"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { User, Mail, Phone, Briefcase } from "lucide-react";
import { createContact, updateContact, type ContactActionState } from "../actions";
import type { CustomerContact, Site } from "@prisma/client";

interface ContactFormProps {
  customerId: string;
  contact?: CustomerContact;
  sites?: Site[];
  onSuccess?: (contactId: string) => void;
}

export function ContactForm({ customerId, contact, sites = [], onSuccess }: ContactFormProps) {
  const router = useRouter();
  const isEdit = !!contact;

  const action = isEdit ? updateContact : createContact;
  const [state, formAction, isPending] = useActionState<ContactActionState, FormData>(
    action,
    {}
  );

  useEffect(() => {
    if (state.success) {
      if (onSuccess && state.contactId) {
        onSuccess(state.contactId);
      } else {
        router.push(`/dashboard/customers/${customerId}?tab=contacts`);
      }
    }
  }, [state.success, state.contactId, customerId, router, onSuccess]);

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="customerId" value={customerId} />
      {isEdit && <input type="hidden" name="id" value={contact.id} />}

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

      {/* Basic Information */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
          }}
        >
          Contact Details
        </legend>

        <div className="field">
          <label htmlFor="name">
            <User className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Full Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={contact?.name || ""}
            placeholder="e.g., John Smith"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div className="field">
            <label htmlFor="email">
              <Mail className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={contact?.email || ""}
              placeholder="e.g., john@company.com"
            />
          </div>

          <div className="field">
            <label htmlFor="phone">
              <Phone className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={contact?.phone || ""}
              placeholder="e.g., 020 1234 5678"
            />
          </div>

          <div className="field">
            <label htmlFor="jobTitle">
              <Briefcase className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Job Title
            </label>
            <input
              id="jobTitle"
              name="jobTitle"
              type="text"
              defaultValue={contact?.jobTitle || ""}
              placeholder="e.g., IT Manager"
            />
          </div>
        </div>
      </fieldset>

      {/* Site Association */}
      {sites.length > 0 && (
        <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
          <legend
            style={{
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#334155",
              marginBottom: "1rem",
            }}
          >
            Site Association
          </legend>

          <div className="field">
            <label htmlFor="siteId">Associated Site</label>
            <select id="siteId" name="siteId" defaultValue={contact?.siteId || ""}>
              <option value="">Customer-level contact (all sites)</option>
              {sites.filter(s => s.isActive).map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.reference})
                </option>
              ))}
            </select>
            <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
              Leave blank if this contact is for the customer generally, or select a specific site.
            </p>
          </div>
        </fieldset>
      )}

      {/* Contact Responsibilities */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
          }}
        >
          Contact Responsibilities
        </legend>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              name="isPrimary"
              defaultChecked={contact?.isPrimary || false}
              value="true"
            />
            <span>
              <strong>Primary Contact</strong>
              <br />
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Main point of contact</span>
            </span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              name="isBilling"
              defaultChecked={contact?.isBilling || false}
              value="true"
            />
            <span>
              <strong>Billing Contact</strong>
              <br />
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Receives invoices</span>
            </span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              name="isOperational"
              defaultChecked={contact?.isOperational || false}
              value="true"
            />
            <span>
              <strong>Operational Contact</strong>
              <br />
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Collection coordination</span>
            </span>
          </label>
        </div>
      </fieldset>

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
          {isPending ? "Saving..." : isEdit ? "Update Contact" : "Create Contact"}
        </button>
      </div>
    </form>
  );
}

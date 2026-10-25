"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  Hash,
  User,
} from "lucide-react";
import { createCustomer, updateCustomer, type CustomerActionState } from "../actions";
import type { Customer } from "@prisma/client";

interface CustomerFormProps {
  customer?: Customer;
  onSuccess?: (customerId: string) => void;
}

export function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  const router = useRouter();
  const isEdit = !!customer;

  const action = isEdit ? updateCustomer : createCustomer;
  const [state, formAction, isPending] = useActionState<CustomerActionState, FormData>(
    action,
    {}
  );

  useEffect(() => {
    if (state.success && state.customerId) {
      if (onSuccess) {
        onSuccess(state.customerId);
      } else {
        router.push(`/dashboard/customers/${state.customerId}`);
      }
    }
  }, [state.success, state.customerId, router, onSuccess]);

  return (
    <form action={formAction} className="form">
      {isEdit && <input type="hidden" name="id" value={customer.id} />}

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
          Basic Information
        </legend>

        <div className="field">
          <label htmlFor="name">
            <Building className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Company/Customer Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={customer?.name || ""}
            placeholder="e.g., Acme Corporation Ltd"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div className="field">
            <label htmlFor="customerType">Customer Type</label>
            <select id="customerType" name="customerType" defaultValue={customer?.customerType || "BUSINESS"}>
              <option value="BUSINESS">Business</option>
              <option value="INDIVIDUAL">Individual</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="contactName">
              <User className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Primary Contact Name
            </label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              defaultValue={customer?.contactName || ""}
              placeholder="e.g., John Smith"
            />
          </div>
        </div>
      </fieldset>

      {/* Company Details (for business) */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
          }}
        >
          Company Details
        </legend>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div className="field">
            <label htmlFor="companyNumber">
              <Hash className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Company Number
            </label>
            <input
              id="companyNumber"
              name="companyNumber"
              type="text"
              defaultValue={customer?.companyNumber || ""}
              placeholder="e.g., 12345678"
            />
          </div>

          <div className="field">
            <label htmlFor="vatNumber">VAT Number</label>
            <input
              id="vatNumber"
              name="vatNumber"
              type="text"
              defaultValue={customer?.vatNumber || ""}
              placeholder="e.g., GB123456789"
            />
          </div>
        </div>
      </fieldset>

      {/* Contact Information */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
          }}
        >
          Contact Information
        </legend>

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
              defaultValue={customer?.email || ""}
              placeholder="e.g., contact@company.com"
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
              defaultValue={customer?.phone || ""}
              placeholder="e.g., 020 1234 5678"
            />
          </div>

          <div className="field">
            <label htmlFor="website">
              <Globe className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Website
            </label>
            <input
              id="website"
              name="website"
              type="url"
              defaultValue={customer?.website || ""}
              placeholder="e.g., https://www.company.com"
            />
          </div>
        </div>
      </fieldset>

      {/* Address */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
          }}
        >
          Billing Address
        </legend>

        <div className="field">
          <label htmlFor="address">
            <MapPin className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Address
          </label>
          <textarea
            id="address"
            name="address"
            rows={3}
            defaultValue={customer?.address || ""}
            placeholder="e.g., 123 High Street, London"
          />
        </div>

        <div className="field" style={{ maxWidth: "200px" }}>
          <label htmlFor="postcode">Postcode</label>
          <input
            id="postcode"
            name="postcode"
            type="text"
            defaultValue={customer?.postcode || ""}
            placeholder="e.g., SW1A 1AA"
            style={{ textTransform: "uppercase" }}
          />
        </div>
      </fieldset>

      {/* Notes */}
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "1rem",
          }}
        >
          Internal Notes
        </legend>

        <div className="field">
          <label htmlFor="notes">
            <FileText className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Notes (internal use only)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={customer?.notes || ""}
            placeholder="Add any internal notes about this customer..."
          />
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
          {isPending ? "Saving..." : isEdit ? "Update Customer" : "Create Customer"}
        </button>
      </div>
    </form>
  );
}

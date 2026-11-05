"use client";

import { useActionState } from "react";
import { Building2, Mail, Phone, Globe, FileText, Loader2, CheckCircle } from "lucide-react";
import { updateProfile, type OrganizationSettings, type ActionState } from "../actions";

interface ProfileFormProps {
  settings: OrganizationSettings;
}

export function ProfileForm({ settings }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(updateProfile, {});

  return (
    <form action={formAction}>
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Building2 className="h-5 w-5 text-teal-600" />
          Organisation Profile
        </h2>
        <p className="text-sm text-gray-500">Basic information about your organization</p>
      </div>

      <div className="p-6 space-y-6">
        {state.success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Profile updated successfully
          </div>
        )}

        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {/* Organization Name */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={settings.name}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {state.fieldErrors?.name && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="tradingName" className="block text-sm font-medium text-gray-700 mb-1.5">
              Trading Name
            </label>
            <input
              type="text"
              id="tradingName"
              name="tradingName"
              defaultValue={settings.tradingName || ""}
              placeholder="If different from organization name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Registration Details */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="registrationNumber"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Company Registration Number
            </label>
            <input
              type="text"
              id="registrationNumber"
              name="registrationNumber"
              defaultValue={settings.registrationNumber || ""}
              placeholder="e.g., 12345678"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700 mb-1.5">
              VAT Number
            </label>
            <input
              type="text"
              id="vatNumber"
              name="vatNumber"
              defaultValue={settings.vatNumber || ""}
              placeholder="e.g., GB123456789"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Addresses */}
        <div>
          <label
            htmlFor="registeredAddress"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Registered Address
          </label>
          <textarea
            id="registeredAddress"
            name="registeredAddress"
            rows={2}
            defaultValue={settings.registeredAddress || ""}
            placeholder="Full registered company address"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div>
          <label
            htmlFor="operationalAddress"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Operational Address
          </label>
          <textarea
            id="operationalAddress"
            name="operationalAddress"
            rows={2}
            defaultValue={settings.operationalAddress || ""}
            placeholder="If different from registered address"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Contact Details */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="contactEmail"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              <Mail className="inline h-4 w-4 mr-1" />
              Contact Email
            </label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              defaultValue={settings.contactEmail || ""}
              placeholder="info@company.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {state.fieldErrors?.contactEmail && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.contactEmail}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="contactPhone"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              <Phone className="inline h-4 w-4 mr-1" />
              Contact Phone
            </label>
            <input
              type="tel"
              id="contactPhone"
              name="contactPhone"
              defaultValue={settings.contactPhone || ""}
              placeholder="+44 20 1234 5678"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1.5">
            <Globe className="inline h-4 w-4 mr-1" />
            Website
          </label>
          <input
            type="url"
            id="website"
            name="website"
            defaultValue={settings.website || ""}
            placeholder="https://www.company.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          {state.fieldErrors?.website && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.website}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
            <FileText className="inline h-4 w-4 mr-1" />
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={settings.description || ""}
            placeholder="Brief description of your organization"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </form>
  );
}

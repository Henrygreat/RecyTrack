"use client";

import { useActionState } from "react";
import { Settings, Clock, Calendar, Hash, FileText, Loader2, CheckCircle } from "lucide-react";
import { updateOperationalSettings, type OrganizationSettings, type ActionState } from "../actions";

interface OperationalFormProps {
  settings: OrganizationSettings;
}

const TIMEZONES = [
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Dublin", label: "Dublin (GMT/IST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)" },
  { value: "America/New_York", label: "New York (EST/EDT)" },
  { value: "America/Chicago", label: "Chicago (CST/CDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2024)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2024)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-12-31)" },
];

export function OperationalForm({ settings }: OperationalFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateOperationalSettings,
    {}
  );

  const operationalSettings = settings.settings || {};

  return (
    <form action={formAction}>
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Settings className="h-5 w-5 text-teal-600" />
          Operational Preferences
        </h2>
        <p className="text-sm text-gray-500">Configure date formats, reference numbering, and defaults</p>
      </div>

      <div className="p-6 space-y-6">
        {state.success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Preferences updated successfully
          </div>
        )}

        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {/* Date & Time Settings */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-4">
            <Clock className="h-4 w-4" />
            Date & Time
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={operationalSettings.timezone || "Europe/London"}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date Format
              </label>
              <select
                id="dateFormat"
                name="dateFormat"
                defaultValue={operationalSettings.dateFormat || "DD/MM/YYYY"}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {DATE_FORMATS.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reference Numbering */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-4">
            <Hash className="h-4 w-4" />
            Reference Numbering
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Prefixes are added to auto-generated reference numbers (e.g., AST-00001, COL-00001)
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label htmlFor="assetPrefix" className="block text-sm font-medium text-gray-700 mb-1.5">
                Asset Prefix
              </label>
              <input
                type="text"
                id="assetPrefix"
                name="assetPrefix"
                maxLength={10}
                defaultValue={operationalSettings.assetPrefix || "AST"}
                placeholder="AST"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono uppercase"
              />
              {state.fieldErrors?.assetPrefix && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.assetPrefix}</p>
              )}
            </div>

            <div>
              <label htmlFor="collectionPrefix" className="block text-sm font-medium text-gray-700 mb-1.5">
                Collection Prefix
              </label>
              <input
                type="text"
                id="collectionPrefix"
                name="collectionPrefix"
                maxLength={10}
                defaultValue={operationalSettings.collectionPrefix || "COL"}
                placeholder="COL"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono uppercase"
              />
              {state.fieldErrors?.collectionPrefix && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.collectionPrefix}</p>
              )}
            </div>

            <div>
              <label htmlFor="certificatePrefix" className="block text-sm font-medium text-gray-700 mb-1.5">
                Certificate Prefix
              </label>
              <input
                type="text"
                id="certificatePrefix"
                name="certificatePrefix"
                maxLength={10}
                defaultValue={operationalSettings.certificatePrefix || "CERT"}
                placeholder="CERT"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono uppercase"
              />
              {state.fieldErrors?.certificatePrefix && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.certificatePrefix}</p>
              )}
            </div>
          </div>
        </div>

        {/* Collection Defaults */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-4">
            <FileText className="h-4 w-4" />
            Collection Defaults
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="routeBookingCutoffHours"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Route Booking Cutoff (hours)
              </label>
              <input
                type="number"
                id="routeBookingCutoffHours"
                name="routeBookingCutoffHours"
                min={0}
                max={168}
                defaultValue={operationalSettings.routeBookingCutoffHours ?? 24}
                className="w-full md:w-32 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {state.fieldErrors?.routeBookingCutoffHours && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.routeBookingCutoffHours}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Minimum hours notice required before a scheduled collection route
              </p>
            </div>

            <div>
              <label
                htmlFor="defaultCollectionInstructions"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Default Collection Instructions
              </label>
              <textarea
                id="defaultCollectionInstructions"
                name="defaultCollectionInstructions"
                rows={3}
                defaultValue={operationalSettings.defaultCollectionInstructions || ""}
                placeholder="Standard instructions that will be pre-filled for new collections..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                These instructions will be automatically added to new collection requests
              </p>
            </div>
          </div>
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

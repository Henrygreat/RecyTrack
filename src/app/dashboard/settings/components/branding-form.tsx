"use client";

import { useActionState, useState } from "react";
import { Palette, Image, FileText, Loader2, CheckCircle } from "lucide-react";
import { updateBranding, type OrganizationSettings, type ActionState } from "../actions";

interface BrandingFormProps {
  settings: OrganizationSettings;
}

export function BrandingForm({ settings }: BrandingFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(updateBranding, {});
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || "#0D9488");
  const [secondaryColor, setSecondaryColor] = useState(settings.secondaryColor || "#14B8A6");

  return (
    <form action={formAction}>
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Palette className="h-5 w-5 text-teal-600" />
          Branding & Appearance
        </h2>
        <p className="text-sm text-gray-500">Customize your organization&apos;s visual identity</p>
      </div>

      <div className="p-6 space-y-6">
        {state.success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Branding updated successfully
          </div>
        )}

        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {/* Logo URL */}
        <div>
          <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1.5">
            <Image className="inline h-4 w-4 mr-1" />
            Logo URL
          </label>
          <input
            type="url"
            id="logoUrl"
            name="logoUrl"
            defaultValue={settings.logoUrl || ""}
            placeholder="https://example.com/logo.png"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          {state.fieldErrors?.logoUrl && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.logoUrl}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Recommended: PNG or SVG format, minimum 200x200 pixels
          </p>
        </div>

        {/* Brand Colors */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-1.5">
              Primary Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                id="primaryColorPicker"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                id="primaryColor"
                name="primaryColor"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#0D9488"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
              />
            </div>
            {state.fieldErrors?.primaryColor && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.primaryColor}</p>
            )}
          </div>

          <div>
            <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-1.5">
              Secondary Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                id="secondaryColorPicker"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                id="secondaryColor"
                name="secondaryColor"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#14B8A6"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
              />
            </div>
            {state.fieldErrors?.secondaryColor && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.secondaryColor}</p>
            )}
          </div>
        </div>

        {/* Color Preview */}
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Color Preview</p>
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-2">
              <div
                className="h-16 w-16 rounded-lg shadow-sm"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-xs text-gray-500">Primary</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div
                className="h-16 w-16 rounded-lg shadow-sm"
                style={{ backgroundColor: secondaryColor }}
              />
              <span className="text-xs text-gray-500">Secondary</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div
                className="h-16 w-32 rounded-lg shadow-sm flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                <span className="text-white text-sm font-medium">Gradient</span>
              </div>
              <span className="text-xs text-gray-500">Combined</span>
            </div>
          </div>
        </div>

        {/* Document Header */}
        <div>
          <label htmlFor="documentHeader" className="block text-sm font-medium text-gray-700 mb-1.5">
            <FileText className="inline h-4 w-4 mr-1" />
            Document Header Text
          </label>
          <textarea
            id="documentHeader"
            name="documentHeader"
            rows={2}
            defaultValue={settings.documentHeader || ""}
            placeholder="Text to appear at the top of generated documents (certificates, manifests, etc.)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            This text will appear on all generated PDF documents
          </p>
        </div>

        {/* Document Footer */}
        <div>
          <label htmlFor="documentFooter" className="block text-sm font-medium text-gray-700 mb-1.5">
            Document Footer Text
          </label>
          <textarea
            id="documentFooter"
            name="documentFooter"
            rows={2}
            defaultValue={settings.documentFooter || ""}
            placeholder="Text to appear at the bottom of generated documents (legal notices, contact info, etc.)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Common uses: company registration details, compliance statements, contact information
          </p>
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

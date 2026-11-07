"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortalSite, updatePortalSite, type SiteFormState } from "../actions";

export interface PortalSiteFormValues {
  id: string;
  name: string;
  address: string;
  postcode: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  collectionInstructions: string | null;
  vehicleAccessNotes: string | null;
  openingHours: string | null;
  isDefault: boolean;
}

export function SiteForm({ site }: { site?: PortalSiteFormValues }) {
  const router = useRouter();
  const action = site ? updatePortalSite : createPortalSite;
  const [state, formAction, isPending] = useActionState<SiteFormState, FormData>(action, {});

  useEffect(() => {
    if (state.success && state.siteId) {
      router.push(`/portal/sites/${state.siteId}`);
    }
  }, [router, state.success, state.siteId]);

  function fieldError(name: string) {
    const error = state.fieldErrors?.[name];
    return error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null;
  }

  return (
    <form action={formAction} className="space-y-6">
      {site && <input type="hidden" name="siteId" value={site.id} />}
      {state.error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-base font-semibold text-slate-900">Site information</legend>
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Site name *
          <input
            required
            name="name"
            defaultValue={site?.name ?? ""}
            className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            maxLength={160}
          />
          {fieldError("name")}
        </label>
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Address *
          <textarea
            required
            name="address"
            defaultValue={site?.address ?? ""}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            maxLength={240}
          />
          {fieldError("address")}
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Postcode *
          <input
            required
            name="postcode"
            defaultValue={site?.postcode ?? ""}
            className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 font-normal uppercase"
            maxLength={16}
          />
          {fieldError("postcode")}
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700">
          <input name="isDefault" type="checkbox" value="true" defaultChecked={site?.isDefault ?? false} />
          Set as primary site
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-base font-semibold text-slate-900">Primary site contact</legend>
        <label className="block text-sm font-medium text-slate-700">
          Contact name
          <input
            name="contactName"
            defaultValue={site?.contactName ?? ""}
            className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            maxLength={120}
          />
          {fieldError("contactName")}
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Contact telephone
          <input
            name="contactPhone"
            type="tel"
            defaultValue={site?.contactPhone ?? ""}
            className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            maxLength={40}
          />
          {fieldError("contactPhone")}
        </label>
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Contact email
          <input
            name="contactEmail"
            type="email"
            defaultValue={site?.contactEmail ?? ""}
            className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            maxLength={254}
          />
          {fieldError("contactEmail")}
        </label>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-3 text-base font-semibold text-slate-900">Collection information</legend>
        <label className="block text-sm font-medium text-slate-700">
          Access and collection instructions
          <textarea
            name="collectionInstructions"
            defaultValue={site?.collectionInstructions ?? ""}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            maxLength={1000}
          />
          {fieldError("collectionInstructions")}
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Vehicle access notes
          <textarea
            name="vehicleAccessNotes"
            defaultValue={site?.vehicleAccessNotes ?? ""}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            maxLength={500}
          />
          {fieldError("vehicleAccessNotes")}
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Opening hours
          <input
            name="openingHours"
            defaultValue={site?.openingHours ?? ""}
            className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            maxLength={200}
          />
          {fieldError("openingHours")}
        </label>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : site ? "Save changes" : "Create site"}
        </button>
      </div>
    </form>
  );
}

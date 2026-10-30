"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createWarehouseLocation, updateWarehouseLocation } from "../actions";
import type { WarehouseLocation } from "@prisma/client";

const LOCATION_TYPES = [
  "Shelf",
  "Bin",
  "Pallet",
  "Cage",
  "Rack",
  "Bay",
  "Zone",
  "Room",
  "Other",
];

type Props = {
  location?: WarehouseLocation;
};

export function WarehouseLocationForm({ location }: Props) {
  const router = useRouter();
  const isEditing = !!location;

  const [state, formAction, isPending] = useActionState(
    isEditing ? updateWarehouseLocation : createWarehouseLocation,
    {}
  );

  useEffect(() => {
    if (state.success) {
      router.push(`/dashboard/warehouse/${state.locationId}`);
    }
  }, [state.success, state.locationId, router]);

  return (
    <form action={formAction} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={location.id} />}

      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {state.error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Location Code */}
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">
            Location Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="code"
            name="code"
            defaultValue={location?.code || ""}
            placeholder="e.g., A-01-03"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
            required
            maxLength={20}
          />
          <p className="mt-1 text-xs text-slate-500">
            Unique code for this location (letters, numbers, hyphens)
          </p>
        </div>

        {/* Location Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            Location Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={location?.name || ""}
            placeholder="e.g., Laptop Storage Bay 1"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
            maxLength={100}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Location Type */}
        <div>
          <label htmlFor="locationType" className="block text-sm font-medium text-slate-700 mb-1">
            Location Type
          </label>
          <select
            id="locationType"
            name="locationType"
            defaultValue={location?.locationType || ""}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select type...</option>
            {LOCATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Capacity */}
        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-slate-700 mb-1">
            Capacity
          </label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            defaultValue={location?.capacity || ""}
            placeholder="Maximum items"
            min={0}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="mt-1 text-xs text-slate-500">Leave empty for unlimited capacity</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={location?.description || ""}
          placeholder="Additional details about this location..."
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          defaultChecked={location?.isActive ?? true}
          value="true"
          className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
        />
        <label htmlFor="isActive" className="text-sm text-slate-700">
          Location is active and available for asset assignment
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          {isPending
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save Changes"
              : "Create Location"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { Bell, Mail, Loader2, CheckCircle } from "lucide-react";
import { updateNotificationSettings, type OrganizationSettings, type ActionState } from "../actions";

interface NotificationsFormProps {
  settings: OrganizationSettings;
}

interface NotificationOption {
  id: string;
  label: string;
  description: string;
  category: "customers" | "collections" | "processing" | "compliance";
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  {
    id: "newCustomerRequest",
    label: "New Customer Request",
    description: "When a new customer submits an access request",
    category: "customers",
  },
  {
    id: "collectionBooked",
    label: "Collection Booked",
    description: "When a customer books a collection slot",
    category: "collections",
  },
  {
    id: "collectionCancelled",
    label: "Collection Cancelled",
    description: "When a collection is cancelled by customer or system",
    category: "collections",
  },
  {
    id: "driverAssigned",
    label: "Driver Assigned",
    description: "When a driver is assigned to a collection route",
    category: "collections",
  },
  {
    id: "assetProcessingComplete",
    label: "Asset Processing Complete",
    description: "When asset processing is completed in the warehouse",
    category: "processing",
  },
  {
    id: "erasureComplete",
    label: "Data Erasure Complete",
    description: "When data erasure is verified and completed",
    category: "processing",
  },
  {
    id: "destructionComplete",
    label: "Physical Destruction Complete",
    description: "When physical destruction is completed",
    category: "processing",
  },
  {
    id: "complianceException",
    label: "Compliance Exception",
    description: "When a compliance exception or audit issue is raised",
    category: "compliance",
  },
];

const CATEGORIES = [
  { id: "customers", label: "Customer Events" },
  { id: "collections", label: "Collection Events" },
  { id: "processing", label: "Processing Events" },
  { id: "compliance", label: "Compliance Events" },
] as const;

export function NotificationsForm({ settings }: NotificationsFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateNotificationSettings,
    {}
  );

  const notificationSettings = settings.notifications || {};

  return (
    <form action={formAction}>
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Bell className="h-5 w-5 text-teal-600" />
          Email Notifications
        </h2>
        <p className="text-sm text-gray-500">Configure which events trigger email notifications</p>
      </div>

      <div className="p-6 space-y-6">
        {state.success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Notification settings updated successfully
          </div>
        )}

        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {/* Notification Email */}
        <div>
          <label
            htmlFor="notificationEmail"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            <Mail className="inline h-4 w-4 mr-1" />
            Notification Email Address
          </label>
          <input
            type="email"
            id="notificationEmail"
            name="notificationEmail"
            defaultValue={notificationSettings.notificationEmail || ""}
            placeholder="notifications@company.com"
            className="w-full md:w-96 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          {state.fieldErrors?.notificationEmail && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.notificationEmail}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            All system notifications will be sent to this email address
          </p>
        </div>

        {/* Notification Categories */}
        <div className="space-y-6">
          {CATEGORIES.map((category) => {
            const categoryOptions = NOTIFICATION_OPTIONS.filter(
              (opt) => opt.category === category.id
            );

            return (
              <div key={category.id}>
                <h3 className="text-sm font-medium text-gray-900 mb-3">{category.label}</h3>
                <div className="space-y-3">
                  {categoryOptions.map((option) => {
                    const settingValue = notificationSettings[option.id as keyof typeof notificationSettings];
                    const isChecked = typeof settingValue === "boolean" ? settingValue : true;

                    return (
                      <label
                        key={option.id}
                        className="flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center h-5 pt-0.5">
                          <input
                            type="checkbox"
                            id={option.id}
                            name={option.id}
                            defaultChecked={isChecked}
                            value="true"
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700">
                            {option.label}
                          </p>
                          <p className="text-xs text-gray-500">{option.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              NOTIFICATION_OPTIONS.forEach((opt) => {
                const checkbox = document.getElementById(opt.id) as HTMLInputElement;
                if (checkbox) checkbox.checked = true;
              });
            }}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Enable All
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => {
              NOTIFICATION_OPTIONS.forEach((opt) => {
                const checkbox = document.getElementById(opt.id) as HTMLInputElement;
                if (checkbox) checkbox.checked = false;
              });
            }}
            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
          >
            Disable All
          </button>
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

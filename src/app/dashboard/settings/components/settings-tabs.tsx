"use client";

import { useState } from "react";
import { Building2, Palette, Settings, Bell } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { BrandingForm } from "./branding-form";
import { OperationalForm } from "./operational-form";
import { NotificationsForm } from "./notifications-form";
import type { OrganizationSettings } from "../actions";

interface SettingsTabsProps {
  settings: OrganizationSettings;
}

type TabId = "profile" | "branding" | "operational" | "notifications";

const tabs: { id: TabId; label: string; icon: typeof Building2; description: string }[] = [
  {
    id: "profile",
    label: "Profile",
    icon: Building2,
    description: "Organization details and contact information",
  },
  {
    id: "branding",
    label: "Branding",
    icon: Palette,
    description: "Logo, colors, and document styling",
  },
  {
    id: "operational",
    label: "Preferences",
    icon: Settings,
    description: "Date formats, numbering, and defaults",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Email notification preferences",
  },
];

export function SettingsTabs({ settings }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Tab Navigation */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? "bg-teal-50 border border-teal-200"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <Icon
                  className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                    isActive ? "text-teal-600" : "text-gray-400"
                  }`}
                />
                <div>
                  <p
                    className={`font-medium ${
                      isActive ? "text-teal-900" : "text-gray-900"
                    }`}
                  >
                    {tab.label}
                  </p>
                  <p
                    className={`text-xs ${
                      isActive ? "text-teal-600" : "text-gray-500"
                    }`}
                  >
                    {tab.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        <div className="rounded-lg border border-gray-200 bg-white">
          {activeTab === "profile" && <ProfileForm settings={settings} />}
          {activeTab === "branding" && <BrandingForm settings={settings} />}
          {activeTab === "operational" && <OperationalForm settings={settings} />}
          {activeTab === "notifications" && <NotificationsForm settings={settings} />}
        </div>
      </div>
    </div>
  );
}

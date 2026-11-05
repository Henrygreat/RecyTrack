import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { SettingsTabs } from "./components/settings-tabs";
import type { OrganizationSettings, OperationalSettings, NotificationSettings } from "./actions";

const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

export default async function SettingsPage() {
  const { organizationId } = await requireMember(undefined, ADMIN_ROLES);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Organization not found
      </div>
    );
  }

  const settings: OrganizationSettings = {
    name: org.name,
    tradingName: org.tradingName,
    registrationNumber: org.registrationNumber,
    vatNumber: org.vatNumber,
    registeredAddress: org.registeredAddress,
    operationalAddress: org.operationalAddress,
    contactEmail: org.contactEmail,
    contactPhone: org.contactPhone,
    website: org.website,
    description: org.description,
    logoUrl: org.logoUrl,
    primaryColor: org.primaryColor,
    secondaryColor: org.secondaryColor,
    documentHeader: org.documentHeader,
    documentFooter: org.documentFooter,
    settings: org.settings as OperationalSettings | null,
    notifications: org.notifications as NotificationSettings | null,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organisation Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your organization profile, branding, and preferences
        </p>
      </div>

      {/* Settings Tabs */}
      <SettingsTabs settings={settings} />
    </div>
  );
}

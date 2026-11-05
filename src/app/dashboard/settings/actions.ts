"use server";

import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@prisma/client";

// Only OWNER and ADMIN can manage settings
const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

// ============================================
// TYPES
// ============================================

export interface OrganizationSettings {
  // Profile
  name: string;
  tradingName: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  registeredAddress: string | null;
  operationalAddress: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  description: string | null;
  // Branding
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  documentHeader: string | null;
  documentFooter: string | null;
  // Settings JSON
  settings: OperationalSettings | null;
  // Notifications JSON
  notifications: NotificationSettings | null;
}

export interface OperationalSettings {
  timezone?: string;
  dateFormat?: string;
  assetPrefix?: string;
  collectionPrefix?: string;
  certificatePrefix?: string;
  defaultCollectionInstructions?: string;
  routeBookingCutoffHours?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface NotificationSettings {
  newCustomerRequest?: boolean;
  collectionBooked?: boolean;
  collectionCancelled?: boolean;
  driverAssigned?: boolean;
  assetProcessingComplete?: boolean;
  erasureComplete?: boolean;
  destructionComplete?: boolean;
  complianceException?: boolean;
  notificationEmail?: string;
  [key: string]: string | boolean | undefined;
}

export interface ActionState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const profileSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  tradingName: z.string().optional(),
  registrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  registeredAddress: z.string().optional(),
  operationalAddress: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
});

const brandingSchema = z.object({
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional()
    .or(z.literal("")),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional()
    .or(z.literal("")),
  documentHeader: z.string().optional(),
  documentFooter: z.string().optional(),
});

const operationalSchema = z.object({
  timezone: z.string().optional(),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).optional(),
  assetPrefix: z.string().max(10).optional(),
  collectionPrefix: z.string().max(10).optional(),
  certificatePrefix: z.string().max(10).optional(),
  defaultCollectionInstructions: z.string().optional(),
  routeBookingCutoffHours: z.coerce.number().min(0).max(168).optional(),
});

const notificationSchema = z.object({
  newCustomerRequest: z.coerce.boolean().optional(),
  collectionBooked: z.coerce.boolean().optional(),
  collectionCancelled: z.coerce.boolean().optional(),
  driverAssigned: z.coerce.boolean().optional(),
  assetProcessingComplete: z.coerce.boolean().optional(),
  erasureComplete: z.coerce.boolean().optional(),
  destructionComplete: z.coerce.boolean().optional(),
  complianceException: z.coerce.boolean().optional(),
  notificationEmail: z.string().email().optional().or(z.literal("")),
});

// ============================================
// QUERIES
// ============================================

/**
 * Get organization settings
 */
export async function getOrganizationSettings(): Promise<{
  success: boolean;
  settings?: OrganizationSettings;
  error?: string;
}> {
  try {
    const { organizationId } = await requireMember(undefined, ADMIN_ROLES);

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return { success: false, error: "Organization not found" };
    }

    return {
      success: true,
      settings: {
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
      },
    };
  } catch (error) {
    console.error("Get settings error:", error);
    return { success: false, error: "Failed to load settings" };
  }
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Update organization profile
 */
export async function updateProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = profileSchema.safeParse(rawData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      return { fieldErrors, error: "Please check the form for errors" };
    }

    const data = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          name: data.name,
          tradingName: data.tradingName || null,
          registrationNumber: data.registrationNumber || null,
          vatNumber: data.vatNumber || null,
          registeredAddress: data.registeredAddress || null,
          operationalAddress: data.operationalAddress || null,
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
          website: data.website || null,
          description: data.description || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ORGANIZATION_PROFILE_UPDATED",
          entityType: "Organization",
          entityId: organizationId,
        },
      });
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Update profile error:", error);
    return { error: "Failed to update profile. Please try again." };
  }
}

/**
 * Update organization branding
 */
export async function updateBranding(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = brandingSchema.safeParse(rawData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      return { fieldErrors, error: "Please check the form for errors" };
    }

    const data = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          logoUrl: data.logoUrl || null,
          primaryColor: data.primaryColor || null,
          secondaryColor: data.secondaryColor || null,
          documentHeader: data.documentHeader || null,
          documentFooter: data.documentFooter || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ORGANIZATION_BRANDING_UPDATED",
          entityType: "Organization",
          entityId: organizationId,
        },
      });
    });

    revalidatePath("/dashboard/settings");

    return { success: true };
  } catch (error) {
    console.error("Update branding error:", error);
    return { error: "Failed to update branding. Please try again." };
  }
}

/**
 * Update operational settings
 */
export async function updateOperationalSettings(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = operationalSchema.safeParse(rawData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      return { fieldErrors, error: "Please check the form for errors" };
    }

    const data = parsed.data;

    // Get current settings to merge
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as OperationalSettings) || {};
    const newSettings: OperationalSettings = {
      ...currentSettings,
      ...data,
    };

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: { settings: newSettings },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ORGANIZATION_SETTINGS_UPDATED",
          entityType: "Organization",
          entityId: organizationId,
        },
      });
    });

    revalidatePath("/dashboard/settings");

    return { success: true };
  } catch (error) {
    console.error("Update operational settings error:", error);
    return { error: "Failed to update settings. Please try again." };
  }
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = notificationSchema.safeParse(rawData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      return { fieldErrors, error: "Please check the form for errors" };
    }

    const data = parsed.data;

    // Get current notifications to merge
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { notifications: true },
    });

    const currentNotifications = (org?.notifications as NotificationSettings) || {};
    const newNotifications: NotificationSettings = {
      ...currentNotifications,
      ...data,
    };

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: { notifications: newNotifications },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ORGANIZATION_NOTIFICATIONS_UPDATED",
          entityType: "Organization",
          entityId: organizationId,
        },
      });
    });

    revalidatePath("/dashboard/settings");

    return { success: true };
  } catch (error) {
    console.error("Update notification settings error:", error);
    return { error: "Failed to update notifications. Please try again." };
  }
}

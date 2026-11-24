"use server";

import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@prisma/client";
import type {
  OrganizationCommercialSettings,
  FreeCollectionRule,
  DEFAULT_COMMERCIAL_SETTINGS,
} from "@/lib/commercial-types";

// Only OWNER and ADMIN can manage commercial settings
const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

// ============================================
// TYPES
// ============================================

export interface CommercialActionState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const collectionPolicySchema = z.object({
  defaultChargeType: z.enum(["FREE", "CONDITIONAL", "FIXED", "QUOTED"]),
  fixedCharge: z.coerce.number().int().min(0).optional(),
  minimumCharge: z.coerce.number().int().min(0).optional(),
});

const transportPolicySchema = z.object({
  scheduledRouteCharge: z.enum(["FREE", "FIXED", "DISTANCE"]),
  dedicatedCollectionCharge: z.enum(["FIXED", "DISTANCE", "QUOTED"]),
  urgentCollectionSurcharge: z.coerce.number().min(0).optional(),
  urgentSurchargeType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  fixedRouteCharge: z.coerce.number().int().min(0).optional(),
  dedicatedBaseCharge: z.coerce.number().int().min(0).optional(),
  perMileRate: z.coerce.number().int().min(0).optional(),
  freeRadiusMiles: z.coerce.number().min(0).optional(),
});

const dataServicesPolicySchema = z.object({
  standardErasure: z.enum(["FREE", "INCLUDED", "PER_ITEM", "QUOTED"]),
  certifiedErasure: z.enum(["FREE", "INCLUDED", "PER_ITEM", "QUOTED"]),
  physicalDestruction: z.enum(["FREE", "INCLUDED", "PER_ITEM", "QUOTED"]),
  standardErasureRate: z.coerce.number().int().min(0).optional(),
  certifiedErasureRate: z.coerce.number().int().min(0).optional(),
  physicalDestructionRate: z.coerce.number().int().min(0).optional(),
});

const rebateSettingsSchema = z.object({
  enabled: z.coerce.boolean(),
  defaultRebatePercentage: z.coerce.number().min(0).max(100).optional(),
  minimumRebateThreshold: z.coerce.number().int().min(0).optional(),
  minimumPayoutAmount: z.coerce.number().int().min(0).optional(),
  rebatePaymentTerms: z.string().optional(),
  calculationFrequency: z.enum(["PER_COLLECTION", "MONTHLY", "QUARTERLY"]).optional(),
});

const quoteRequirementsSchema = z.object({
  requireQuoteForDedicated: z.coerce.boolean(),
  requireQuoteAboveItemCount: z.coerce.number().int().min(0).optional(),
  requireQuoteAboveValue: z.coerce.number().int().min(0).optional(),
  quoteValidityDays: z.coerce.number().int().min(1).max(365).default(30),
  requireApprovalBeforeSend: z.coerce.boolean().default(false),
});

const taxSettingsSchema = z.object({
  defaultTaxRate: z.coerce.number().min(0).max(100),
  taxRegistered: z.coerce.boolean(),
  taxRegistrationNumber: z.string().optional(),
  showTaxInclusivePrices: z.coerce.boolean().default(false),
});

const freeCollectionRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  enabled: z.coerce.boolean(),
  priority: z.coerce.number().int().min(1),
  conditions: z.object({
    minItemCount: z.coerce.number().int().min(0).optional(),
    maxItemCount: z.coerce.number().int().min(0).optional(),
    equipmentCategories: z.array(z.string()).optional(),
    withinScheduledRoute: z.coerce.boolean().optional(),
    maxDistanceMiles: z.coerce.number().min(0).optional(),
    postcodeAreas: z.array(z.string()).optional(),
    minEstimatedValue: z.coerce.number().int().min(0).optional(),
    minRecoveryValue: z.coerce.number().int().min(0).optional(),
    customerTiers: z.array(z.string()).optional(),
    contractRequired: z.coerce.boolean().optional(),
  }),
  outcome: z.object({
    collectionFree: z.coerce.boolean(),
    transportFree: z.coerce.boolean(),
    standardErasureFree: z.coerce.boolean(),
    certifiedErasureFree: z.coerce.boolean().optional(),
    destructionFree: z.coerce.boolean().optional(),
    notes: z.string().optional(),
  }),
});

// ============================================
// QUERIES
// ============================================

/**
 * Get organization commercial settings
 */
export async function getCommercialSettings(): Promise<{
  success: boolean;
  settings?: OrganizationCommercialSettings;
  error?: string;
}> {
  try {
    const { organizationId } = await requireMember(undefined, ADMIN_ROLES);

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!org) {
      return { success: false, error: "Organization not found" };
    }

    const settings = org.settings as Record<string, unknown> | null;
    const commercial = settings?.commercial as OrganizationCommercialSettings | undefined;

    // Return default settings if none configured
    if (!commercial) {
      const { DEFAULT_COMMERCIAL_SETTINGS } = await import("@/lib/commercial-types");
      return {
        success: true,
        settings: DEFAULT_COMMERCIAL_SETTINGS,
      };
    }

    return { success: true, settings: commercial };
  } catch (error) {
    console.error("Get commercial settings error:", error);
    return { success: false, error: "Failed to load commercial settings" };
  }
}

/**
 * Get customer tiers
 */
export async function getCustomerTiers(): Promise<{
  success: boolean;
  tiers?: Array<{
    id: string;
    name: string;
    code: string;
    description: string | null;
    pricingPolicyId: string | null;
    rebatePercentage: number | null;
    isActive: boolean;
    customerCount: number;
  }>;
  error?: string;
}> {
  try {
    const { organizationId } = await requireMember(undefined, ADMIN_ROLES);

    const tiers = await prisma.customerTier.findMany({
      where: { organizationId },
      include: {
        _count: { select: { customers: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    return {
      success: true,
      tiers: tiers.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        description: t.description,
        pricingPolicyId: t.pricingPolicyId,
        rebatePercentage: t.rebatePercentage ? Number(t.rebatePercentage) : null,
        isActive: t.isActive,
        customerCount: t._count.customers,
      })),
    };
  } catch (error) {
    console.error("Get customer tiers error:", error);
    return { success: false, error: "Failed to load customer tiers" };
  }
}

/**
 * Get pricing policies
 */
export async function getPricingPolicies(): Promise<{
  success: boolean;
  policies?: Array<{
    id: string;
    name: string;
    code: string;
    description: string | null;
    isDefault: boolean;
    isActive: boolean;
    itemCount: number;
  }>;
  error?: string;
}> {
  try {
    const { organizationId } = await requireMember(undefined, ADMIN_ROLES);

    const policies = await prisma.pricingPolicy.findMany({
      where: { organizationId },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return {
      success: true,
      policies: policies.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        isDefault: p.isDefault,
        isActive: p.isActive,
        itemCount: p._count.items,
      })),
    };
  } catch (error) {
    console.error("Get pricing policies error:", error);
    return { success: false, error: "Failed to load pricing policies" };
  }
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Update collection pricing policy
 */
export async function updateCollectionPolicy(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = collectionPolicySchema.safeParse(rawData);

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

    // Get current settings
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const { DEFAULT_COMMERCIAL_SETTINGS } = await import("@/lib/commercial-types");
    const currentCommercial = (currentSettings.commercial as OrganizationCommercialSettings) || DEFAULT_COMMERCIAL_SETTINGS;

    const newCommercial: OrganizationCommercialSettings = {
      ...currentCommercial,
      defaultCollectionPolicy: data,
    };

    const updatedSettings = {
      ...currentSettings,
      commercial: newCommercial,
    };

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          settings: updatedSettings as object,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "COMMERCIAL_COLLECTION_POLICY_UPDATED",
          entityType: "Organization",
          entityId: organizationId,
          details: data as object,
        },
      });
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Update collection policy error:", error);
    return { error: "Failed to update collection policy" };
  }
}

/**
 * Update transport pricing policy
 */
export async function updateTransportPolicy(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = transportPolicySchema.safeParse(rawData);

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

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const { DEFAULT_COMMERCIAL_SETTINGS } = await import("@/lib/commercial-types");
    const currentCommercial = (currentSettings.commercial as OrganizationCommercialSettings) || DEFAULT_COMMERCIAL_SETTINGS;

    const newCommercial: OrganizationCommercialSettings = {
      ...currentCommercial,
      defaultTransportPolicy: data,
    };

    const updatedSettings = {
      ...currentSettings,
      commercial: newCommercial,
    };

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          settings: updatedSettings as object,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "COMMERCIAL_TRANSPORT_POLICY_UPDATED",
          entityType: "Organization",
          entityId: organizationId,
          details: data as object,
        },
      });
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Update transport policy error:", error);
    return { error: "Failed to update transport policy" };
  }
}

/**
 * Update data services pricing policy
 */
export async function updateDataServicesPolicy(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = dataServicesPolicySchema.safeParse(rawData);

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

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const { DEFAULT_COMMERCIAL_SETTINGS } = await import("@/lib/commercial-types");
    const currentCommercial = (currentSettings.commercial as OrganizationCommercialSettings) || DEFAULT_COMMERCIAL_SETTINGS;

    const newCommercial: OrganizationCommercialSettings = {
      ...currentCommercial,
      defaultDataServicesPolicy: data,
    };

    const updatedSettings = {
      ...currentSettings,
      commercial: newCommercial,
    };

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          settings: updatedSettings as object,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "COMMERCIAL_DATA_SERVICES_POLICY_UPDATED",
          entityType: "Organization",
          entityId: organizationId,
          details: data as object,
        },
      });
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Update data services policy error:", error);
    return { error: "Failed to update data services policy" };
  }
}

/**
 * Update free collection eligibility settings
 */
export async function updateFreeCollectionEligibility(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const enabled = formData.get("enabled") === "true";
    const evaluationMode = formData.get("evaluationMode") as "ALL" | "ANY";
    const rulesJson = formData.get("rules") as string;

    let rules: FreeCollectionRule[] = [];
    if (rulesJson) {
      try {
        rules = JSON.parse(rulesJson);
      } catch {
        return { error: "Invalid rules format" };
      }
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const { DEFAULT_COMMERCIAL_SETTINGS } = await import("@/lib/commercial-types");
    const currentCommercial = (currentSettings.commercial as OrganizationCommercialSettings) || DEFAULT_COMMERCIAL_SETTINGS;

    const newCommercial: OrganizationCommercialSettings = {
      ...currentCommercial,
      freeCollectionEligibility: {
        enabled,
        evaluationMode: evaluationMode || "ANY",
        rules,
      },
    };

    const updatedSettings = {
      ...currentSettings,
      commercial: newCommercial,
    };

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          settings: updatedSettings as object,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "COMMERCIAL_FREE_ELIGIBILITY_UPDATED",
          entityType: "Organization",
          entityId: organizationId,
          details: { enabled, evaluationMode, ruleCount: rules.length } as object,
        },
      });
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Update free collection eligibility error:", error);
    return { error: "Failed to update free collection eligibility" };
  }
}

/**
 * Update rebate settings
 */
export async function updateRebateSettings(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = rebateSettingsSchema.safeParse(rawData);

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

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const { DEFAULT_COMMERCIAL_SETTINGS } = await import("@/lib/commercial-types");
    const currentCommercial = (currentSettings.commercial as OrganizationCommercialSettings) || DEFAULT_COMMERCIAL_SETTINGS;

    const newCommercial: OrganizationCommercialSettings = {
      ...currentCommercial,
      rebateSettings: data,
    };

    const updatedSettings = {
      ...currentSettings,
      commercial: newCommercial,
    };

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          settings: updatedSettings as object,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "COMMERCIAL_REBATE_SETTINGS_UPDATED",
          entityType: "Organization",
          entityId: organizationId,
          details: data as object,
        },
      });
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Update rebate settings error:", error);
    return { error: "Failed to update rebate settings" };
  }
}

/**
 * Update tax settings
 */
export async function updateTaxSettings(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = taxSettingsSchema.safeParse(rawData);

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

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const { DEFAULT_COMMERCIAL_SETTINGS } = await import("@/lib/commercial-types");
    const currentCommercial = (currentSettings.commercial as OrganizationCommercialSettings) || DEFAULT_COMMERCIAL_SETTINGS;

    const newCommercial: OrganizationCommercialSettings = {
      ...currentCommercial,
      taxSettings: {
        ...currentCommercial.taxSettings,
        ...data,
      },
    };

    const updatedSettings = {
      ...currentSettings,
      commercial: newCommercial,
    };

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          settings: updatedSettings as object,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "COMMERCIAL_TAX_SETTINGS_UPDATED",
          entityType: "Organization",
          entityId: organizationId,
          details: data as object,
        },
      });
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Update tax settings error:", error);
    return { error: "Failed to update tax settings" };
  }
}

/**
 * Create a customer tier
 */
export async function createCustomerTier(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const description = formData.get("description") as string;
    const pricingPolicyId = formData.get("pricingPolicyId") as string;
    const rebatePercentage = formData.get("rebatePercentage") as string;

    if (!name || !code) {
      return { error: "Name and code are required" };
    }

    // Check for duplicate code
    const existing = await prisma.customerTier.findFirst({
      where: { organizationId, code },
    });

    if (existing) {
      return { error: "A tier with this code already exists" };
    }

    // Get max sort order
    const maxSort = await prisma.customerTier.aggregate({
      where: { organizationId },
      _max: { sortOrder: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.customerTier.create({
      data: {
        organizationId,
        name,
        code: code.toUpperCase(),
        description: description || null,
        pricingPolicyId: pricingPolicyId || null,
        rebatePercentage: rebatePercentage ? parseFloat(rebatePercentage) : null,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: userId,
        action: "CUSTOMER_TIER_CREATED",
        entityType: "CustomerTier",
        entityId: code,
        details: { name, code } as object,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Create customer tier error:", error);
    return { error: "Failed to create customer tier" };
  }
}

/**
 * Create a pricing policy
 */
export async function createPricingPolicy(
  _prevState: CommercialActionState,
  formData: FormData
): Promise<CommercialActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const description = formData.get("description") as string;
    const isDefault = formData.get("isDefault") === "true";

    if (!name || !code) {
      return { error: "Name and code are required" };
    }

    // Check for duplicate code
    const existing = await prisma.pricingPolicy.findFirst({
      where: { organizationId, code },
    });

    if (existing) {
      return { error: "A policy with this code already exists" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.$transaction(async (tx) => {
      // If this is default, unset other defaults
      if (isDefault) {
        await tx.pricingPolicy.updateMany({
          where: { organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      await tx.pricingPolicy.create({
        data: {
          organizationId,
          name,
          code: code.toUpperCase(),
          description: description || null,
          isDefault,
          createdByUserId: userId,
          createdByName: user?.name || user?.email,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "PRICING_POLICY_CREATED",
          entityType: "PricingPolicy",
          entityId: code,
          details: { name, code, isDefault } as object,
        },
      });
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Create pricing policy error:", error);
    return { error: "Failed to create pricing policy" };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { assetSchema, assetUpdateSchema, dataWipeSchema } from "@/lib/validation";
import {
  generateAssetTag,
  recordAssetStatusChange,
  isValidAssetTransition,
  getAssetStatusTimestampField,
} from "@/lib/assets";
import { revalidatePath } from "next/cache";
import type { AssetStatus } from "@prisma/client";

// ============================================
// HELPER FUNCTIONS
// ============================================

function cleanEmptyStrings<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    if (result[key] === "") {
      result[key] = null as T[Extract<keyof T, string>];
    }
  }
  return result;
}

// ============================================
// ASSET ACTIONS
// ============================================

export type AssetActionState = {
  error?: string;
  success?: boolean;
  assetId?: string;
  assetTag?: string;
};

export async function createAsset(
  _prevState: AssetActionState,
  formData: FormData
): Promise<AssetActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    // Get user name for audit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const rawData = Object.fromEntries(formData);
    const parsed = assetSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = cleanEmptyStrings(parsed.data);

    // Verify customer exists if provided
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, organizationId },
      });
      if (!customer) {
        return { error: "Customer not found" };
      }
    }

    // Verify site exists if provided
    if (data.siteId) {
      const site = await prisma.site.findFirst({
        where: { id: data.siteId, organizationId },
      });
      if (!site) {
        return { error: "Site not found" };
      }
    }

    // Verify collection exists if provided
    if (data.collectionId) {
      const collection = await prisma.collection.findFirst({
        where: { id: data.collectionId, organizationId },
      });
      if (!collection) {
        return { error: "Collection not found" };
      }
    }

    // Verify warehouse location if provided
    if (data.warehouseLocationId) {
      const location = await prisma.warehouseLocation.findFirst({
        where: { id: data.warehouseLocationId, organizationId },
      });
      if (!location) {
        return { error: "Warehouse location not found" };
      }
    }

    const assetTag = await generateAssetTag(organizationId);

    const asset = await prisma.$transaction(async (tx) => {
      const a = await tx.asset.create({
        data: {
          organizationId,
          assetTag,
          category: data.category,
          categoryOther: data.categoryOther,
          manufacturer: data.manufacturer,
          model: data.model,
          serialNumber: data.serialNumber,
          customerId: data.customerId || null,
          siteId: data.siteId || null,
          collectionId: data.collectionId || null,
          customerAssetTag: data.customerAssetTag,
          physicalCondition: data.physicalCondition,
          functionalCondition: data.functionalCondition,
          conditionNotes: data.conditionNotes,
          dataBearingStatus: data.dataBearingStatus,
          storageType: data.storageType,
          storageCapacity: data.storageCapacity,
          warehouseLocationId: data.warehouseLocationId || null,
          binLocation: data.binLocation,
          estimatedValue: data.estimatedValue,
          weight: data.weight,
          dispositionOutcome: data.dispositionOutcome,
          dispositionNotes: data.dispositionNotes,
          internalNotes: data.internalNotes,
          status: "EXPECTED",
          createdByUserId: userId,
          createdByName: user?.name || user?.email || null,
        },
      });

      // Record initial status
      await recordAssetStatusChange(tx, {
        assetId: a.id,
        organizationId,
        fromStatus: null,
        toStatus: "EXPECTED",
        changedByUserId: userId,
        changedByName: user?.name || user?.email || undefined,
        notes: "Asset registered",
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ASSET_CREATED",
          entityType: "Asset",
          entityId: a.id,
          details: { assetTag, category: data.category },
        },
      });

      return a;
    });

    revalidatePath("/dashboard/assets");
    return { success: true, assetId: asset.id, assetTag: asset.assetTag };
  } catch (error) {
    console.error("Create asset error:", error);
    return { error: "Failed to create asset. Please try again." };
  }
}

export async function updateAsset(
  _prevState: AssetActionState,
  formData: FormData
): Promise<AssetActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = assetUpdateSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { id, ...data } = cleanEmptyStrings(parsed.data);

    // Verify asset exists and belongs to organization
    const existing = await prisma.asset.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { error: "Asset not found" };
    }

    // Verify relationships if changed
    if (data.customerId && data.customerId !== existing.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, organizationId },
      });
      if (!customer) {
        return { error: "Customer not found" };
      }
    }

    if (data.warehouseLocationId && data.warehouseLocationId !== existing.warehouseLocationId) {
      const location = await prisma.warehouseLocation.findFirst({
        where: { id: data.warehouseLocationId, organizationId },
      });
      if (!location) {
        return { error: "Warehouse location not found" };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id },
        data: {
          category: data.category,
          categoryOther: data.categoryOther,
          manufacturer: data.manufacturer,
          model: data.model,
          serialNumber: data.serialNumber,
          customerAssetTag: data.customerAssetTag,
          physicalCondition: data.physicalCondition,
          functionalCondition: data.functionalCondition,
          conditionNotes: data.conditionNotes,
          dataBearingStatus: data.dataBearingStatus,
          storageType: data.storageType,
          storageCapacity: data.storageCapacity,
          warehouseLocationId: data.warehouseLocationId || null,
          binLocation: data.binLocation,
          estimatedValue: data.estimatedValue,
          weight: data.weight,
          dispositionOutcome: data.dispositionOutcome,
          dispositionNotes: data.dispositionNotes,
          internalNotes: data.internalNotes,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ASSET_UPDATED",
          entityType: "Asset",
          entityId: id,
          details: { changes: data },
        },
      });
    });

    revalidatePath("/dashboard/assets");
    revalidatePath(`/dashboard/assets/${id}`);
    return { success: true, assetId: id };
  } catch (error) {
    console.error("Update asset error:", error);
    return { error: "Failed to update asset. Please try again." };
  }
}

export async function updateAssetStatus(
  assetId: string,
  newStatus: AssetStatus,
  notes?: string
): Promise<AssetActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    // Get user name for audit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, organizationId },
    });

    if (!asset) {
      return { error: "Asset not found" };
    }

    if (!isValidAssetTransition(asset.status, newStatus)) {
      return { error: `Cannot transition from ${asset.status} to ${newStatus}` };
    }

    const timestampField = getAssetStatusTimestampField(newStatus);
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };
    if (timestampField) {
      updateData[timestampField] = new Date();
    }

    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: assetId },
        data: updateData,
      });

      await recordAssetStatusChange(tx, {
        assetId,
        organizationId,
        fromStatus: asset.status,
        toStatus: newStatus,
        changedByUserId: userId,
        changedByName: user?.name || user?.email || undefined,
        notes,
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ASSET_STATUS_CHANGED",
          entityType: "Asset",
          entityId: assetId,
          details: { from: asset.status, to: newStatus, notes },
        },
      });
    });

    revalidatePath("/dashboard/assets");
    revalidatePath(`/dashboard/assets/${assetId}`);
    return { success: true, assetId };
  } catch (error) {
    console.error("Update asset status error:", error);
    return { error: "Failed to update asset status. Please try again." };
  }
}

export async function recordDataWipe(
  _prevState: AssetActionState,
  formData: FormData
): Promise<AssetActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    // Get user name for audit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const rawData = Object.fromEntries(formData);
    const parsed = dataWipeSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    const asset = await prisma.asset.findFirst({
      where: { id: data.assetId, organizationId },
    });

    if (!asset) {
      return { error: "Asset not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: data.assetId },
        data: {
          dataBearingStatus: data.newStatus,
          dataWipeMethod: data.dataWipeMethod,
          dataWipeDate: data.dataWipeDate ? new Date(data.dataWipeDate) : new Date(),
          dataWipeCertificate: data.dataWipeCertificate || null,
          dataWipeOperator: data.dataWipeOperator || user?.name || user?.email || null,
          updatedAt: new Date(),
        },
      });

      // Add a note about the wipe
      await tx.assetNote.create({
        data: {
          organizationId,
          assetId: data.assetId,
          noteType: "data_wipe",
          content: `Data wipe performed: ${data.dataWipeMethod}. Status: ${data.newStatus}`,
          createdByUserId: userId,
          createdByName: user?.name || user?.email || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ASSET_DATA_WIPED",
          entityType: "Asset",
          entityId: data.assetId,
          details: {
            method: data.dataWipeMethod,
            status: data.newStatus,
            certificate: data.dataWipeCertificate,
          },
        },
      });
    });

    revalidatePath(`/dashboard/assets/${data.assetId}`);
    return { success: true, assetId: data.assetId };
  } catch (error) {
    console.error("Record data wipe error:", error);
    return { error: "Failed to record data wipe. Please try again." };
  }
}

export async function addAssetNote(
  assetId: string,
  content: string,
  noteType: string = "general"
): Promise<AssetActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    // Get user name for audit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, organizationId },
    });

    if (!asset) {
      return { error: "Asset not found" };
    }

    await prisma.assetNote.create({
      data: {
        organizationId,
        assetId,
        noteType,
        content,
        createdByUserId: userId,
        createdByName: user?.name || user?.email || null,
      },
    });

    revalidatePath(`/dashboard/assets/${assetId}`);
    return { success: true, assetId };
  } catch (error) {
    console.error("Add asset note error:", error);
    return { error: "Failed to add note. Please try again." };
  }
}

export async function bulkCreateAssets(
  assets: Array<{
    category: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    customerId?: string;
    collectionId?: string;
  }>
): Promise<{ success: boolean; created: number; errors: string[] }> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    // Get user name for audit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const results = {
      success: true,
      created: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < assets.length; i++) {
      const assetData = assets[i];
      try {
        const assetTag = await generateAssetTag(organizationId);

        await prisma.$transaction(async (tx) => {
          const a = await tx.asset.create({
            data: {
              organizationId,
              assetTag,
              category: assetData.category as never,
              manufacturer: assetData.manufacturer || null,
              model: assetData.model || null,
              serialNumber: assetData.serialNumber || null,
              customerId: assetData.customerId || null,
              collectionId: assetData.collectionId || null,
              status: "EXPECTED",
              createdByUserId: userId,
              createdByName: user?.name || user?.email || null,
            },
          });

          await recordAssetStatusChange(tx, {
            assetId: a.id,
            organizationId,
            fromStatus: null,
            toStatus: "EXPECTED",
            changedByUserId: userId,
            changedByName: user?.name || user?.email || undefined,
            notes: "Bulk asset registration",
          });
        });

        results.created++;
      } catch (err) {
        results.errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    if (results.errors.length > 0) {
      results.success = false;
    }

    revalidatePath("/dashboard/assets");
    return results;
  } catch (error) {
    console.error("Bulk create assets error:", error);
    return { success: false, created: 0, errors: ["Failed to process bulk import"] };
  }
}

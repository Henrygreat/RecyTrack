"use server";

import { prisma } from "@/lib/prisma";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { revalidatePath } from "next/cache";
import * as z from "zod";

// ============================================
// VALIDATION SCHEMAS
// ============================================

const warehouseLocationSchema = z.object({
  code: z
    .string()
    .min(1, "Location code is required")
    .max(20, "Code must be 20 characters or less")
    .regex(/^[A-Z0-9\-]+$/i, "Code must contain only letters, numbers, and hyphens"),
  name: z.string().min(1, "Location name is required").max(100),
  description: z.string().max(500).optional(),
  locationType: z.string().max(50).optional(),
  capacity: z.coerce.number().int().min(0).optional(),
  isActive: z.coerce.boolean().default(true),
});

const warehouseLocationUpdateSchema = warehouseLocationSchema.extend({
  id: z.string().min(1, "Location ID is required"),
});

// ============================================
// TYPES
// ============================================

export type WarehouseActionState = {
  error?: string;
  success?: boolean;
  locationId?: string;
};

// ============================================
// ACTIONS
// ============================================

export async function createWarehouseLocation(
  _prevState: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = warehouseLocationSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    // Check for duplicate code within organization
    const existing = await prisma.warehouseLocation.findFirst({
      where: {
        organizationId,
        code: data.code.toUpperCase(),
      },
    });

    if (existing) {
      return { error: `Location code "${data.code}" already exists` };
    }

    const location = await prisma.$transaction(async (tx) => {
      const loc = await tx.warehouseLocation.create({
        data: {
          organizationId,
          code: data.code.toUpperCase(),
          name: data.name,
          description: data.description || null,
          locationType: data.locationType || null,
          capacity: data.capacity || null,
          isActive: data.isActive,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "WAREHOUSE_LOCATION_CREATED",
          entityType: "WarehouseLocation",
          entityId: loc.id,
          details: { code: loc.code, name: loc.name },
        },
      });

      return loc;
    });

    revalidatePath("/dashboard/warehouse");
    return { success: true, locationId: location.id };
  } catch (error) {
    console.error("Create warehouse location error:", error);
    return { error: "Failed to create warehouse location. Please try again." };
  }
}

export async function updateWarehouseLocation(
  _prevState: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = warehouseLocationUpdateSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { id, ...data } = parsed.data;

    // Verify location exists and belongs to organization
    const existing = await prisma.warehouseLocation.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { error: "Warehouse location not found" };
    }

    // Check for duplicate code if code is being changed
    if (data.code.toUpperCase() !== existing.code) {
      const duplicate = await prisma.warehouseLocation.findFirst({
        where: {
          organizationId,
          code: data.code.toUpperCase(),
          NOT: { id },
        },
      });

      if (duplicate) {
        return { error: `Location code "${data.code}" already exists` };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.warehouseLocation.update({
        where: { id },
        data: {
          code: data.code.toUpperCase(),
          name: data.name,
          description: data.description || null,
          locationType: data.locationType || null,
          capacity: data.capacity || null,
          isActive: data.isActive,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "WAREHOUSE_LOCATION_UPDATED",
          entityType: "WarehouseLocation",
          entityId: id,
          details: { changes: data },
        },
      });
    });

    revalidatePath("/dashboard/warehouse");
    revalidatePath(`/dashboard/warehouse/${id}`);
    return { success: true, locationId: id };
  } catch (error) {
    console.error("Update warehouse location error:", error);
    return { error: "Failed to update warehouse location. Please try again." };
  }
}

export async function toggleWarehouseLocationStatus(
  locationId: string
): Promise<WarehouseActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const location = await prisma.warehouseLocation.findFirst({
      where: { id: locationId, organizationId },
    });

    if (!location) {
      return { error: "Warehouse location not found" };
    }

    // If deactivating, check for assigned assets
    if (location.isActive) {
      const assetCount = await prisma.asset.count({
        where: { warehouseLocationId: locationId, organizationId },
      });

      if (assetCount > 0) {
        return {
          error: `Cannot deactivate location with ${assetCount} assigned asset(s). Reassign assets first.`,
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.warehouseLocation.update({
        where: { id: locationId },
        data: {
          isActive: !location.isActive,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: location.isActive
            ? "WAREHOUSE_LOCATION_DEACTIVATED"
            : "WAREHOUSE_LOCATION_ACTIVATED",
          entityType: "WarehouseLocation",
          entityId: locationId,
        },
      });
    });

    revalidatePath("/dashboard/warehouse");
    revalidatePath(`/dashboard/warehouse/${locationId}`);
    return { success: true, locationId };
  } catch (error) {
    console.error("Toggle warehouse location status error:", error);
    return { error: "Failed to update location status. Please try again." };
  }
}

export async function deleteWarehouseLocation(
  locationId: string
): Promise<WarehouseActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const location = await prisma.warehouseLocation.findFirst({
      where: { id: locationId, organizationId },
      include: {
        _count: { select: { assets: true } },
      },
    });

    if (!location) {
      return { error: "Warehouse location not found" };
    }

    if (location._count.assets > 0) {
      return {
        error: `Cannot delete location with ${location._count.assets} assigned asset(s). Reassign assets first.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.warehouseLocation.delete({
        where: { id: locationId },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "WAREHOUSE_LOCATION_DELETED",
          entityType: "WarehouseLocation",
          entityId: locationId,
          details: { code: location.code, name: location.name },
        },
      });
    });

    revalidatePath("/dashboard/warehouse");
    return { success: true };
  } catch (error) {
    console.error("Delete warehouse location error:", error);
    return { error: "Failed to delete warehouse location. Please try again." };
  }
}

export async function assignAssetToLocation(
  assetId: string,
  locationId: string | null,
  binLocation?: string
): Promise<WarehouseActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, organizationId },
    });

    if (!asset) {
      return { error: "Asset not found" };
    }

    if (locationId) {
      const location = await prisma.warehouseLocation.findFirst({
        where: { id: locationId, organizationId, isActive: true },
      });

      if (!location) {
        return { error: "Warehouse location not found or inactive" };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: assetId },
        data: {
          warehouseLocationId: locationId,
          binLocation: binLocation || null,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: locationId ? "ASSET_LOCATION_ASSIGNED" : "ASSET_LOCATION_CLEARED",
          entityType: "Asset",
          entityId: assetId,
          details: { locationId, binLocation },
        },
      });
    });

    revalidatePath("/dashboard/assets");
    revalidatePath(`/dashboard/assets/${assetId}`);
    revalidatePath("/dashboard/warehouse");
    if (locationId) {
      revalidatePath(`/dashboard/warehouse/${locationId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Assign asset to location error:", error);
    return { error: "Failed to assign asset to location. Please try again." };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { requireMember, STAFF_ROLES, MANAGEMENT_ROLES } from "@/lib/access";
import { revalidatePath } from "next/cache";
import {
  recordAssetStatusChange,
  isValidAssetTransition,
  getAssetStatusTimestampField,
} from "@/lib/assets";
import { generateLabelData, extractAssetTag } from "@/lib/barcodes";
import type { AssetStatus } from "@prisma/client";

// ============================================
// TYPES
// ============================================

export type ScanActionState = {
  error?: string;
  success?: boolean;
  assetId?: string;
  assetTag?: string;
  message?: string;
};

export interface AssetLookupResult {
  found: boolean;
  asset?: {
    id: string;
    assetTag: string;
    category: string;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
    status: AssetStatus;
    physicalCondition: string;
    functionalCondition: string;
    conditionGrade: string | null;
    warehouseLocationId: string | null;
    warehouseLocationCode: string | null;
    warehouseLocationName: string | null;
    customerName: string | null;
    customerId: string | null;
    customerAssetTag: string | null;
  };
  error?: string;
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  results: Array<{
    assetTag: string;
    success: boolean;
    error?: string;
  }>;
}

// ============================================
// ASSET LOOKUP
// ============================================

export async function lookupAssetByTag(scannedValue: string): Promise<AssetLookupResult> {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const assetTag = extractAssetTag(scannedValue);
    if (!assetTag) {
      return { found: false, error: "Invalid scan value" };
    }

    // Try to find by asset tag first
    let asset = await prisma.asset.findFirst({
      where: { organizationId, assetTag: { equals: assetTag, mode: "insensitive" } },
      include: {
        warehouseLocation: { select: { id: true, code: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    // If not found by asset tag, try serial number or customer asset tag
    if (!asset) {
      asset = await prisma.asset.findFirst({
        where: {
          organizationId,
          OR: [
            { serialNumber: { equals: assetTag, mode: "insensitive" } },
            { customerAssetTag: { equals: assetTag, mode: "insensitive" } },
          ],
        },
        include: {
          warehouseLocation: { select: { id: true, code: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      });
    }

    if (!asset) {
      return { found: false, error: `Asset not found: ${assetTag}` };
    }

    return {
      found: true,
      asset: {
        id: asset.id,
        assetTag: asset.assetTag,
        category: asset.category,
        manufacturer: asset.manufacturer,
        model: asset.model,
        serialNumber: asset.serialNumber,
        status: asset.status,
        physicalCondition: asset.physicalCondition,
        functionalCondition: asset.functionalCondition,
        conditionGrade: asset.conditionGrade,
        warehouseLocationId: asset.warehouseLocation?.id ?? null,
        warehouseLocationCode: asset.warehouseLocation?.code ?? null,
        warehouseLocationName: asset.warehouseLocation?.name ?? null,
        customerName: asset.customer?.name ?? null,
        customerId: asset.customer?.id ?? null,
        customerAssetTag: asset.customerAssetTag,
      },
    };
  } catch (error) {
    console.error("Asset lookup error:", error);
    return { found: false, error: "Failed to lookup asset" };
  }
}

// ============================================
// QUICK ACTIONS (via scanning)
// ============================================

export async function receiveAssetByScan(assetTag: string): Promise<ScanActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const asset = await prisma.asset.findFirst({
      where: { organizationId, assetTag: { equals: assetTag, mode: "insensitive" } },
    });

    if (!asset) {
      return { error: `Asset not found: ${assetTag}` };
    }

    const validFromStatuses: AssetStatus[] = ["EXPECTED", "COLLECTED"];
    if (!validFromStatuses.includes(asset.status)) {
      return { error: `Cannot receive asset in status: ${asset.status}` };
    }

    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: asset.id },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await recordAssetStatusChange(tx, {
        assetId: asset.id,
        organizationId,
        fromStatus: asset.status,
        toStatus: "RECEIVED",
        changedByUserId: userId,
        changedByName: user?.name || user?.email || undefined,
        notes: "Received via scan",
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ASSET_RECEIVED_SCAN",
          entityType: "Asset",
          entityId: asset.id,
          details: { assetTag, method: "scan" },
        },
      });
    });

    revalidatePath("/dashboard/assets");
    revalidatePath("/dashboard/scan");
    return { success: true, assetId: asset.id, assetTag: asset.assetTag, message: "Asset received" };
  } catch (error) {
    console.error("Receive asset error:", error);
    return { error: "Failed to receive asset" };
  }
}

export async function transferAssetByScan(
  assetTag: string,
  toLocationId: string
): Promise<ScanActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const [asset, toLocation] = await Promise.all([
      prisma.asset.findFirst({
        where: { organizationId, assetTag: { equals: assetTag, mode: "insensitive" } },
        include: { warehouseLocation: true },
      }),
      prisma.warehouseLocation.findFirst({
        where: { id: toLocationId, organizationId, isActive: true },
      }),
    ]);

    if (!asset) {
      return { error: `Asset not found: ${assetTag}` };
    }

    if (!toLocation) {
      return { error: "Destination location not found or inactive" };
    }

    if (asset.warehouseLocationId === toLocationId) {
      return { error: "Asset is already at this location" };
    }

    const fromLocationName = asset.warehouseLocation?.name ?? "No location";

    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: asset.id },
        data: {
          warehouseLocationId: toLocationId,
          updatedAt: new Date(),
        },
      });

      // Create custody event for transfer
      const reference = await generateCustodyReference(tx, organizationId);
      await tx.custodyEvent.create({
        data: {
          organizationId,
          reference,
          assetId: asset.id,
          eventType: "INTERNAL_TRANSFER",
          handoverStatus: "CONFIRMED",
          fromLocationId: asset.warehouseLocationId,
          fromLocationName,
          toLocationId,
          toLocationName: toLocation.name,
          eventDate: new Date(),
          initiatedByUserId: userId,
          initiatedByName: user?.name || user?.email || null,
          confirmedAt: new Date(),
          confirmedByUserId: userId,
          confirmedByName: user?.name || user?.email || null,
          confirmationMethod: "scan",
          notes: "Transfer via scan",
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ASSET_TRANSFERRED_SCAN",
          entityType: "Asset",
          entityId: asset.id,
          details: {
            assetTag,
            from: fromLocationName,
            to: toLocation.name,
            method: "scan",
          },
        },
      });
    });

    revalidatePath("/dashboard/assets");
    revalidatePath("/dashboard/warehouse");
    revalidatePath("/dashboard/scan");
    return {
      success: true,
      assetId: asset.id,
      assetTag: asset.assetTag,
      message: `Transferred to ${toLocation.name}`,
    };
  } catch (error) {
    console.error("Transfer asset error:", error);
    return { error: "Failed to transfer asset" };
  }
}

export async function updateAssetStatusByScan(
  assetTag: string,
  newStatus: AssetStatus,
  notes?: string
): Promise<ScanActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const asset = await prisma.asset.findFirst({
      where: { organizationId, assetTag: { equals: assetTag, mode: "insensitive" } },
    });

    if (!asset) {
      return { error: `Asset not found: ${assetTag}` };
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
        where: { id: asset.id },
        data: updateData,
      });

      await recordAssetStatusChange(tx, {
        assetId: asset.id,
        organizationId,
        fromStatus: asset.status,
        toStatus: newStatus,
        changedByUserId: userId,
        changedByName: user?.name || user?.email || undefined,
        notes: notes || "Status updated via scan",
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ASSET_STATUS_CHANGED_SCAN",
          entityType: "Asset",
          entityId: asset.id,
          details: { assetTag, from: asset.status, to: newStatus, method: "scan" },
        },
      });
    });

    revalidatePath("/dashboard/assets");
    revalidatePath("/dashboard/scan");
    return {
      success: true,
      assetId: asset.id,
      assetTag: asset.assetTag,
      message: `Status changed to ${newStatus}`,
    };
  } catch (error) {
    console.error("Update status error:", error);
    return { error: "Failed to update status" };
  }
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function bulkReceiveAssets(assetTags: string[]): Promise<BulkOperationResult> {
  const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const results: BulkOperationResult["results"] = [];
  let processed = 0;
  let failed = 0;

  for (const tag of assetTags) {
    try {
      const asset = await prisma.asset.findFirst({
        where: { organizationId, assetTag: { equals: tag, mode: "insensitive" } },
      });

      if (!asset) {
        results.push({ assetTag: tag, success: false, error: "Asset not found" });
        failed++;
        continue;
      }

      const validFromStatuses: AssetStatus[] = ["EXPECTED", "COLLECTED"];
      if (!validFromStatuses.includes(asset.status)) {
        results.push({
          assetTag: tag,
          success: false,
          error: `Cannot receive from status: ${asset.status}`,
        });
        failed++;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.asset.update({
          where: { id: asset.id },
          data: { status: "RECEIVED", receivedAt: new Date(), updatedAt: new Date() },
        });

        await recordAssetStatusChange(tx, {
          assetId: asset.id,
          organizationId,
          fromStatus: asset.status,
          toStatus: "RECEIVED",
          changedByUserId: userId,
          changedByName: user?.name || user?.email || undefined,
          notes: "Bulk receive via scan",
        });
      });

      results.push({ assetTag: tag, success: true });
      processed++;
    } catch (err) {
      results.push({
        assetTag: tag,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      failed++;
    }
  }

  if (processed > 0) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: userId,
        action: "ASSETS_BULK_RECEIVED",
        entityType: "Asset",
        entityId: "bulk",
        details: { count: processed, failed, assetTags },
      },
    });
  }

  revalidatePath("/dashboard/assets");
  revalidatePath("/dashboard/scan");

  return {
    success: failed === 0,
    processed,
    failed,
    results,
  };
}

export async function bulkTransferAssets(
  assetTags: string[],
  toLocationId: string
): Promise<BulkOperationResult> {
  const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const toLocation = await prisma.warehouseLocation.findFirst({
    where: { id: toLocationId, organizationId, isActive: true },
  });

  if (!toLocation) {
    return {
      success: false,
      processed: 0,
      failed: assetTags.length,
      results: assetTags.map((tag) => ({
        assetTag: tag,
        success: false,
        error: "Destination location not found",
      })),
    };
  }

  const results: BulkOperationResult["results"] = [];
  let processed = 0;
  let failed = 0;

  for (const tag of assetTags) {
    try {
      const asset = await prisma.asset.findFirst({
        where: { organizationId, assetTag: { equals: tag, mode: "insensitive" } },
        include: { warehouseLocation: true },
      });

      if (!asset) {
        results.push({ assetTag: tag, success: false, error: "Asset not found" });
        failed++;
        continue;
      }

      if (asset.warehouseLocationId === toLocationId) {
        results.push({ assetTag: tag, success: false, error: "Already at this location" });
        failed++;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.asset.update({
          where: { id: asset.id },
          data: { warehouseLocationId: toLocationId, updatedAt: new Date() },
        });

        const reference = await generateCustodyReference(tx, organizationId);
        await tx.custodyEvent.create({
          data: {
            organizationId,
            reference,
            assetId: asset.id,
            eventType: "INTERNAL_TRANSFER",
            handoverStatus: "CONFIRMED",
            fromLocationId: asset.warehouseLocationId,
            fromLocationName: asset.warehouseLocation?.name ?? null,
            toLocationId,
            toLocationName: toLocation.name,
            eventDate: new Date(),
            initiatedByUserId: userId,
            initiatedByName: user?.name || user?.email || null,
            confirmedAt: new Date(),
            confirmedByUserId: userId,
            confirmedByName: user?.name || user?.email || null,
            confirmationMethod: "bulk_scan",
            notes: "Bulk transfer via scan",
          },
        });
      });

      results.push({ assetTag: tag, success: true });
      processed++;
    } catch (err) {
      results.push({
        assetTag: tag,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      failed++;
    }
  }

  if (processed > 0) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: userId,
        action: "ASSETS_BULK_TRANSFERRED",
        entityType: "Asset",
        entityId: "bulk",
        details: { count: processed, failed, toLocation: toLocation.name, assetTags },
      },
    });
  }

  revalidatePath("/dashboard/assets");
  revalidatePath("/dashboard/warehouse");
  revalidatePath("/dashboard/scan");

  return {
    success: failed === 0,
    processed,
    failed,
    results,
  };
}

export async function bulkUpdateStatus(
  assetTags: string[],
  newStatus: AssetStatus,
  notes?: string
): Promise<BulkOperationResult> {
  const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const results: BulkOperationResult["results"] = [];
  let processed = 0;
  let failed = 0;

  for (const tag of assetTags) {
    try {
      const asset = await prisma.asset.findFirst({
        where: { organizationId, assetTag: { equals: tag, mode: "insensitive" } },
      });

      if (!asset) {
        results.push({ assetTag: tag, success: false, error: "Asset not found" });
        failed++;
        continue;
      }

      if (!isValidAssetTransition(asset.status, newStatus)) {
        results.push({
          assetTag: tag,
          success: false,
          error: `Invalid transition: ${asset.status} → ${newStatus}`,
        });
        failed++;
        continue;
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
          where: { id: asset.id },
          data: updateData,
        });

        await recordAssetStatusChange(tx, {
          assetId: asset.id,
          organizationId,
          fromStatus: asset.status,
          toStatus: newStatus,
          changedByUserId: userId,
          changedByName: user?.name || user?.email || undefined,
          notes: notes || "Bulk status update via scan",
        });
      });

      results.push({ assetTag: tag, success: true });
      processed++;
    } catch (err) {
      results.push({
        assetTag: tag,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      failed++;
    }
  }

  if (processed > 0) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: userId,
        action: "ASSETS_BULK_STATUS_UPDATED",
        entityType: "Asset",
        entityId: "bulk",
        details: { count: processed, failed, newStatus, assetTags },
      },
    });
  }

  revalidatePath("/dashboard/assets");
  revalidatePath("/dashboard/scan");

  return {
    success: failed === 0,
    processed,
    failed,
    results,
  };
}

// ============================================
// LABEL GENERATION
// ============================================

export async function generateAssetLabels(
  assetIds: string[]
): Promise<{ success: boolean; labels?: Awaited<ReturnType<typeof generateLabelData>>[]; error?: string }> {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const assets = await prisma.asset.findMany({
      where: {
        id: { in: assetIds },
        organizationId,
      },
      select: {
        assetTag: true,
        category: true,
        manufacturer: true,
        model: true,
        serialNumber: true,
        customerAssetTag: true,
      },
    });

    if (assets.length === 0) {
      return { success: false, error: "No assets found" };
    }

    // Generate label data for each asset
    const labels = await Promise.all(assets.map((asset) => generateLabelData(asset)));

    return { success: true, labels };
  } catch (error) {
    console.error("Generate labels error:", error);
    return { success: false, error: "Failed to generate labels" };
  }
}

// ============================================
// HELPERS
// ============================================

async function generateCustodyReference(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  organizationId: string
): Promise<string> {
  const lastEvent = await tx.custodyEvent.findFirst({
    where: { organizationId },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });

  if (!lastEvent?.reference) {
    return "COC-000001";
  }

  const match = lastEvent.reference.match(/COC-(\d+)/);
  if (!match) {
    return "COC-000001";
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `COC-${nextNum.toString().padStart(6, "0")}`;
}

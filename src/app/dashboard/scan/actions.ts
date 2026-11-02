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

// ============================================
// SMART SCAN - ASSET WITH MEDIA LOOKUP
// ============================================

export interface AssetMediaLookupResult {
  found: boolean;
  asset?: {
    id: string;
    assetTag: string;
    category: string;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
    status: AssetStatus;
    customerName: string | null;
    customerId: string | null;
  };
  storageMedia?: Array<{
    id: string;
    reference: string;
    mediaType: string;
    capacity: string | null;
    serialNumber: string | null;
    sanitisationStatus: string;
    hasErasureJob: boolean;
    hasDestructionJob: boolean;
  }>;
  certificates?: Array<{
    id: string;
    certificateNumber: string;
    certificateType: string;
    status: string;
    issueDate: Date | null;
  }>;
  error?: string;
}

export async function lookupAssetWithMedia(scannedValue: string): Promise<AssetMediaLookupResult> {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const assetTag = extractAssetTag(scannedValue);
    if (!assetTag) {
      return { found: false, error: "Invalid scan value" };
    }

    // Try to find by asset tag, serial number, or customer asset tag
    let asset = await prisma.asset.findFirst({
      where: {
        organizationId,
        OR: [
          { assetTag: { equals: assetTag, mode: "insensitive" } },
          { serialNumber: { equals: assetTag, mode: "insensitive" } },
          { customerAssetTag: { equals: assetTag, mode: "insensitive" } },
        ],
      },
      include: {
        customer: { select: { id: true, name: true } },
        storageMedia: {
          select: {
            id: true,
            reference: true,
            mediaType: true,
            capacity: true,
            serialNumber: true,
            sanitisationStatus: true,
            erasureJobs: { select: { id: true }, take: 1 },
            destructionJob: { select: { id: true } },
          },
        },
      },
    });

    if (!asset) {
      return { found: false, error: `Asset not found: ${assetTag}` };
    }

    // Get certificates for this asset's media
    const certificates = await prisma.certificate.findMany({
      where: {
        organizationId,
        status: "ISSUED",
        items: {
          some: {
            storageMedia: {
              assetId: asset.id,
            },
          },
        },
      },
      select: {
        id: true,
        certificateNumber: true,
        certificateType: true,
        status: true,
        issueDate: true,
      },
      orderBy: { issueDate: "desc" },
      take: 5,
    });

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
        customerName: asset.customer?.name ?? null,
        customerId: asset.customer?.id ?? null,
      },
      storageMedia: asset.storageMedia.map((m) => ({
        id: m.id,
        reference: m.reference,
        mediaType: m.mediaType,
        capacity: m.capacity,
        serialNumber: m.serialNumber,
        sanitisationStatus: m.sanitisationStatus,
        hasErasureJob: m.erasureJobs.length > 0,
        hasDestructionJob: m.destructionJob !== null,
      })),
      certificates,
    };
  } catch (error) {
    console.error("Asset with media lookup error:", error);
    return { found: false, error: "Failed to lookup asset" };
  }
}

// ============================================
// SMART SCAN - MEDIA LOOKUP
// ============================================

export interface MediaLookupResult {
  found: boolean;
  media?: {
    id: string;
    reference: string;
    mediaType: string;
    capacity: string | null;
    serialNumber: string | null;
    sanitisationStatus: string;
    assetTag: string | null;
    assetId: string | null;
    customerName: string | null;
    hasErasureJob: boolean;
    hasDestructionJob: boolean;
  };
  error?: string;
}

export async function lookupMediaByReference(scannedValue: string): Promise<MediaLookupResult> {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const media = await prisma.storageMedia.findFirst({
      where: {
        organizationId,
        OR: [
          { reference: { equals: scannedValue, mode: "insensitive" } },
          { serialNumber: { equals: scannedValue, mode: "insensitive" } },
        ],
      },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            customer: { select: { name: true } },
          },
        },
        erasureJobs: { select: { id: true }, take: 1 },
        destructionJob: { select: { id: true } },
      },
    });

    if (!media) {
      return { found: false, error: `Media not found: ${scannedValue}` };
    }

    return {
      found: true,
      media: {
        id: media.id,
        reference: media.reference,
        mediaType: media.mediaType,
        capacity: media.capacity,
        serialNumber: media.serialNumber,
        sanitisationStatus: media.sanitisationStatus,
        assetTag: media.asset?.assetTag ?? null,
        assetId: media.asset?.id ?? null,
        customerName: media.asset?.customer?.name ?? null,
        hasErasureJob: media.erasureJobs.length > 0,
        hasDestructionJob: media.destructionJob !== null,
      },
    };
  } catch (error) {
    console.error("Media lookup error:", error);
    return { found: false, error: "Failed to lookup media" };
  }
}

// ============================================
// SMART SCAN - QUEUE FOR ERASURE
// ============================================

export async function queueMediaForErasure(
  mediaIds: string[],
  erasureMethod?: string
): Promise<{ success: boolean; queued: number; error?: string }> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    // Verify all media exist and are in valid state
    const media = await prisma.storageMedia.findMany({
      where: {
        id: { in: mediaIds },
        organizationId,
        sanitisationStatus: { in: ["NOT_STARTED", "PENDING_ERASURE", "ERASURE_FAILED"] },
      },
    });

    if (media.length === 0) {
      return { success: false, queued: 0, error: "No eligible media found for erasure" };
    }

    // Update media status
    await prisma.$transaction(async (tx) => {
      await tx.storageMedia.updateMany({
        where: { id: { in: media.map((m) => m.id) } },
        data: {
          sanitisationStatus: "ERASURE_IN_PROGRESS",
          sanitisationMethod: erasureMethod || null,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "MEDIA_QUEUED_ERASURE",
          entityType: "StorageMedia",
          entityId: "bulk",
          details: {
            mediaCount: media.length,
            mediaIds: media.map((m) => m.id),
            method: erasureMethod || "default",
          },
        },
      });
    });

    revalidatePath("/dashboard/scan");
    revalidatePath("/dashboard/erasure");

    return { success: true, queued: media.length };
  } catch (error) {
    console.error("Queue for erasure error:", error);
    return { success: false, queued: 0, error: "Failed to queue media for erasure" };
  }
}

// ============================================
// SMART SCAN - RECORD ERASURE RESULT
// ============================================

export async function recordErasureResult(
  mediaId: string,
  result: {
    success: boolean;
    method: string;
    startTime: Date;
    endTime: Date;
    passes?: number;
    verificationMethod?: string;
    errorMessage?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const media = await prisma.storageMedia.findFirst({
      where: { id: mediaId, organizationId },
    });

    if (!media) {
      return { success: false, error: "Media not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.storageMedia.update({
        where: { id: mediaId },
        data: {
          sanitisationStatus: result.success ? "ERASURE_PASSED" : "ERASURE_FAILED",
          sanitisationMethod: result.method,
          verifiedAt: result.success && result.verificationMethod ? new Date() : null,
          verifiedByUserId: result.success ? userId : null,
          verifiedByName: result.success ? (user?.name || user?.email) : null,
          notes: result.errorMessage || null,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: result.success ? "MEDIA_ERASURE_COMPLETE" : "MEDIA_ERASURE_FAILED",
          entityType: "StorageMedia",
          entityId: mediaId,
          details: {
            method: result.method,
            duration: Math.round((result.endTime.getTime() - result.startTime.getTime()) / 1000),
            passes: result.passes,
            verificationMethod: result.verificationMethod,
            errorMessage: result.errorMessage,
          },
        },
      });
    });

    revalidatePath("/dashboard/scan");
    revalidatePath("/dashboard/erasure");

    return { success: true };
  } catch (error) {
    console.error("Record erasure result error:", error);
    return { success: false, error: "Failed to record erasure result" };
  }
}

// ============================================
// SMART SCAN - QUEUE FOR DESTRUCTION
// ============================================

export async function queueMediaForDestruction(
  mediaIds: string[],
  destructionMethod?: string
): Promise<{ success: boolean; queued: number; error?: string }> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    // Verify all media exist and are in valid state for destruction
    const media = await prisma.storageMedia.findMany({
      where: {
        id: { in: mediaIds },
        organizationId,
        destructionJob: null,
        // Can destroy if sanitised, failed, or not started
        sanitisationStatus: { in: ["VERIFIED", "ERASURE_PASSED", "ERASURE_FAILED", "NOT_STARTED", "PENDING_ERASURE"] },
      },
    });

    if (media.length === 0) {
      return { success: false, queued: 0, error: "No eligible media found for destruction" };
    }

    // Update media status
    await prisma.$transaction(async (tx) => {
      await tx.storageMedia.updateMany({
        where: { id: { in: media.map((m) => m.id) } },
        data: {
          sanitisationStatus: "PENDING_DESTRUCTION",
          sanitisationMethod: destructionMethod || "PHYSICAL_DESTRUCTION",
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "MEDIA_QUEUED_DESTRUCTION",
          entityType: "StorageMedia",
          entityId: "bulk",
          details: {
            mediaCount: media.length,
            mediaIds: media.map((m) => m.id),
            method: destructionMethod || "PHYSICAL_DESTRUCTION",
          },
        },
      });
    });

    revalidatePath("/dashboard/scan");
    revalidatePath("/dashboard/destruction");

    return { success: true, queued: media.length };
  } catch (error) {
    console.error("Queue for destruction error:", error);
    return { success: false, queued: 0, error: "Failed to queue media for destruction" };
  }
}

// ============================================
// SMART SCAN - RECORD DESTRUCTION RESULT
// ============================================

export async function recordDestructionResult(
  mediaId: string,
  result: {
    success: boolean;
    method: string;
    destructionDate: Date;
    evidenceType?: string;
    evidenceNotes?: string;
    errorMessage?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const media = await prisma.storageMedia.findFirst({
      where: { id: mediaId, organizationId },
    });

    if (!media) {
      return { success: false, error: "Media not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.storageMedia.update({
        where: { id: mediaId },
        data: {
          sanitisationStatus: result.success ? "DESTROYED" : "PENDING_DESTRUCTION",
          sanitisationMethod: result.method,
          verifiedAt: result.success ? new Date() : null,
          verifiedByUserId: result.success ? userId : null,
          verifiedByName: result.success ? (user?.name || user?.email) : null,
          notes: result.errorMessage || result.evidenceNotes || null,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: result.success ? "MEDIA_DESTRUCTION_COMPLETE" : "MEDIA_DESTRUCTION_FAILED",
          entityType: "StorageMedia",
          entityId: mediaId,
          details: {
            method: result.method,
            destructionDate: result.destructionDate.toISOString(),
            evidenceType: result.evidenceType,
            evidenceNotes: result.evidenceNotes,
            errorMessage: result.errorMessage,
          },
        },
      });
    });

    revalidatePath("/dashboard/scan");
    revalidatePath("/dashboard/destruction");

    return { success: true };
  } catch (error) {
    console.error("Record destruction result error:", error);
    return { success: false, error: "Failed to record destruction result" };
  }
}

// ============================================
// SMART SCAN - CERTIFICATE LOOKUP
// ============================================

export interface CertificateLookupResult {
  found: boolean;
  certificate?: {
    id: string;
    certificateNumber: string;
    certificateType: string;
    status: string;
    issueDate: Date | null;
    customerName: string | null;
    totalMediaCount: number;
    verificationToken: string | null;
  };
  items?: Array<{
    id: string;
    mediaReference: string | null;
    assetTag: string | null;
    mediaType: string | null;
    processingMethod: string | null;
    outcomeStatus: string | null;
  }>;
  error?: string;
}

export async function lookupCertificateByNumber(
  scannedValue: string
): Promise<CertificateLookupResult> {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    // Extract certificate number or token
    const searchValue = scannedValue.trim();

    const certificate = await prisma.certificate.findFirst({
      where: {
        organizationId,
        OR: [
          { certificateNumber: { equals: searchValue, mode: "insensitive" } },
          { verificationToken: searchValue },
          { reference: { equals: searchValue, mode: "insensitive" } },
        ],
      },
      include: {
        customer: { select: { name: true } },
        items: {
          select: {
            id: true,
            mediaReference: true,
            assetTag: true,
            mediaType: true,
            processingMethod: true,
            outcomeStatus: true,
          },
          take: 10,
        },
      },
    });

    if (!certificate) {
      return { found: false, error: `Certificate not found: ${searchValue}` };
    }

    return {
      found: true,
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        certificateType: certificate.certificateType,
        status: certificate.status,
        issueDate: certificate.issueDate,
        customerName: certificate.customer?.name ?? null,
        totalMediaCount: certificate.totalMediaCount,
        verificationToken: certificate.verificationToken,
      },
      items: certificate.items,
    };
  } catch (error) {
    console.error("Certificate lookup error:", error);
    return { found: false, error: "Failed to lookup certificate" };
  }
}

// ============================================
// SMART SCAN - VERIFY MEDIA SANITISATION
// ============================================

export async function verifyMediaSanitisation(
  mediaId: string,
  verificationDetails: {
    method: string;
    passed: boolean;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const media = await prisma.storageMedia.findFirst({
      where: { id: mediaId, organizationId },
    });

    if (!media) {
      return { success: false, error: "Media not found" };
    }

    // Check if media has completed erasure (can verify ERASURE_PASSED or DESTROYED)
    if (media.sanitisationStatus !== "ERASURE_PASSED" && media.sanitisationStatus !== "DESTROYED") {
      return { success: false, error: "Media has not completed sanitisation" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.storageMedia.update({
        where: { id: mediaId },
        data: {
          sanitisationStatus: verificationDetails.passed ? "VERIFIED" : "ERASURE_FAILED",
          verifiedAt: new Date(),
          verifiedByUserId: userId,
          verifiedByName: user?.name || user?.email,
          notes: verificationDetails.notes || null,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: verificationDetails.passed ? "MEDIA_VERIFICATION_PASSED" : "MEDIA_VERIFICATION_FAILED",
          entityType: "StorageMedia",
          entityId: mediaId,
          details: {
            method: verificationDetails.method,
            passed: verificationDetails.passed,
            notes: verificationDetails.notes,
          },
        },
      });
    });

    revalidatePath("/dashboard/scan");
    revalidatePath("/dashboard/erasure");

    return { success: true };
  } catch (error) {
    console.error("Verify media sanitisation error:", error);
    return { success: false, error: "Failed to verify media" };
  }
}

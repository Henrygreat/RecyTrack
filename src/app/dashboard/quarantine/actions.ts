"use server";

import { prisma } from "@/lib/prisma";
import { requireMember, MANAGEMENT_ROLES, STAFF_ROLES } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { quarantineSchema, quarantineReleaseSchema } from "@/lib/validation";
import { recordAssetStatusChange } from "@/lib/assets";
import type { QuarantineReason, QuarantineStatus } from "@prisma/client";
import { QUARANTINE_REASON_LABELS } from "@/lib/quarantine";

// ============================================
// TYPES
// ============================================

export type QuarantineActionState = {
  error?: string;
  success?: boolean;
  quarantineId?: string;
};

// ============================================
// QUARANTINE ACTIONS
// ============================================

export async function createQuarantine(
  _prevState: QuarantineActionState,
  formData: FormData
): Promise<QuarantineActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const rawData = Object.fromEntries(formData);
    const parsed = quarantineSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    // Verify asset exists and is not already in quarantine
    const asset = await prisma.asset.findFirst({
      where: { id: data.assetId, organizationId },
    });

    if (!asset) {
      return { error: "Asset not found" };
    }

    if (asset.status === "QUARANTINED") {
      return { error: "Asset is already in quarantine" };
    }

    // Check for existing active quarantine
    const existingQuarantine = await prisma.assetQuarantine.findFirst({
      where: { assetId: data.assetId, organizationId, status: "ACTIVE" },
    });

    if (existingQuarantine) {
      return { error: "Asset already has an active quarantine record" };
    }

    // Verify quarantine location if provided
    if (data.quarantineLocationId) {
      const location = await prisma.warehouseLocation.findFirst({
        where: { id: data.quarantineLocationId, organizationId, isActive: true },
      });
      if (!location) {
        return { error: "Quarantine location not found or inactive" };
      }
    }

    const quarantine = await prisma.$transaction(async (tx) => {
      // Create quarantine record
      const q = await tx.assetQuarantine.create({
        data: {
          organizationId,
          assetId: data.assetId,
          reason: data.reason as QuarantineReason,
          status: "ACTIVE",
          description: data.description || null,
          startDate: new Date(),
          expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : null,
          quarantineLocationId: data.quarantineLocationId || null,
          previousLocationId: asset.warehouseLocationId,
          assignedToUserId: userId,
          assignedToName: user?.name || user?.email || null,
          createdByUserId: userId,
          createdByName: user?.name || user?.email || null,
        },
      });

      // Update asset status to QUARANTINED
      const previousStatus = asset.status;
      await tx.asset.update({
        where: { id: data.assetId },
        data: {
          status: "QUARANTINED",
          warehouseLocationId: data.quarantineLocationId || asset.warehouseLocationId,
          updatedAt: new Date(),
        },
      });

      // Record status change
      await recordAssetStatusChange(tx, {
        assetId: data.assetId,
        organizationId,
        fromStatus: previousStatus,
        toStatus: "QUARANTINED",
        changedByUserId: userId,
        changedByName: user?.name || user?.email || undefined,
        reason: data.reason,
        notes: data.description || `Quarantined: ${QUARANTINE_REASON_LABELS[data.reason as QuarantineReason]}`,
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ASSET_QUARANTINED",
          entityType: "AssetQuarantine",
          entityId: q.id,
          details: { assetId: data.assetId, reason: data.reason },
        },
      });

      return q;
    });

    revalidatePath("/dashboard/quarantine");
    revalidatePath(`/dashboard/assets/${data.assetId}`);
    return { success: true, quarantineId: quarantine.id };
  } catch (error) {
    console.error("Create quarantine error:", error);
    return { error: "Failed to create quarantine. Please try again." };
  }
}

export async function releaseFromQuarantine(
  _prevState: QuarantineActionState,
  formData: FormData
): Promise<QuarantineActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const rawData = Object.fromEntries(formData);
    const parsed = quarantineReleaseSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    // Find the quarantine record
    const quarantine = await prisma.assetQuarantine.findFirst({
      where: { id: data.quarantineId, organizationId, status: "ACTIVE" },
      include: { asset: true },
    });

    if (!quarantine) {
      return { error: "Active quarantine record not found" };
    }

    await prisma.$transaction(async (tx) => {
      // Update quarantine record
      await tx.assetQuarantine.update({
        where: { id: data.quarantineId },
        data: {
          status: "RELEASED",
          actualEndDate: new Date(),
          resolutionAction: data.resolutionAction,
          resolutionNotes: data.resolutionNotes || null,
          resolvedByUserId: userId,
          resolvedByName: user?.name || user?.email || null,
          resolvedAt: new Date(),
          releaseApprovedBy: userId,
          releaseApprovedByName: user?.name || user?.email || null,
          releaseApprovedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Determine next status based on previous status or default to RECEIVED
      const nextStatus = quarantine.asset.status === "QUARANTINED" ? "RECEIVED" : quarantine.asset.status;

      // Update asset status back to previous state
      await tx.asset.update({
        where: { id: quarantine.assetId },
        data: {
          status: nextStatus,
          warehouseLocationId: quarantine.previousLocationId || quarantine.asset.warehouseLocationId,
          updatedAt: new Date(),
        },
      });

      // Record status change
      await recordAssetStatusChange(tx, {
        assetId: quarantine.assetId,
        organizationId,
        fromStatus: "QUARANTINED",
        toStatus: nextStatus,
        changedByUserId: userId,
        changedByName: user?.name || user?.email || undefined,
        reason: "Released from quarantine",
        notes: `Resolution: ${data.resolutionAction}`,
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ASSET_RELEASED_FROM_QUARANTINE",
          entityType: "AssetQuarantine",
          entityId: data.quarantineId,
          details: {
            assetId: quarantine.assetId,
            resolutionAction: data.resolutionAction,
          },
        },
      });
    });

    revalidatePath("/dashboard/quarantine");
    revalidatePath(`/dashboard/assets/${quarantine.assetId}`);
    return { success: true, quarantineId: data.quarantineId };
  } catch (error) {
    console.error("Release from quarantine error:", error);
    return { error: "Failed to release from quarantine. Please try again." };
  }
}

export async function updateQuarantineAssignment(
  quarantineId: string,
  assignedToUserId: string,
  assignedToName: string
): Promise<QuarantineActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const quarantine = await prisma.assetQuarantine.findFirst({
      where: { id: quarantineId, organizationId, status: "ACTIVE" },
    });

    if (!quarantine) {
      return { error: "Active quarantine record not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.assetQuarantine.update({
        where: { id: quarantineId },
        data: {
          assignedToUserId,
          assignedToName,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "QUARANTINE_REASSIGNED",
          entityType: "AssetQuarantine",
          entityId: quarantineId,
          details: { assignedToUserId, assignedToName },
        },
      });
    });

    revalidatePath("/dashboard/quarantine");
    revalidatePath(`/dashboard/quarantine/${quarantineId}`);
    return { success: true, quarantineId };
  } catch (error) {
    console.error("Update quarantine assignment error:", error);
    return { error: "Failed to update assignment. Please try again." };
  }
}

export async function addQuarantineNote(
  quarantineId: string,
  note: string
): Promise<QuarantineActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const quarantine = await prisma.assetQuarantine.findFirst({
      where: { id: quarantineId, organizationId },
    });

    if (!quarantine) {
      return { error: "Quarantine record not found" };
    }

    // Add note to the asset
    await prisma.assetNote.create({
      data: {
        organizationId,
        assetId: quarantine.assetId,
        noteType: "quarantine",
        content: note,
        createdByUserId: userId,
        createdByName: user?.name || user?.email || null,
      },
    });

    revalidatePath(`/dashboard/quarantine/${quarantineId}`);
    revalidatePath(`/dashboard/assets/${quarantine.assetId}`);
    return { success: true, quarantineId };
  } catch (error) {
    console.error("Add quarantine note error:", error);
    return { error: "Failed to add note. Please try again." };
  }
}

export async function disposeFromQuarantine(
  quarantineId: string,
  disposalNotes: string
): Promise<QuarantineActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const quarantine = await prisma.assetQuarantine.findFirst({
      where: { id: quarantineId, organizationId, status: "ACTIVE" },
      include: { asset: true },
    });

    if (!quarantine) {
      return { error: "Active quarantine record not found" };
    }

    await prisma.$transaction(async (tx) => {
      // Update quarantine record
      await tx.assetQuarantine.update({
        where: { id: quarantineId },
        data: {
          status: "DISPOSED",
          actualEndDate: new Date(),
          resolutionAction: "Disposed",
          resolutionNotes: disposalNotes,
          resolvedByUserId: userId,
          resolvedByName: user?.name || user?.email || null,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Update asset status to DESTROYED
      await tx.asset.update({
        where: { id: quarantine.assetId },
        data: {
          status: "DESTROYED",
          dispositionOutcome: "DESTROY",
          dispositionDate: new Date(),
          dispositionNotes: disposalNotes,
          releasedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Record status change
      await recordAssetStatusChange(tx, {
        assetId: quarantine.assetId,
        organizationId,
        fromStatus: "QUARANTINED",
        toStatus: "DESTROYED",
        changedByUserId: userId,
        changedByName: user?.name || user?.email || undefined,
        reason: "Disposed from quarantine",
        notes: disposalNotes,
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "ASSET_DISPOSED_FROM_QUARANTINE",
          entityType: "AssetQuarantine",
          entityId: quarantineId,
          details: {
            assetId: quarantine.assetId,
            disposalNotes,
          },
        },
      });
    });

    revalidatePath("/dashboard/quarantine");
    revalidatePath(`/dashboard/assets/${quarantine.assetId}`);
    return { success: true, quarantineId };
  } catch (error) {
    console.error("Dispose from quarantine error:", error);
    return { error: "Failed to dispose asset. Please try again." };
  }
}

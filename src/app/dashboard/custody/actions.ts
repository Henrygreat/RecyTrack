"use server";

import { prisma } from "@/lib/prisma";
import { requireMember, MANAGEMENT_ROLES, STAFF_ROLES } from "@/lib/access";
import { revalidatePath } from "next/cache";
import {
  custodyEventSchema,
  custodyConfirmSchema,
  custodyRejectSchema,
  custodyExceptionSchema,
  custodyExceptionResolveSchema,
} from "@/lib/validation";
import type {
  CustodyEventType,
  HandoverStatus,
  CustodyExceptionType,
  CustodyExceptionStatus,
} from "@prisma/client";

// ============================================
// TYPES
// ============================================

export type CustodyActionState = {
  error?: string;
  success?: boolean;
  eventId?: string;
  reference?: string;
};

export type CustodyExceptionActionState = {
  error?: string;
  success?: boolean;
  exceptionId?: string;
  reference?: string;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function generateCustodyReference(organizationId: string): Promise<string> {
  const lastEvent = await prisma.custodyEvent.findFirst({
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

async function generateExceptionReference(organizationId: string): Promise<string> {
  const lastException = await prisma.custodyException.findFirst({
    where: { organizationId },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });

  if (!lastException?.reference) {
    return "EXC-000001";
  }

  const match = lastException.reference.match(/EXC-(\d+)/);
  if (!match) {
    return "EXC-000001";
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `EXC-${nextNum.toString().padStart(6, "0")}`;
}

// ============================================
// CUSTODY EVENT ACTIONS
// ============================================

export async function initiateCustodyTransfer(
  _prevState: CustodyActionState,
  formData: FormData
): Promise<CustodyActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const rawData = Object.fromEntries(formData);
    const parsed = custodyEventSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    // Verify asset exists
    const asset = await prisma.asset.findFirst({
      where: { id: data.assetId, organizationId },
      include: { warehouseLocation: true },
    });

    if (!asset) {
      return { error: "Asset not found" };
    }

    // Get the last custody event to determine current custodian
    const lastCustodyEvent = await prisma.custodyEvent.findFirst({
      where: { assetId: data.assetId, organizationId, handoverStatus: "CONFIRMED" },
      orderBy: { eventDate: "desc" },
    });

    // Verify destination location if provided
    if (data.toLocationId) {
      const location = await prisma.warehouseLocation.findFirst({
        where: { id: data.toLocationId, organizationId },
      });
      if (!location) {
        return { error: "Destination location not found" };
      }
    }

    const reference = await generateCustodyReference(organizationId);

    const event = await prisma.$transaction(async (tx) => {
      const e = await tx.custodyEvent.create({
        data: {
          organizationId,
          reference,
          assetId: data.assetId,
          eventType: data.eventType as CustodyEventType,
          handoverStatus: "PENDING",
          fromCustodianUserId: lastCustodyEvent?.toCustodianUserId || null,
          fromCustodianName: lastCustodyEvent?.toCustodianName || null,
          fromCustodianType: lastCustodyEvent?.toCustodianType || null,
          toCustodianUserId: data.toCustodianUserId || null,
          toCustodianName: data.toCustodianName || null,
          toCustodianType: data.toCustodianType || null,
          fromLocationId: asset.warehouseLocationId,
          fromLocationName: asset.warehouseLocation?.name || null,
          toLocationId: data.toLocationId || null,
          toLocationName: data.toLocationName || null,
          eventDate: new Date(),
          initiatedByUserId: userId,
          initiatedByName: user?.name || user?.email || null,
          notes: data.notes || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTODY_TRANSFER_INITIATED",
          entityType: "CustodyEvent",
          entityId: e.id,
          details: {
            reference,
            assetId: data.assetId,
            eventType: data.eventType,
            toCustodian: data.toCustodianName,
          },
        },
      });

      return e;
    });

    revalidatePath("/dashboard/custody");
    revalidatePath(`/dashboard/assets/${data.assetId}`);
    return { success: true, eventId: event.id, reference: event.reference };
  } catch (error) {
    console.error("Initiate custody transfer error:", error);
    return { error: "Failed to initiate custody transfer. Please try again." };
  }
}

export async function confirmCustodyHandover(
  _prevState: CustodyActionState,
  formData: FormData
): Promise<CustodyActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const rawData = Object.fromEntries(formData);
    const parsed = custodyConfirmSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    // Find the custody event
    const event = await prisma.custodyEvent.findFirst({
      where: { id: data.eventId, organizationId, handoverStatus: "PENDING" },
      include: { asset: true },
    });

    if (!event) {
      return { error: "Pending custody event not found" };
    }

    await prisma.$transaction(async (tx) => {
      // Update custody event
      await tx.custodyEvent.update({
        where: { id: data.eventId },
        data: {
          handoverStatus: "CONFIRMED",
          confirmedAt: new Date(),
          confirmedByUserId: userId,
          confirmedByName: user?.name || user?.email || null,
          confirmationMethod: data.confirmationMethod || "manual",
          signatureData: data.signatureData || null,
          notes: data.notes ? `${event.notes || ""}\n\nConfirmation: ${data.notes}`.trim() : event.notes,
          updatedAt: new Date(),
        },
      });

      // Update asset location if destination location was specified
      if (event.toLocationId) {
        await tx.asset.update({
          where: { id: event.assetId },
          data: {
            warehouseLocationId: event.toLocationId,
            updatedAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTODY_HANDOVER_CONFIRMED",
          entityType: "CustodyEvent",
          entityId: data.eventId,
          details: {
            assetId: event.assetId,
            confirmedBy: user?.name || user?.email,
            confirmationMethod: data.confirmationMethod,
          },
        },
      });
    });

    revalidatePath("/dashboard/custody");
    revalidatePath(`/dashboard/assets/${event.assetId}`);
    return { success: true, eventId: data.eventId };
  } catch (error) {
    console.error("Confirm custody handover error:", error);
    return { error: "Failed to confirm handover. Please try again." };
  }
}

export async function rejectCustodyHandover(
  _prevState: CustodyActionState,
  formData: FormData
): Promise<CustodyActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const rawData = Object.fromEntries(formData);
    const parsed = custodyRejectSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    // Find the custody event
    const event = await prisma.custodyEvent.findFirst({
      where: { id: data.eventId, organizationId, handoverStatus: "PENDING" },
    });

    if (!event) {
      return { error: "Pending custody event not found" };
    }

    await prisma.$transaction(async (tx) => {
      // Update custody event
      await tx.custodyEvent.update({
        where: { id: data.eventId },
        data: {
          handoverStatus: "REJECTED",
          rejectedAt: new Date(),
          rejectedByUserId: userId,
          rejectedByName: user?.name || user?.email || null,
          rejectionReason: data.rejectionReason,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTODY_HANDOVER_REJECTED",
          entityType: "CustodyEvent",
          entityId: data.eventId,
          details: {
            assetId: event.assetId,
            rejectedBy: user?.name || user?.email,
            reason: data.rejectionReason,
          },
        },
      });
    });

    revalidatePath("/dashboard/custody");
    revalidatePath(`/dashboard/assets/${event.assetId}`);
    return { success: true, eventId: data.eventId };
  } catch (error) {
    console.error("Reject custody handover error:", error);
    return { error: "Failed to reject handover. Please try again." };
  }
}

export async function cancelCustodyTransfer(eventId: string): Promise<CustodyActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const event = await prisma.custodyEvent.findFirst({
      where: { id: eventId, organizationId, handoverStatus: "PENDING" },
    });

    if (!event) {
      return { error: "Pending custody event not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.custodyEvent.update({
        where: { id: eventId },
        data: {
          handoverStatus: "CANCELLED",
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTODY_TRANSFER_CANCELLED",
          entityType: "CustodyEvent",
          entityId: eventId,
          details: { assetId: event.assetId },
        },
      });
    });

    revalidatePath("/dashboard/custody");
    revalidatePath(`/dashboard/assets/${event.assetId}`);
    return { success: true, eventId };
  } catch (error) {
    console.error("Cancel custody transfer error:", error);
    return { error: "Failed to cancel transfer. Please try again." };
  }
}

// ============================================
// CUSTODY EXCEPTION ACTIONS
// ============================================

export async function createCustodyException(
  _prevState: CustodyExceptionActionState,
  formData: FormData
): Promise<CustodyExceptionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const rawData = Object.fromEntries(formData);
    const parsed = custodyExceptionSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    // Verify asset exists
    const asset = await prisma.asset.findFirst({
      where: { id: data.assetId, organizationId },
    });

    if (!asset) {
      return { error: "Asset not found" };
    }

    const reference = await generateExceptionReference(organizationId);

    const exception = await prisma.$transaction(async (tx) => {
      const e = await tx.custodyException.create({
        data: {
          organizationId,
          reference,
          assetId: data.assetId,
          exceptionType: data.exceptionType as CustodyExceptionType,
          status: "OPEN",
          description: data.description,
          detectedAt: new Date(),
          detectedByUserId: userId,
          detectedByName: user?.name || user?.email || null,
          expectedValue: data.expectedValue || null,
          actualValue: data.actualValue || null,
          priority: data.priority,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTODY_EXCEPTION_CREATED",
          entityType: "CustodyException",
          entityId: e.id,
          details: {
            reference,
            assetId: data.assetId,
            exceptionType: data.exceptionType,
            priority: data.priority,
          },
        },
      });

      return e;
    });

    revalidatePath("/dashboard/custody/exceptions");
    revalidatePath(`/dashboard/assets/${data.assetId}`);
    return { success: true, exceptionId: exception.id, reference: exception.reference };
  } catch (error) {
    console.error("Create custody exception error:", error);
    return { error: "Failed to create exception. Please try again." };
  }
}

export async function updateExceptionStatus(
  exceptionId: string,
  status: CustodyExceptionStatus,
  notes?: string
): Promise<CustodyExceptionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const exception = await prisma.custodyException.findFirst({
      where: { id: exceptionId, organizationId },
    });

    if (!exception) {
      return { error: "Exception not found" };
    }

    await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };

      if (status === "INVESTIGATING") {
        updateData.investigatedByUserId = userId;
        updateData.investigatedByName = user?.name || user?.email || null;
        if (notes) updateData.investigationNotes = notes;
      }

      await tx.custodyException.update({
        where: { id: exceptionId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTODY_EXCEPTION_STATUS_UPDATED",
          entityType: "CustodyException",
          entityId: exceptionId,
          details: { newStatus: status, notes },
        },
      });
    });

    revalidatePath("/dashboard/custody/exceptions");
    revalidatePath(`/dashboard/custody/exceptions/${exceptionId}`);
    return { success: true, exceptionId };
  } catch (error) {
    console.error("Update exception status error:", error);
    return { error: "Failed to update exception. Please try again." };
  }
}

export async function resolveException(
  _prevState: CustodyExceptionActionState,
  formData: FormData
): Promise<CustodyExceptionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const rawData = Object.fromEntries(formData);
    const parsed = custodyExceptionResolveSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    const exception = await prisma.custodyException.findFirst({
      where: { id: data.exceptionId, organizationId },
    });

    if (!exception) {
      return { error: "Exception not found" };
    }

    if (exception.status === "RESOLVED") {
      return { error: "Exception is already resolved" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.custodyException.update({
        where: { id: data.exceptionId },
        data: {
          status: "RESOLVED",
          resolutionNotes: data.resolutionNotes,
          resolvedByUserId: userId,
          resolvedByName: user?.name || user?.email || null,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTODY_EXCEPTION_RESOLVED",
          entityType: "CustodyException",
          entityId: data.exceptionId,
          details: { resolutionNotes: data.resolutionNotes },
        },
      });
    });

    revalidatePath("/dashboard/custody/exceptions");
    revalidatePath(`/dashboard/custody/exceptions/${data.exceptionId}`);
    return { success: true, exceptionId: data.exceptionId };
  } catch (error) {
    console.error("Resolve exception error:", error);
    return { error: "Failed to resolve exception. Please try again." };
  }
}

export async function escalateException(
  exceptionId: string,
  escalationReason: string,
  escalateToUserId?: string,
  escalateToName?: string
): Promise<CustodyExceptionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const exception = await prisma.custodyException.findFirst({
      where: { id: exceptionId, organizationId },
    });

    if (!exception) {
      return { error: "Exception not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.custodyException.update({
        where: { id: exceptionId },
        data: {
          status: "ESCALATED",
          escalatedAt: new Date(),
          escalatedToUserId: escalateToUserId || null,
          escalatedToName: escalateToName || null,
          escalationReason,
          priority: "critical", // Escalation raises to critical priority
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTODY_EXCEPTION_ESCALATED",
          entityType: "CustodyException",
          entityId: exceptionId,
          details: { escalationReason, escalatedTo: escalateToName },
        },
      });
    });

    revalidatePath("/dashboard/custody/exceptions");
    revalidatePath(`/dashboard/custody/exceptions/${exceptionId}`);
    return { success: true, exceptionId };
  } catch (error) {
    console.error("Escalate exception error:", error);
    return { error: "Failed to escalate exception. Please try again." };
  }
}

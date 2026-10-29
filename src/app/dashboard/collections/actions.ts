"use server";

import { prisma } from "@/lib/prisma";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { CollectionStatus, CollectionPriority, CollectionType } from "@prisma/client";
import {
  generateCollectionReference,
  isValidTransition,
  recordStatusChange,
  getStatusTimestampField,
  canEditCollection,
} from "@/lib/collections";
import { sendCollectionEmail, isEmailConfigured } from "@/lib/email";

// Validation schemas
const createCollectionSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  siteId: z.string().optional(),
  collectionType: z.enum(["STANDARD", "SECURE_DATA", "HAZARDOUS", "LARGE_ITEMS", "MIXED"]).default("STANDARD"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  requestedDate: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  postcode: z.string().min(1, "Postcode is required"),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  equipmentCategories: z.array(z.string()).default([]),
  itemEstimate: z.coerce.number().int().min(0).default(0),
  specialHandling: z.string().optional(),
  customerInstructions: z.string().optional(),
  internalNotes: z.string().optional(),
  submitAsDraft: z.coerce.boolean().default(false),
});

const updateCollectionSchema = createCollectionSchema.extend({
  id: z.string().min(1),
});

const statusChangeSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "DRAFT", "REQUESTED", "APPROVED", "SCHEDULED", "ASSIGNED",
    "IN_TRANSIT", "COLLECTED", "RECEIVED", "COMPLETED", "CANCELLED", "EXCEPTION"
  ]),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const assignDriverSchema = z.object({
  id: z.string().min(1),
  driverId: z.string().optional(),
  driverName: z.string().optional(),
  vehicleReg: z.string().optional(),
  scheduledDate: z.string().optional(),
});

export type CollectionActionState = {
  error?: string;
  success?: boolean;
  collectionId?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Create a new collection booking
 */
export async function createCollection(
  _prevState: CollectionActionState,
  formData: FormData
): Promise<CollectionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    // Parse equipment categories from form
    const equipmentCategories: string[] = [];
    formData.forEach((value, key) => {
      if (key.startsWith("equipment_") && value === "on") {
        equipmentCategories.push(key.replace("equipment_", ""));
      }
    });

    const rawData = {
      ...Object.fromEntries(formData),
      equipmentCategories,
      contactEmail: formData.get("contactEmail") || undefined,
    };

    const parsed = createCollectionSchema.safeParse(rawData);

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

    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId, status: "ACTIVE" },
      select: { id: true, name: true, email: true },
    });

    if (!customer) {
      return { error: "Customer not found or inactive" };
    }

    // Verify site if provided
    let site = null;
    if (data.siteId) {
      site = await prisma.site.findFirst({
        where: { id: data.siteId, organizationId, customerId: data.customerId, isActive: true },
        select: { id: true, name: true, contactName: true, contactPhone: true, contactEmail: true },
      });
      if (!site) {
        return { error: "Site not found or inactive" };
      }
    }

    const reference = await generateCollectionReference(organizationId);
    const initialStatus: CollectionStatus = data.submitAsDraft ? "DRAFT" : "REQUESTED";

    // Get user name for audit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const collection = await prisma.$transaction(async (tx) => {
      const coll = await tx.collection.create({
        data: {
          organizationId,
          reference,
          customerId: data.customerId,
          siteId: data.siteId || null,
          collectionType: data.collectionType as CollectionType,
          priority: data.priority as CollectionPriority,
          requestedDate: data.requestedDate ? new Date(data.requestedDate + "T12:00:00.000Z") : null,
          status: initialStatus,
          address: data.address,
          postcode: data.postcode.toUpperCase(),
          contactName: data.contactName || site?.contactName || null,
          contactPhone: data.contactPhone || site?.contactPhone || null,
          contactEmail: data.contactEmail || site?.contactEmail || null,
          equipmentCategories: data.equipmentCategories,
          itemEstimate: data.itemEstimate,
          specialHandling: data.specialHandling || null,
          customerInstructions: data.customerInstructions || null,
          internalNotes: data.internalNotes || null,
        },
      });

      // Record initial status
      await recordStatusChange(tx, {
        collectionId: coll.id,
        organizationId,
        fromStatus: null,
        toStatus: initialStatus,
        changedByUserId: userId,
        changedByName: user?.name || user?.email,
        reason: data.submitAsDraft ? "Saved as draft" : "Collection requested",
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "COLLECTION_CREATED",
          entityType: "Collection",
          entityId: coll.id,
          details: {
            reference,
            customerId: data.customerId,
            status: initialStatus,
          },
        },
      });

      return coll;
    });

    // Send confirmation email if requested (not draft)
    if (!data.submitAsDraft && isEmailConfigured() && customer.email) {
      await sendCollectionEmail({
        to: customer.email,
        type: "booking_confirmed",
        collectionRef: reference,
        customerName: customer.name,
        siteName: site?.name,
        collectionDate: data.requestedDate ? new Date(data.requestedDate) : undefined,
      });
    }

    revalidatePath("/dashboard/collections");
    revalidatePath(`/dashboard/customers/${data.customerId}`);

    return { success: true, collectionId: collection.id };
  } catch (error) {
    console.error("Create collection error:", error);
    return { error: "Failed to create collection. Please try again." };
  }
}

/**
 * Update an existing collection
 */
export async function updateCollection(
  _prevState: CollectionActionState,
  formData: FormData
): Promise<CollectionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const equipmentCategories: string[] = [];
    formData.forEach((value, key) => {
      if (key.startsWith("equipment_") && value === "on") {
        equipmentCategories.push(key.replace("equipment_", ""));
      }
    });

    const rawData = {
      ...Object.fromEntries(formData),
      equipmentCategories,
      contactEmail: formData.get("contactEmail") || undefined,
    };

    const parsed = updateCollectionSchema.safeParse(rawData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      return { fieldErrors, error: "Please check the form for errors" };
    }

    const { id, submitAsDraft, ...data } = parsed.data;

    // Verify collection exists and is editable
    const existing = await prisma.collection.findFirst({
      where: { id, organizationId },
      select: { id: true, status: true, customerId: true },
    });

    if (!existing) {
      return { error: "Collection not found" };
    }

    if (!canEditCollection(existing.status)) {
      return { error: "Collection cannot be edited in current status" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.collection.update({
        where: { id },
        data: {
          siteId: data.siteId || null,
          collectionType: data.collectionType as CollectionType,
          priority: data.priority as CollectionPriority,
          requestedDate: data.requestedDate ? new Date(data.requestedDate + "T12:00:00.000Z") : null,
          address: data.address,
          postcode: data.postcode.toUpperCase(),
          contactName: data.contactName || null,
          contactPhone: data.contactPhone || null,
          contactEmail: data.contactEmail || null,
          equipmentCategories: data.equipmentCategories,
          itemEstimate: data.itemEstimate,
          specialHandling: data.specialHandling || null,
          customerInstructions: data.customerInstructions || null,
          internalNotes: data.internalNotes || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "COLLECTION_UPDATED",
          entityType: "Collection",
          entityId: id,
        },
      });
    });

    revalidatePath("/dashboard/collections");
    revalidatePath(`/dashboard/collections/${id}`);

    return { success: true, collectionId: id };
  } catch (error) {
    console.error("Update collection error:", error);
    return { error: "Failed to update collection. Please try again." };
  }
}

/**
 * Change collection status with validation
 * Drivers can update status on their assigned collections
 */
export async function changeCollectionStatus(
  _prevState: CollectionActionState,
  formData: FormData
): Promise<CollectionActionState> {
  try {
    const { organizationId, userId, membership } = await requireMember();

    const parsed = statusChangeSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { id, status: newStatus, reason, notes } = parsed.data;

    const collection = await prisma.collection.findFirst({
      where: { id, organizationId },
      include: {
        customer: { select: { name: true, email: true } },
        site: { select: { name: true } },
      },
    });

    if (!collection) {
      return { error: "Collection not found" };
    }

    // Check authorization - managers can do anything, drivers limited to their collections
    const isManager = MANAGEMENT_ROLES.includes(membership.role);
    const isAssignedDriver = collection.driverId === userId;

    // Driver-allowed status changes
    const driverAllowedTransitions: [CollectionStatus, CollectionStatus][] = [
      ["ASSIGNED", "IN_TRANSIT"],
      ["IN_TRANSIT", "COLLECTED"],
      ["IN_TRANSIT", "EXCEPTION"],
      ["COLLECTED", "EXCEPTION"],
    ];

    const isDriverAllowed = driverAllowedTransitions.some(
      ([from, to]) => collection.status === from && newStatus === to
    );

    if (!isManager && (!isAssignedDriver || !isDriverAllowed)) {
      return { error: "You are not authorized to change this collection status" };
    }

    if (!isValidTransition(collection.status, newStatus as CollectionStatus)) {
      return { error: `Cannot change status from ${collection.status} to ${newStatus}` };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const timestampField = getStatusTimestampField(newStatus as CollectionStatus);

    await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        status: newStatus,
      };

      if (timestampField) {
        updateData[timestampField] = new Date();
      }

      if (newStatus === "EXCEPTION") {
        updateData.exceptionReason = reason || null;
        updateData.exceptionNotes = notes || null;
      }

      await tx.collection.update({
        where: { id },
        data: updateData,
      });

      await recordStatusChange(tx, {
        collectionId: id,
        organizationId,
        fromStatus: collection.status,
        toStatus: newStatus as CollectionStatus,
        changedByUserId: userId,
        changedByName: user?.name || user?.email,
        reason,
        notes,
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "COLLECTION_STATUS_CHANGED",
          entityType: "Collection",
          entityId: id,
          details: {
            from: collection.status,
            to: newStatus,
            reason,
          },
        },
      });
    });

    // Send email notifications for key status changes
    if (isEmailConfigured() && collection.customer.email) {
      const emailType = getEmailTypeForStatus(newStatus as CollectionStatus);
      if (emailType) {
        await sendCollectionEmail({
          to: collection.customer.email,
          type: emailType,
          collectionRef: collection.reference,
          customerName: collection.customer.name,
          siteName: collection.site?.name,
          collectionDate: collection.scheduledDate || undefined,
        });
      }
    }

    revalidatePath("/dashboard/collections");
    revalidatePath(`/dashboard/collections/${id}`);
    revalidatePath("/dashboard/driver");

    return { success: true };
  } catch (error) {
    console.error("Change status error:", error);
    return { error: "Failed to change status. Please try again." };
  }
}

/**
 * Assign driver to collection
 */
export async function assignDriver(
  _prevState: CollectionActionState,
  formData: FormData
): Promise<CollectionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const parsed = assignDriverSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { id, driverId, driverName, vehicleReg, scheduledDate } = parsed.data;

    const collection = await prisma.collection.findFirst({
      where: { id, organizationId },
      select: { id: true, status: true },
    });

    if (!collection) {
      return { error: "Collection not found" };
    }

    // Can assign driver when APPROVED, SCHEDULED, or re-assigning
    if (!["APPROVED", "SCHEDULED", "ASSIGNED"].includes(collection.status)) {
      return { error: "Collection must be approved before assigning a driver" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        driverId: driverId || null,
        driverName: driverName || null,
        vehicleReg: vehicleReg || null,
      };

      if (scheduledDate) {
        updateData.scheduledDate = new Date(scheduledDate + "T12:00:00.000Z");
      }

      // If assigning driver and collection is approved/scheduled, move to ASSIGNED
      if (driverId || driverName) {
        if (["APPROVED", "SCHEDULED"].includes(collection.status)) {
          updateData.status = "ASSIGNED";
          updateData.assignedAt = new Date();

          await recordStatusChange(tx, {
            collectionId: id,
            organizationId,
            fromStatus: collection.status as CollectionStatus,
            toStatus: "ASSIGNED",
            changedByUserId: userId,
            changedByName: user?.name || user?.email,
            reason: `Driver assigned: ${driverName || driverId}`,
          });
        }
      }

      await tx.collection.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "COLLECTION_DRIVER_ASSIGNED",
          entityType: "Collection",
          entityId: id,
          details: { driverId, driverName, vehicleReg },
        },
      });
    });

    revalidatePath("/dashboard/collections");
    revalidatePath(`/dashboard/collections/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Assign driver error:", error);
    return { error: "Failed to assign driver. Please try again." };
  }
}

/**
 * Cancel a collection
 */
export async function cancelCollection(collectionId: string, reason?: string): Promise<CollectionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, organizationId },
      select: { id: true, status: true },
    });

    if (!collection) {
      return { error: "Collection not found" };
    }

    if (!isValidTransition(collection.status, "CANCELLED")) {
      return { error: "Collection cannot be cancelled in current status" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.collection.update({
        where: { id: collectionId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      await recordStatusChange(tx, {
        collectionId,
        organizationId,
        fromStatus: collection.status,
        toStatus: "CANCELLED",
        changedByUserId: userId,
        changedByName: user?.name || user?.email,
        reason: reason || "Collection cancelled",
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "COLLECTION_CANCELLED",
          entityType: "Collection",
          entityId: collectionId,
          details: { reason },
        },
      });
    });

    revalidatePath("/dashboard/collections");

    return { success: true };
  } catch (error) {
    console.error("Cancel collection error:", error);
    return { error: "Failed to cancel collection. Please try again." };
  }
}

// Helper to map status to email type
function getEmailTypeForStatus(
  status: CollectionStatus
): "booking_confirmed" | "booking_approved" | "collection_scheduled" | "collection_rescheduled" | "collection_completed" | null {
  const mapping: Partial<Record<CollectionStatus, "booking_approved" | "collection_scheduled" | "collection_completed">> = {
    APPROVED: "booking_approved",
    SCHEDULED: "collection_scheduled",
    COMPLETED: "collection_completed",
  };
  return mapping[status] ?? null;
}

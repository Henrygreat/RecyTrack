import { prisma } from "@/lib/prisma";
import type { CollectionStatus, CollectionPriority, CollectionType } from "@prisma/client";

// Valid status transitions
// Draft → Requested → Approved → Scheduled → Assigned → In Transit → Collected → Received → Completed
// Cancellation allowed from most states, Exception can occur during collection
export const STATUS_TRANSITIONS: Record<CollectionStatus, CollectionStatus[]> = {
  DRAFT: ["REQUESTED", "CANCELLED"],
  REQUESTED: ["APPROVED", "CANCELLED"],
  APPROVED: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["COLLECTED", "EXCEPTION"],
  COLLECTED: ["RECEIVED", "EXCEPTION"],
  RECEIVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  EXCEPTION: ["SCHEDULED", "CANCELLED"], // Can reschedule or cancel after exception
};

export const STATUS_LABELS: Record<CollectionStatus, string> = {
  DRAFT: "Draft",
  REQUESTED: "Requested",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  ASSIGNED: "Assigned",
  IN_TRANSIT: "In Transit",
  COLLECTED: "Collected",
  RECEIVED: "Received",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXCEPTION: "Exception",
};

export const PRIORITY_LABELS: Record<CollectionPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const COLLECTION_TYPE_LABELS: Record<CollectionType, string> = {
  STANDARD: "Standard Equipment",
  SECURE_DATA: "Secure Data Destruction",
  HAZARDOUS: "Hazardous Materials",
  LARGE_ITEMS: "Large Items",
  MIXED: "Mixed Collection",
};

export const EQUIPMENT_CATEGORIES = [
  "Laptops",
  "Desktops",
  "Monitors",
  "Servers",
  "Network Equipment",
  "Printers",
  "Mobile Devices",
  "Tablets",
  "Storage Devices",
  "Cables & Accessories",
  "UPS/Batteries",
  "Other",
] as const;

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: CollectionStatus, to: CollectionStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get available next statuses for a collection
 */
export function getAvailableTransitions(status: CollectionStatus): CollectionStatus[] {
  return STATUS_TRANSITIONS[status] ?? [];
}

/**
 * Generate a unique collection reference
 */
export async function generateCollectionReference(organizationId: string): Promise<string> {
  const lastCollection = await prisma.collection.findFirst({
    where: { organizationId },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });

  if (!lastCollection?.reference) {
    return "COLL-0001";
  }

  const match = lastCollection.reference.match(/COLL-(\d+)/);
  if (!match) {
    return "COLL-0001";
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `COLL-${nextNum.toString().padStart(4, "0")}`;
}

/**
 * Record a status change with audit trail
 */
export async function recordStatusChange(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    collectionId: string;
    organizationId: string;
    fromStatus: CollectionStatus | null;
    toStatus: CollectionStatus;
    changedByUserId: string;
    changedByName?: string;
    reason?: string;
    notes?: string;
  }
) {
  await tx.collectionStatusChange.create({
    data: {
      collectionId: params.collectionId,
      organizationId: params.organizationId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      changedByUserId: params.changedByUserId,
      changedByName: params.changedByName,
      reason: params.reason,
      notes: params.notes,
    },
  });
}

/**
 * Get timestamp field to update based on new status
 */
export function getStatusTimestampField(status: CollectionStatus): string | null {
  const mapping: Partial<Record<CollectionStatus, string>> = {
    APPROVED: "approvedAt",
    ASSIGNED: "assignedAt",
    IN_TRANSIT: "dispatchedAt",
    COLLECTED: "collectedAt",
    RECEIVED: "receivedAt",
    COMPLETED: "completedAt",
    CANCELLED: "cancelledAt",
  };
  return mapping[status] ?? null;
}

/**
 * Check if status is a terminal state
 */
export function isTerminalStatus(status: CollectionStatus): boolean {
  return ["COMPLETED", "CANCELLED"].includes(status);
}

/**
 * Check if collection is in active workflow
 */
export function isActiveStatus(status: CollectionStatus): boolean {
  return ["REQUESTED", "APPROVED", "SCHEDULED", "ASSIGNED", "IN_TRANSIT", "COLLECTED"].includes(status);
}

/**
 * Check if status allows editing
 */
export function canEditCollection(status: CollectionStatus): boolean {
  return ["DRAFT", "REQUESTED"].includes(status);
}

/**
 * Calculate collection metrics for dashboard
 */
export async function getCollectionMetrics(organizationId: string) {
  const [statusCounts, todayCollections, thisWeekCompleted] = await Promise.all([
    prisma.collection.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { status: true },
    }),
    prisma.collection.count({
      where: {
        organizationId,
        scheduledDate: {
          gte: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"),
          lt: new Date(new Date().toISOString().slice(0, 10) + "T23:59:59.999Z"),
        },
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
    }),
    prisma.collection.count({
      where: {
        organizationId,
        status: "COMPLETED",
        completedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count.status])
  ) as Record<CollectionStatus, number>;

  return {
    total: statusCounts.reduce((sum, s) => sum + s._count.status, 0),
    draft: countByStatus.DRAFT ?? 0,
    requested: countByStatus.REQUESTED ?? 0,
    approved: countByStatus.APPROVED ?? 0,
    scheduled: countByStatus.SCHEDULED ?? 0,
    assigned: countByStatus.ASSIGNED ?? 0,
    inTransit: countByStatus.IN_TRANSIT ?? 0,
    collected: countByStatus.COLLECTED ?? 0,
    received: countByStatus.RECEIVED ?? 0,
    completed: countByStatus.COMPLETED ?? 0,
    cancelled: countByStatus.CANCELLED ?? 0,
    exception: countByStatus.EXCEPTION ?? 0,
    pending: (countByStatus.REQUESTED ?? 0) + (countByStatus.APPROVED ?? 0) + (countByStatus.SCHEDULED ?? 0),
    active: (countByStatus.ASSIGNED ?? 0) + (countByStatus.IN_TRANSIT ?? 0) + (countByStatus.COLLECTED ?? 0),
    todayScheduled: todayCollections,
    thisWeekCompleted,
  };
}

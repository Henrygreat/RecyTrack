import { prisma } from "@/lib/prisma";
import type {
  AssetStatus,
  AssetCategory,
  PhysicalCondition,
  FunctionalCondition,
  DataBearingStatus,
  DispositionOutcome,
} from "@prisma/client";

// ============================================
// STATUS TRANSITIONS
// ============================================

// Asset Status Workflow:
// EXPECTED → COLLECTED → RECEIVED → INSPECTION → DATA_ERASURE → PROCESSING → READY
// Then: → LISTED → SOLD / RECYCLED / DESTROYED / RETURNED / RELEASED
// QUARANTINED can be entered from multiple states and returned to appropriate next state
export const ASSET_STATUS_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  EXPECTED: ["COLLECTED"],
  COLLECTED: ["RECEIVED"],
  RECEIVED: ["INSPECTION", "QUARANTINED"],
  INSPECTION: ["DATA_ERASURE", "PROCESSING", "QUARANTINED"], // Skip data erasure if not data-bearing
  QUARANTINED: ["RECEIVED", "INSPECTION", "DATA_ERASURE", "PROCESSING", "DESTROYED"], // Return to workflow or destroy
  DATA_ERASURE: ["PROCESSING", "QUARANTINED"],
  PROCESSING: ["READY", "QUARANTINED"],
  READY: ["LISTED", "RECYCLED", "DESTROYED", "RETURNED", "RELEASED"],
  LISTED: ["SOLD", "RECYCLED", "RELEASED"],
  SOLD: [],
  RECYCLED: [],
  DESTROYED: [],
  RETURNED: [],
  RELEASED: [],
};

// ============================================
// LABELS
// ============================================

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  EXPECTED: "Expected",
  COLLECTED: "Collected",
  RECEIVED: "Received",
  INSPECTION: "Inspection",
  QUARANTINED: "Quarantined",
  DATA_ERASURE: "Data Erasure",
  PROCESSING: "Processing",
  READY: "Ready",
  LISTED: "Listed for Sale",
  SOLD: "Sold",
  RECYCLED: "Recycled",
  DESTROYED: "Destroyed",
  RETURNED: "Returned",
  RELEASED: "Released",
};

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  LAPTOP: "Laptop",
  DESKTOP: "Desktop",
  SERVER: "Server",
  MONITOR: "Monitor",
  MOBILE_PHONE: "Mobile Phone",
  TABLET: "Tablet",
  PRINTER: "Printer",
  NETWORKING: "Networking Equipment",
  STORAGE_DEVICE: "Storage Device",
  UPS_BATTERY: "UPS / Battery",
  PERIPHERAL: "Peripheral",
  CABLE_ACCESSORY: "Cables & Accessories",
  OTHER: "Other",
};

export const PHYSICAL_CONDITION_LABELS: Record<PhysicalCondition, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  DAMAGED: "Damaged",
  FOR_PARTS: "For Parts Only",
};

export const FUNCTIONAL_CONDITION_LABELS: Record<FunctionalCondition, string> = {
  WORKING: "Fully Working",
  PARTIAL: "Partially Working",
  NOT_WORKING: "Not Working",
  UNTESTED: "Untested",
};

export const DATA_BEARING_STATUS_LABELS: Record<DataBearingStatus, string> = {
  NOT_APPLICABLE: "Not Data-Bearing",
  NOT_ASSESSED: "Not Assessed",
  DATA_PRESENT: "Data Present",
  WIPED_STANDARD: "Wiped (Standard)",
  WIPED_CERTIFIED: "Wiped (Certified)",
  PHYSICALLY_DESTROYED: "Physically Destroyed",
};

export const DISPOSITION_OUTCOME_LABELS: Record<DispositionOutcome, string> = {
  PENDING: "Pending",
  RESALE: "Resale",
  DONATION: "Donation",
  RECYCLE: "Recycle",
  DESTROY: "Destroy",
  RETURN: "Return to Customer",
};

// ============================================
// DATA WIPE METHODS
// ============================================

export const DATA_WIPE_METHODS = [
  "NIST 800-88 Clear",
  "NIST 800-88 Purge",
  "DoD 5220.22-M (3-pass)",
  "DoD 5220.22-M (7-pass)",
  "Blancco Drive Eraser",
  "DBAN",
  "Secure Erase (ATA)",
  "Cryptographic Erase",
  "Physical Destruction",
  "Degaussing",
  "Other",
] as const;

// ============================================
// STORAGE TYPES
// ============================================

export const STORAGE_TYPES = [
  "HDD (SATA)",
  "HDD (SAS)",
  "SSD (SATA)",
  "SSD (NVMe)",
  "eMMC",
  "SD Card",
  "USB Flash",
  "Tape",
  "None",
  "Unknown",
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a status transition is valid
 */
export function isValidAssetTransition(from: AssetStatus, to: AssetStatus): boolean {
  return ASSET_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get available next statuses for an asset
 */
export function getAvailableAssetTransitions(status: AssetStatus): AssetStatus[] {
  return ASSET_STATUS_TRANSITIONS[status] ?? [];
}

/**
 * Check if asset is in a terminal state
 */
export function isTerminalAssetStatus(status: AssetStatus): boolean {
  return ["SOLD", "RECYCLED", "DESTROYED", "RETURNED", "RELEASED"].includes(status);
}

/**
 * Check if asset is in quarantine
 */
export function isQuarantined(status: AssetStatus): boolean {
  return status === "QUARANTINED";
}

/**
 * Check if asset requires data handling
 */
export function isDataBearing(category: AssetCategory): boolean {
  return ["LAPTOP", "DESKTOP", "SERVER", "MOBILE_PHONE", "TABLET", "STORAGE_DEVICE"].includes(category);
}

/**
 * Generate a unique asset tag
 */
export async function generateAssetTag(organizationId: string): Promise<string> {
  const lastAsset = await prisma.asset.findFirst({
    where: { organizationId },
    orderBy: { assetTag: "desc" },
    select: { assetTag: true },
  });

  if (!lastAsset?.assetTag) {
    return "RT-000001";
  }

  const match = lastAsset.assetTag.match(/RT-(\d+)/);
  if (!match) {
    return "RT-000001";
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `RT-${nextNum.toString().padStart(6, "0")}`;
}

/**
 * Record an asset status change with audit trail
 */
export async function recordAssetStatusChange(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    assetId: string;
    organizationId: string;
    fromStatus: AssetStatus | null;
    toStatus: AssetStatus;
    changedByUserId?: string;
    changedByName?: string;
    reason?: string;
    notes?: string;
  }
) {
  await tx.assetStatusChange.create({
    data: {
      assetId: params.assetId,
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
export function getAssetStatusTimestampField(status: AssetStatus): string | null {
  const mapping: Partial<Record<AssetStatus, string>> = {
    COLLECTED: "collectedAt",
    RECEIVED: "receivedAt",
    INSPECTION: "inspectedAt",
    PROCESSING: "processedAt",
    SOLD: "releasedAt",
    RECYCLED: "releasedAt",
    DESTROYED: "releasedAt",
    RETURNED: "releasedAt",
  };
  return mapping[status] ?? null;
}

/**
 * Calculate asset metrics for dashboard
 */
export async function getAssetMetrics(organizationId: string) {
  const [statusCounts, categoryDistribution, recentAssets] = await Promise.all([
    prisma.asset.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { status: true },
    }),
    prisma.asset.groupBy({
      by: ["category"],
      where: { organizationId },
      _count: { category: true },
    }),
    prisma.asset.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count.status])
  ) as Record<AssetStatus, number>;

  const countByCategory = Object.fromEntries(
    categoryDistribution.map((c) => [c.category, c._count.category])
  ) as Record<AssetCategory, number>;

  return {
    total: statusCounts.reduce((sum, s) => sum + s._count.status, 0),
    byStatus: countByStatus,
    byCategory: countByCategory,
    inbound: (countByStatus.EXPECTED ?? 0) + (countByStatus.COLLECTED ?? 0),
    inProcessing: (countByStatus.RECEIVED ?? 0) + (countByStatus.INSPECTION ?? 0) +
                  (countByStatus.DATA_ERASURE ?? 0) + (countByStatus.PROCESSING ?? 0),
    ready: countByStatus.READY ?? 0,
    listed: countByStatus.LISTED ?? 0,
    disposed: (countByStatus.SOLD ?? 0) + (countByStatus.RECYCLED ?? 0) +
              (countByStatus.DESTROYED ?? 0) + (countByStatus.RETURNED ?? 0),
    recentWeek: recentAssets,
  };
}

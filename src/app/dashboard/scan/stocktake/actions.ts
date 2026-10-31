"use server";

import { revalidatePath } from "next/cache";
import { requireMember, STAFF_ROLES, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// ============================================
// TYPES
// ============================================

// These types match the Prisma schema enums but are defined locally
// since prisma generate needs a database connection
type StocktakeStatus = "IN_PROGRESS" | "PAUSED" | "PENDING_REVIEW" | "COMPLETED" | "CANCELLED";
type StocktakeItemStatus = "EXPECTED" | "FOUND" | "MISSING" | "UNEXPECTED" | "DISCREPANCY";

interface StocktakeSession {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  status: StocktakeStatus;
  warehouseLocation: {
    id: string;
    code: string;
    name: string;
  } | null;
  includeAllLocations: boolean;
  startedAt: Date;
  startedByName: string | null;
  expectedCount: number;
  scannedCount: number;
  foundCount: number;
  missingCount: number;
  unexpectedCount: number;
}

interface StocktakeItem {
  id: string;
  assetId: string;
  asset: {
    assetTag: string;
    category: string;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
  };
  status: StocktakeItemStatus;
  expectedLocationCode: string | null;
  actualLocationCode: string | null;
  scannedAt: Date | null;
  scannedByName: string | null;
  scanCount: number;
  notes: string | null;
}

// ============================================
// CREATE STOCKTAKE SESSION
// ============================================

export async function createStocktakeSession(data: {
  name: string;
  description?: string;
  warehouseLocationId?: string;
  includeAllLocations?: boolean;
}): Promise<{ success: boolean; session?: StocktakeSession; error?: string }> {
  const { organizationId: orgId, userId, membership } = await requireMember(undefined, STAFF_ROLES);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const userName = user?.name || user?.email || "Unknown";

  try {
    // Generate reference
    const count = await prisma.stocktakeSession.count({
      where: { organizationId: orgId },
    });
    const reference = `ST-${String(count + 1).padStart(4, "0")}`;

    // Get expected assets based on location filter
    const whereClause: { organizationId: string; warehouseLocationId?: string } = {
      organizationId: orgId,
    };

    if (data.warehouseLocationId && !data.includeAllLocations) {
      whereClause.warehouseLocationId = data.warehouseLocationId;
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      select: {
        id: true,
        warehouseLocationId: true,
        warehouseLocation: {
          select: { code: true },
        },
      },
    });

    // Create session with expected items
    const stocktake = await prisma.stocktakeSession.create({
      data: {
        organizationId: orgId,
        reference,
        name: data.name,
        description: data.description,
        warehouseLocationId: data.warehouseLocationId || null,
        includeAllLocations: data.includeAllLocations || false,
        startedByUserId: userId,
        startedByName: userName,
        expectedCount: assets.length,
        items: {
          create: assets.map((asset) => ({
            assetId: asset.id,
            status: "EXPECTED" as StocktakeItemStatus,
            expectedLocationId: asset.warehouseLocationId,
            expectedLocationCode: asset.warehouseLocation?.code || null,
          })),
        },
      },
      include: {
        warehouseLocation: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    revalidatePath("/dashboard/scan/stocktake");

    return {
      success: true,
      session: {
        id: stocktake.id,
        reference: stocktake.reference,
        name: stocktake.name,
        description: stocktake.description,
        status: stocktake.status,
        warehouseLocation: stocktake.warehouseLocation,
        includeAllLocations: stocktake.includeAllLocations,
        startedAt: stocktake.startedAt,
        startedByName: stocktake.startedByName,
        expectedCount: stocktake.expectedCount,
        scannedCount: stocktake.scannedCount,
        foundCount: stocktake.foundCount,
        missingCount: stocktake.missingCount,
        unexpectedCount: stocktake.unexpectedCount,
      },
    };
  } catch (error) {
    console.error("Create stocktake error:", error);
    return { success: false, error: "Failed to create stocktake session" };
  }
}

// ============================================
// GET STOCKTAKE SESSIONS
// ============================================

export async function getStocktakeSessions(filters?: {
  status?: StocktakeStatus;
}): Promise<{ success: boolean; sessions?: StocktakeSession[]; error?: string }> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    const whereClause: { organizationId: string; status?: StocktakeStatus } = {
      organizationId,
    };

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    const stocktakes = await prisma.stocktakeSession.findMany({
      where: whereClause,
      include: {
        warehouseLocation: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    return {
      success: true,
      sessions: stocktakes.map((st) => ({
        id: st.id,
        reference: st.reference,
        name: st.name,
        description: st.description,
        status: st.status,
        warehouseLocation: st.warehouseLocation,
        includeAllLocations: st.includeAllLocations,
        startedAt: st.startedAt,
        startedByName: st.startedByName,
        expectedCount: st.expectedCount,
        scannedCount: st.scannedCount,
        foundCount: st.foundCount,
        missingCount: st.missingCount,
        unexpectedCount: st.unexpectedCount,
      })),
    };
  } catch (error) {
    console.error("Get stocktake sessions error:", error);
    return { success: false, error: "Failed to fetch stocktake sessions" };
  }
}

// ============================================
// GET STOCKTAKE SESSION DETAILS
// ============================================

export async function getStocktakeSession(
  sessionId: string
): Promise<{ success: boolean; session?: StocktakeSession; items?: StocktakeItem[]; error?: string }> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    const stocktake = await prisma.stocktakeSession.findFirst({
      where: {
        id: sessionId,
        organizationId,
      },
      include: {
        warehouseLocation: {
          select: { id: true, code: true, name: true },
        },
        items: {
          include: {
            asset: {
              select: {
                assetTag: true,
                category: true,
                manufacturer: true,
                model: true,
                serialNumber: true,
              },
            },
          },
          orderBy: [{ status: "asc" }, { scannedAt: "desc" }],
        },
      },
    });

    if (!stocktake) {
      return { success: false, error: "Stocktake session not found" };
    }

    return {
      success: true,
      session: {
        id: stocktake.id,
        reference: stocktake.reference,
        name: stocktake.name,
        description: stocktake.description,
        status: stocktake.status,
        warehouseLocation: stocktake.warehouseLocation,
        includeAllLocations: stocktake.includeAllLocations,
        startedAt: stocktake.startedAt,
        startedByName: stocktake.startedByName,
        expectedCount: stocktake.expectedCount,
        scannedCount: stocktake.scannedCount,
        foundCount: stocktake.foundCount,
        missingCount: stocktake.missingCount,
        unexpectedCount: stocktake.unexpectedCount,
      },
      items: stocktake.items.map((item) => ({
        id: item.id,
        assetId: item.assetId,
        asset: item.asset,
        status: item.status,
        expectedLocationCode: item.expectedLocationCode,
        actualLocationCode: item.actualLocationCode,
        scannedAt: item.scannedAt,
        scannedByName: item.scannedByName,
        scanCount: item.scanCount,
        notes: item.notes,
      })),
    };
  } catch (error) {
    console.error("Get stocktake session error:", error);
    return { success: false, error: "Failed to fetch stocktake session" };
  }
}

// ============================================
// SCAN ASSET IN STOCKTAKE
// ============================================

export async function scanStocktakeAsset(
  sessionId: string,
  assetTag: string,
  locationId?: string
): Promise<{ success: boolean; item?: StocktakeItem; isNew?: boolean; error?: string }> {
  const { organizationId: orgId, userId } = await requireMember(undefined, STAFF_ROLES);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const userName = user?.name || user?.email || "Unknown";

  try {
    // Get the stocktake session
    const stocktake = await prisma.stocktakeSession.findFirst({
      where: {
        id: sessionId,
        organizationId: orgId,
        status: "IN_PROGRESS",
      },
    });

    if (!stocktake) {
      return { success: false, error: "Stocktake session not found or not in progress" };
    }

    // Find the asset
    const asset = await prisma.asset.findFirst({
      where: {
        organizationId: orgId,
        assetTag: assetTag.toUpperCase(),
      },
      select: {
        id: true,
        assetTag: true,
        category: true,
        manufacturer: true,
        model: true,
        serialNumber: true,
        warehouseLocationId: true,
        warehouseLocation: {
          select: { code: true },
        },
      },
    });

    if (!asset) {
      return { success: false, error: "Asset not found" };
    }

    // Get location code if provided
    let locationCode: string | null = null;
    if (locationId) {
      const location = await prisma.warehouseLocation.findFirst({
        where: { id: locationId, organizationId: orgId },
        select: { code: true },
      });
      locationCode = location?.code || null;
    }

    // Check if item exists in stocktake
    const existingItem = await prisma.stocktakeItem.findUnique({
      where: {
        stocktakeId_assetId: {
          stocktakeId: sessionId,
          assetId: asset.id,
        },
      },
    });

    let item;
    let isNew = false;

    if (existingItem) {
      // Update existing item
      const isDuplicate = existingItem.status === "FOUND";
      const hasLocationDiscrepancy =
        locationId && existingItem.expectedLocationId && locationId !== existingItem.expectedLocationId;

      item = await prisma.stocktakeItem.update({
        where: { id: existingItem.id },
        data: {
          status: hasLocationDiscrepancy ? "DISCREPANCY" : "FOUND",
          actualLocationId: locationId,
          actualLocationCode: locationCode,
          scannedAt: new Date(),
          scannedByUserId: userId,
          scannedByName: userName,
          scanCount: { increment: 1 },
          lastScanAt: new Date(),
          isDuplicate,
          discrepancyType: hasLocationDiscrepancy ? "LOCATION_MISMATCH" : null,
        },
        include: {
          asset: {
            select: {
              assetTag: true,
              category: true,
              manufacturer: true,
              model: true,
              serialNumber: true,
            },
          },
        },
      });
    } else {
      // Asset wasn't expected - create as unexpected
      isNew = true;
      item = await prisma.stocktakeItem.create({
        data: {
          stocktakeId: sessionId,
          assetId: asset.id,
          status: "UNEXPECTED",
          expectedLocationId: asset.warehouseLocationId,
          expectedLocationCode: asset.warehouseLocation?.code,
          actualLocationId: locationId,
          actualLocationCode: locationCode,
          scannedAt: new Date(),
          scannedByUserId: userId,
          scannedByName: userName,
          scanCount: 1,
          lastScanAt: new Date(),
        },
        include: {
          asset: {
            select: {
              assetTag: true,
              category: true,
              manufacturer: true,
              model: true,
              serialNumber: true,
            },
          },
        },
      });
    }

    // Update session counts
    await updateStocktakeCounts(sessionId);

    revalidatePath(`/dashboard/scan/stocktake/${sessionId}`);

    return {
      success: true,
      isNew,
      item: {
        id: item.id,
        assetId: item.assetId,
        asset: item.asset,
        status: item.status,
        expectedLocationCode: item.expectedLocationCode,
        actualLocationCode: item.actualLocationCode,
        scannedAt: item.scannedAt,
        scannedByName: item.scannedByName,
        scanCount: item.scanCount,
        notes: item.notes,
      },
    };
  } catch (error) {
    console.error("Scan stocktake asset error:", error);
    return { success: false, error: "Failed to scan asset" };
  }
}

// ============================================
// UPDATE SESSION STATUS
// ============================================

export async function updateStocktakeStatus(
  sessionId: string,
  status: StocktakeStatus,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const userName = user?.name || user?.email || "Unknown";

  try {
    const stocktake = await prisma.stocktakeSession.findFirst({
      where: {
        id: sessionId,
        organizationId,
      },
    });

    if (!stocktake) {
      return { success: false, error: "Stocktake session not found" };
    }

    const updateData: {
      status: StocktakeStatus;
      pausedAt?: Date;
      resumedAt?: Date;
      completedAt?: Date;
      completedByUserId?: string;
      completedByName?: string;
      cancelledAt?: Date;
      reconciliationNotes?: string;
    } = { status };

    const now = new Date();

    switch (status) {
      case "PAUSED":
        updateData.pausedAt = now;
        break;
      case "IN_PROGRESS":
        if (stocktake.status === "PAUSED") {
          updateData.resumedAt = now;
        }
        break;
      case "PENDING_REVIEW":
        // Mark all remaining expected items as missing
        await prisma.stocktakeItem.updateMany({
          where: {
            stocktakeId: sessionId,
            status: "EXPECTED",
          },
          data: {
            status: "MISSING",
          },
        });
        await updateStocktakeCounts(sessionId);
        break;
      case "COMPLETED":
        updateData.completedAt = now;
        updateData.completedByUserId = userId;
        updateData.completedByName = userName;
        if (notes) {
          updateData.reconciliationNotes = notes;
        }
        break;
      case "CANCELLED":
        updateData.cancelledAt = now;
        break;
    }

    await prisma.stocktakeSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    revalidatePath("/dashboard/scan/stocktake");
    revalidatePath(`/dashboard/scan/stocktake/${sessionId}`);

    return { success: true };
  } catch (error) {
    console.error("Update stocktake status error:", error);
    return { success: false, error: "Failed to update stocktake status" };
  }
}

// ============================================
// HELPER: UPDATE COUNTS
// ============================================

async function updateStocktakeCounts(sessionId: string): Promise<void> {
  const counts = await prisma.stocktakeItem.groupBy({
    by: ["status"],
    where: { stocktakeId: sessionId },
    _count: true,
  });

  const scannedCount = counts
    .filter((c) => c.status !== "EXPECTED")
    .reduce((sum, c) => sum + c._count, 0);
  const foundCount = counts.find((c) => c.status === "FOUND")?._count || 0;
  const missingCount = counts.find((c) => c.status === "MISSING")?._count || 0;
  const unexpectedCount = counts.find((c) => c.status === "UNEXPECTED")?._count || 0;

  await prisma.stocktakeSession.update({
    where: { id: sessionId },
    data: {
      scannedCount,
      foundCount,
      missingCount,
      unexpectedCount,
    },
  });
}

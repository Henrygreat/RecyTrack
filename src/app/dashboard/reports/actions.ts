"use server";

import { requireMember, STAFF_ROLES, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// ============================================
// TYPES
// ============================================

export interface DashboardMetrics {
  totalAssets: number;
  assetsReceivedToday: number;
  assetsReceivedWeek: number;
  assetsReceivedMonth: number;
  assetsAwaitingInspection: number;
  assetsInspected: number;
  assetsInQuarantine: number;
  assetsReadyForRelease: number;
  activeCollections: number;
  completedCollectionsMonth: number;
  totalCustomers: number;
  activeCustomers: number;
  totalWeight: number;
  warehouseOccupancy: number;
  totalLocations: number;
  usedLocations: number;
}

export interface AssetTrend {
  date: string;
  received: number;
  processed: number;
  released: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface WarehouseOccupancy {
  locationId: string;
  locationCode: string;
  locationName: string;
  capacity: number | null;
  assetCount: number;
  occupancyRate: number | null;
}

export interface StocktakeSummary {
  sessionId: string;
  reference: string;
  name: string;
  status: string;
  expectedCount: number;
  foundCount: number;
  missingCount: number;
  unexpectedCount: number;
  accuracy: number;
  completedAt: Date | null;
}

export interface ScanAnalytics {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  successRate: number;
  scansByType: { type: string; count: number }[];
  scansByOperator: { operatorName: string; count: number }[];
  scansByDate: { date: string; count: number }[];
}

export interface CustodyReport {
  totalHandovers: number;
  totalExceptions: number;
  averageHandoverTime: number | null;
  exceptionsByType: { type: string; count: number }[];
  recentHandovers: {
    assetTag: string;
    fromName: string | null;
    toName: string | null;
    eventType: string;
    timestamp: Date;
  }[];
}

export interface CustomerReport {
  customerId: string;
  customerName: string;
  totalCollections: number;
  totalAssets: number;
  assetsByStatus: { status: string; count: number }[];
  recentCollections: {
    id: string;
    reference: string;
    status: string;
    scheduledDate: Date | null;
    totalItems: number;
  }[];
}

export interface EnvironmentalMetrics {
  totalWeightKg: number;
  reuseWeightKg: number;
  recycleWeightKg: number;
  reuseRate: number;
  recycleRate: number;
  assetsByDisposition: { disposition: string; count: number; weight: number }[];
  monthlyTrends: { month: string; reuse: number; recycle: number }[];
}

// ============================================
// EXECUTIVE DASHBOARD METRICS
// ============================================

export async function getDashboardMetrics(): Promise<{
  success: boolean;
  metrics?: DashboardMetrics;
  error?: string;
}> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all queries in parallel for efficiency
    const [
      totalAssets,
      assetsReceivedToday,
      assetsReceivedWeek,
      assetsReceivedMonth,
      assetsByStatus,
      activeCollections,
      completedCollectionsMonth,
      totalCustomers,
      activeCustomers,
      weightSum,
      locationStats,
    ] = await Promise.all([
      // Total assets
      prisma.asset.count({
        where: { organizationId },
      }),
      // Assets received today
      prisma.asset.count({
        where: {
          organizationId,
          receivedAt: { gte: todayStart },
        },
      }),
      // Assets received this week
      prisma.asset.count({
        where: {
          organizationId,
          receivedAt: { gte: weekStart },
        },
      }),
      // Assets received this month
      prisma.asset.count({
        where: {
          organizationId,
          receivedAt: { gte: monthStart },
        },
      }),
      // Assets by status
      prisma.asset.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: true,
      }),
      // Active collections
      prisma.collection.count({
        where: {
          organizationId,
          status: { in: ["SCHEDULED", "ASSIGNED", "IN_TRANSIT", "COLLECTED"] },
        },
      }),
      // Completed collections this month
      prisma.collection.count({
        where: {
          organizationId,
          status: "COMPLETED",
          completedAt: { gte: monthStart },
        },
      }),
      // Total customers
      prisma.customer.count({
        where: { organizationId },
      }),
      // Active customers (with collections in last 90 days)
      prisma.customer.count({
        where: {
          organizationId,
          collections: {
            some: {
              createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      }),
      // Total weight
      prisma.asset.aggregate({
        where: { organizationId },
        _sum: { weight: true },
      }),
      // Location stats
      prisma.warehouseLocation.findMany({
        where: { organizationId, isActive: true },
        select: {
          id: true,
          _count: { select: { assets: true } },
        },
      }),
    ]);

    // Process status counts
    const statusCounts = assetsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate warehouse occupancy
    const totalLocations = locationStats.length;
    const usedLocations = locationStats.filter((l) => l._count.assets > 0).length;

    return {
      success: true,
      metrics: {
        totalAssets,
        assetsReceivedToday,
        assetsReceivedWeek,
        assetsReceivedMonth,
        assetsAwaitingInspection: statusCounts["RECEIVED"] || 0,
        assetsInspected: statusCounts["INSPECTION"] || 0,
        assetsInQuarantine: statusCounts["QUARANTINED"] || 0,
        assetsReadyForRelease: statusCounts["READY"] || 0,
        activeCollections,
        completedCollectionsMonth,
        totalCustomers,
        activeCustomers,
        totalWeight: weightSum._sum.weight ? Number(weightSum._sum.weight) : 0,
        warehouseOccupancy: totalLocations > 0 ? (usedLocations / totalLocations) * 100 : 0,
        totalLocations,
        usedLocations,
      },
    };
  } catch (error) {
    console.error("Get dashboard metrics error:", error);
    return { success: false, error: "Failed to fetch dashboard metrics" };
  }
}

// ============================================
// ASSET PROCESSING ANALYTICS
// ============================================

export async function getAssetTrends(
  days: number = 30
): Promise<{ success: boolean; trends?: AssetTrend[]; error?: string }> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get daily asset counts
    const assets = await prisma.asset.findMany({
      where: {
        organizationId,
        receivedAt: { gte: startDate },
      },
      select: {
        receivedAt: true,
        status: true,
        releasedAt: true,
      },
    });

    // Group by date
    const trendMap = new Map<string, { received: number; processed: number; released: number }>();

    // Initialize all dates
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      trendMap.set(dateStr, { received: 0, processed: 0, released: 0 });
    }

    // Count assets
    for (const asset of assets) {
      if (asset.receivedAt) {
        const dateStr = asset.receivedAt.toISOString().split("T")[0];
        const entry = trendMap.get(dateStr);
        if (entry) {
          entry.received++;
          if (asset.status !== "RECEIVED") {
            entry.processed++;
          }
        }
      }
      if (asset.releasedAt) {
        const dateStr = asset.releasedAt.toISOString().split("T")[0];
        const entry = trendMap.get(dateStr);
        if (entry) {
          entry.released++;
        }
      }
    }

    const trends: AssetTrend[] = Array.from(trendMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return { success: true, trends };
  } catch (error) {
    console.error("Get asset trends error:", error);
    return { success: false, error: "Failed to fetch asset trends" };
  }
}

export async function getCategoryDistribution(): Promise<{
  success: boolean;
  distribution?: CategoryDistribution[];
  error?: string;
}> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    const categories = await prisma.asset.groupBy({
      by: ["category"],
      where: { organizationId },
      _count: true,
    });

    const total = categories.reduce((sum, c) => sum + c._count, 0);

    const distribution = categories.map((c) => ({
      category: c.category,
      count: c._count,
      percentage: total > 0 ? (c._count / total) * 100 : 0,
    }));

    // Sort by count descending
    distribution.sort((a, b) => b.count - a.count);

    return { success: true, distribution };
  } catch (error) {
    console.error("Get category distribution error:", error);
    return { success: false, error: "Failed to fetch category distribution" };
  }
}

export async function getStatusDistribution(): Promise<{
  success: boolean;
  distribution?: StatusDistribution[];
  error?: string;
}> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    const statuses = await prisma.asset.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: true,
    });

    const total = statuses.reduce((sum, s) => sum + s._count, 0);

    const distribution = statuses.map((s) => ({
      status: s.status,
      count: s._count,
      percentage: total > 0 ? (s._count / total) * 100 : 0,
    }));

    return { success: true, distribution };
  } catch (error) {
    console.error("Get status distribution error:", error);
    return { success: false, error: "Failed to fetch status distribution" };
  }
}

// ============================================
// WAREHOUSE INTELLIGENCE
// ============================================

export async function getWarehouseOccupancy(): Promise<{
  success: boolean;
  locations?: WarehouseOccupancy[];
  error?: string;
}> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    const locations = await prisma.warehouseLocation.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        capacity: true,
        _count: { select: { assets: true } },
      },
      orderBy: { code: "asc" },
    });

    const occupancy = locations.map((loc) => ({
      locationId: loc.id,
      locationCode: loc.code,
      locationName: loc.name,
      capacity: loc.capacity,
      assetCount: loc._count.assets,
      occupancyRate: loc.capacity ? (loc._count.assets / loc.capacity) * 100 : null,
    }));

    return { success: true, locations: occupancy };
  } catch (error) {
    console.error("Get warehouse occupancy error:", error);
    return { success: false, error: "Failed to fetch warehouse occupancy" };
  }
}

export async function getStocktakeSummaries(): Promise<{
  success: boolean;
  summaries?: StocktakeSummary[];
  error?: string;
}> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    const sessions = await prisma.stocktakeSession.findMany({
      where: { organizationId },
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    const summaries = sessions.map((s) => ({
      sessionId: s.id,
      reference: s.reference,
      name: s.name,
      status: s.status,
      expectedCount: s.expectedCount,
      foundCount: s.foundCount,
      missingCount: s.missingCount,
      unexpectedCount: s.unexpectedCount,
      accuracy: s.expectedCount > 0 ? (s.foundCount / s.expectedCount) * 100 : 0,
      completedAt: s.completedAt,
    }));

    return { success: true, summaries };
  } catch (error) {
    console.error("Get stocktake summaries error:", error);
    return { success: false, error: "Failed to fetch stocktake summaries" };
  }
}

// ============================================
// SCAN MODE ANALYTICS
// ============================================

export async function getScanAnalytics(
  days: number = 30
): Promise<{ success: boolean; analytics?: ScanAnalytics; error?: string }> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalScans, successfulScans, scansByType, scansByOperator, scansRaw] = await Promise.all([
      prisma.scanEvent.count({
        where: { organizationId, scannedAt: { gte: startDate } },
      }),
      prisma.scanEvent.count({
        where: { organizationId, scannedAt: { gte: startDate }, outcome: "SUCCESS" },
      }),
      prisma.scanEvent.groupBy({
        by: ["eventType"],
        where: { organizationId, scannedAt: { gte: startDate } },
        _count: true,
      }),
      prisma.scanEvent.groupBy({
        by: ["operatorName"],
        where: {
          organizationId,
          scannedAt: { gte: startDate },
          operatorName: { not: null },
        },
        _count: true,
        orderBy: { _count: { operatorName: "desc" } },
        take: 10,
      }),
      prisma.scanEvent.findMany({
        where: { organizationId, scannedAt: { gte: startDate } },
        select: { scannedAt: true },
      }),
    ]);

    // Group scans by date
    const dateMap = new Map<string, number>();
    for (const scan of scansRaw) {
      const dateStr = scan.scannedAt.toISOString().split("T")[0];
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
    }

    const scansByDate = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      analytics: {
        totalScans,
        successfulScans,
        failedScans: totalScans - successfulScans,
        successRate: totalScans > 0 ? (successfulScans / totalScans) * 100 : 0,
        scansByType: scansByType.map((s) => ({ type: s.eventType, count: s._count })),
        scansByOperator: scansByOperator.map((s) => ({
          operatorName: s.operatorName || "Unknown",
          count: s._count,
        })),
        scansByDate,
      },
    };
  } catch (error) {
    console.error("Get scan analytics error:", error);
    return { success: false, error: "Failed to fetch scan analytics" };
  }
}

// ============================================
// CHAIN OF CUSTODY REPORTS
// ============================================

export async function getCustodyReport(
  days: number = 30
): Promise<{ success: boolean; report?: CustodyReport; error?: string }> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalHandovers, exceptions, recentHandovers] = await Promise.all([
      prisma.custodyEvent.count({
        where: { organizationId, eventDate: { gte: startDate } },
      }),
      prisma.custodyException.findMany({
        where: { organizationId, createdAt: { gte: startDate } },
        select: { exceptionType: true },
      }),
      prisma.custodyEvent.findMany({
        where: { organizationId, eventDate: { gte: startDate } },
        include: {
          asset: { select: { assetTag: true } },
        },
        orderBy: { eventDate: "desc" },
        take: 20,
      }),
    ]);

    // Group exceptions by type
    const exceptionCounts = new Map<string, number>();
    for (const ex of exceptions) {
      exceptionCounts.set(ex.exceptionType, (exceptionCounts.get(ex.exceptionType) || 0) + 1);
    }

    return {
      success: true,
      report: {
        totalHandovers,
        totalExceptions: exceptions.length,
        averageHandoverTime: null, // Would need timestamps to calculate
        exceptionsByType: Array.from(exceptionCounts.entries()).map(([type, count]) => ({
          type,
          count,
        })),
        recentHandovers: recentHandovers.map((h) => ({
          assetTag: h.asset.assetTag,
          fromName: h.fromCustodianName,
          toName: h.toCustodianName,
          eventType: h.eventType,
          timestamp: h.eventDate,
        })),
      },
    };
  } catch (error) {
    console.error("Get custody report error:", error);
    return { success: false, error: "Failed to fetch custody report" };
  }
}

// ============================================
// CUSTOMER REPORTS
// ============================================

export async function getCustomerReport(
  customerId: string
): Promise<{ success: boolean; report?: CustomerReport; error?: string }> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId },
      select: {
        id: true,
        name: true,
        collections: {
          select: {
            id: true,
            reference: true,
            status: true,
            scheduledDate: true,
            _count: { select: { assets: true } },
          },
          orderBy: { scheduledDate: "desc" },
          take: 10,
        },
        _count: { select: { collections: true } },
      },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    // Get asset counts by status for this customer
    const assetsByStatus = await prisma.asset.groupBy({
      by: ["status"],
      where: {
        organizationId,
        collection: { customerId },
      },
      _count: true,
    });

    const totalAssets = assetsByStatus.reduce((sum, s) => sum + s._count, 0);

    return {
      success: true,
      report: {
        customerId: customer.id,
        customerName: customer.name,
        totalCollections: customer._count.collections,
        totalAssets,
        assetsByStatus: assetsByStatus.map((s) => ({
          status: s.status,
          count: s._count,
        })),
        recentCollections: customer.collections.map((c) => ({
          id: c.id,
          reference: c.reference,
          status: c.status,
          scheduledDate: c.scheduledDate,
          totalItems: c._count.assets,
        })),
      },
    };
  } catch (error) {
    console.error("Get customer report error:", error);
    return { success: false, error: "Failed to fetch customer report" };
  }
}

export async function getCustomersSummary(): Promise<{
  success: boolean;
  customers?: { id: string; name: string; collections: number; assets: number }[];
  error?: string;
}> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    const customers = await prisma.customer.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        _count: { select: { collections: true } },
      },
      orderBy: { name: "asc" },
    });

    // Get asset counts per customer
    const assetCounts = await prisma.asset.groupBy({
      by: ["collectionId"],
      where: { organizationId },
      _count: true,
    });

    // Get collection to customer mapping
    const collections = await prisma.collection.findMany({
      where: { organizationId },
      select: { id: true, customerId: true },
    });

    const collectionToCustomer = new Map(collections.map((c) => [c.id, c.customerId]));

    // Sum assets per customer
    const customerAssets = new Map<string, number>();
    for (const ac of assetCounts) {
      if (ac.collectionId) {
        const customerId = collectionToCustomer.get(ac.collectionId);
        if (customerId) {
          customerAssets.set(customerId, (customerAssets.get(customerId) || 0) + ac._count);
        }
      }
    }

    return {
      success: true,
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        collections: c._count.collections,
        assets: customerAssets.get(c.id) || 0,
      })),
    };
  } catch (error) {
    console.error("Get customers summary error:", error);
    return { success: false, error: "Failed to fetch customers summary" };
  }
}

// ============================================
// ENVIRONMENTAL REPORTS
// ============================================

export async function getEnvironmentalMetrics(): Promise<{
  success: boolean;
  metrics?: EnvironmentalMetrics;
  error?: string;
}> {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);

  try {
    // Get all released assets with weight and disposition
    const assets = await prisma.asset.findMany({
      where: {
        organizationId,
        status: "RELEASED",
        releasedAt: { not: null },
      },
      select: {
        weight: true,
        dispositionOutcome: true,
        releasedAt: true,
      },
    });

    const totalWeightKg = assets.reduce((sum, a) => sum + (a.weight ? Number(a.weight) : 0), 0);

    // Group by disposition
    const dispositionMap = new Map<string, { count: number; weight: number }>();
    for (const asset of assets) {
      const disposition = asset.dispositionOutcome || "PENDING";
      const entry = dispositionMap.get(disposition) || { count: 0, weight: 0 };
      entry.count++;
      entry.weight += asset.weight ? Number(asset.weight) : 0;
      dispositionMap.set(disposition, entry);
    }

    // Calculate reuse vs recycle (RESALE/DONATION = reuse, RECYCLE/DESTROY = recycle)
    const reuseWeight =
      (dispositionMap.get("RESALE")?.weight || 0) + (dispositionMap.get("DONATION")?.weight || 0);
    const recycleWeight =
      (dispositionMap.get("RECYCLE")?.weight || 0) + (dispositionMap.get("DESTROY")?.weight || 0);

    // Monthly trends (last 6 months)
    const monthlyTrends: { month: string; reuse: number; recycle: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthStr = monthStart.toISOString().slice(0, 7); // YYYY-MM

      const monthAssets = assets.filter((a) => {
        if (!a.releasedAt) return false;
        return a.releasedAt >= monthStart && a.releasedAt <= monthEnd;
      });

      const reuse = monthAssets
        .filter((a) => a.dispositionOutcome === "RESALE" || a.dispositionOutcome === "DONATION")
        .reduce((sum, a) => sum + (a.weight ? Number(a.weight) : 0), 0);
      const recycle = monthAssets
        .filter((a) => a.dispositionOutcome === "RECYCLE" || a.dispositionOutcome === "DESTROY")
        .reduce((sum, a) => sum + (a.weight ? Number(a.weight) : 0), 0);

      monthlyTrends.push({ month: monthStr, reuse, recycle });
    }

    return {
      success: true,
      metrics: {
        totalWeightKg,
        reuseWeightKg: reuseWeight,
        recycleWeightKg: recycleWeight,
        reuseRate: totalWeightKg > 0 ? (reuseWeight / totalWeightKg) * 100 : 0,
        recycleRate: totalWeightKg > 0 ? (recycleWeight / totalWeightKg) * 100 : 0,
        assetsByDisposition: Array.from(dispositionMap.entries()).map(([disposition, data]) => ({
          disposition,
          ...data,
        })),
        monthlyTrends,
      },
    };
  } catch (error) {
    console.error("Get environmental metrics error:", error);
    return { success: false, error: "Failed to fetch environmental metrics" };
  }
}

// ============================================
// EXPORT UTILITIES
// ============================================

export async function exportReportData(
  reportType: "assets" | "collections" | "custody" | "stocktake" | "environmental",
  format: "csv" | "json"
): Promise<{ success: boolean; data?: string; filename?: string; error?: string }> {
  const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

  try {
    let data: unknown[] = [];
    let filename = "";

    switch (reportType) {
      case "assets":
        data = await prisma.asset.findMany({
          where: { organizationId },
          select: {
            assetTag: true,
            category: true,
            manufacturer: true,
            model: true,
            serialNumber: true,
            status: true,
            physicalCondition: true,
            weight: true,
            receivedAt: true,
            releasedAt: true,
            dispositionOutcome: true,
            warehouseLocation: { select: { code: true } },
          },
        });
        filename = `assets-export-${new Date().toISOString().split("T")[0]}`;
        break;

      case "collections":
        data = await prisma.collection.findMany({
          where: { organizationId },
          select: {
            reference: true,
            status: true,
            scheduledDate: true,
            completedAt: true,
            customer: { select: { name: true } },
            site: { select: { name: true } },
            _count: { select: { assets: true } },
          },
        });
        filename = `collections-export-${new Date().toISOString().split("T")[0]}`;
        break;

      case "custody":
        data = await prisma.custodyEvent.findMany({
          where: { organizationId },
          select: {
            eventType: true,
            fromCustodianName: true,
            toCustodianName: true,
            eventDate: true,
            notes: true,
            asset: { select: { assetTag: true } },
          },
          orderBy: { eventDate: "desc" },
        });
        filename = `custody-export-${new Date().toISOString().split("T")[0]}`;
        break;

      case "stocktake":
        data = await prisma.stocktakeSession.findMany({
          where: { organizationId },
          select: {
            reference: true,
            name: true,
            status: true,
            expectedCount: true,
            foundCount: true,
            missingCount: true,
            unexpectedCount: true,
            startedAt: true,
            completedAt: true,
          },
          orderBy: { startedAt: "desc" },
        });
        filename = `stocktake-export-${new Date().toISOString().split("T")[0]}`;
        break;

      case "environmental":
        data = await prisma.asset.findMany({
          where: { organizationId, status: "RELEASED" },
          select: {
            assetTag: true,
            category: true,
            weight: true,
            dispositionOutcome: true,
            releasedAt: true,
          },
        });
        filename = `environmental-export-${new Date().toISOString().split("T")[0]}`;
        break;
    }

    if (format === "json") {
      return {
        success: true,
        data: JSON.stringify(data, null, 2),
        filename: `${filename}.json`,
      };
    }

    // CSV format
    if (data.length === 0) {
      return { success: true, data: "", filename: `${filename}.csv` };
    }

    const flattenObject = (obj: Record<string, unknown>, prefix = ""): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}_${key}` : key;
        if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
          Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
        } else if (value instanceof Date) {
          result[newKey] = value.toISOString();
        } else if (value !== null && value !== undefined) {
          // Escape CSV values to prevent injection
          let stringValue = String(value);
          // Remove any formula-triggering characters at start
          if (/^[=+\-@\t\r]/.test(stringValue)) {
            stringValue = "'" + stringValue;
          }
          // Escape quotes and wrap in quotes if contains special chars
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
          }
          result[newKey] = stringValue;
        } else {
          result[newKey] = "";
        }
      }
      return result;
    };

    const flatData = data.map((row) => flattenObject(row as Record<string, unknown>));
    const headers = [...new Set(flatData.flatMap((row) => Object.keys(row)))];

    const csvLines = [
      headers.join(","),
      ...flatData.map((row) => headers.map((h) => row[h] || "").join(",")),
    ];

    return {
      success: true,
      data: csvLines.join("\n"),
      filename: `${filename}.csv`,
    };
  } catch (error) {
    console.error("Export report data error:", error);
    return { success: false, error: "Failed to export report data" };
  }
}

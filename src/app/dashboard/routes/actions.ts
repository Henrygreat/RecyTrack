"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { z } from "zod";

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createZoneSchema = z.object({
  name: z.string().min(2, "Zone name must be at least 2 characters").max(100),
  postcodePrefixes: z.string().optional(),
});

const createRouteDateSchema = z.object({
  zoneId: z.string().min(1, "Zone is required"),
  serviceDate: z.string().min(1, "Service date is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").max(100),
  isOpen: z.coerce.boolean().default(true),
  notes: z.string().max(500).optional(),
});

const updateRouteDateSchema = z.object({
  capacity: z.coerce.number().min(1).max(100).optional(),
  isOpen: z.coerce.boolean().optional(),
  notes: z.string().max(500).optional(),
});

// ============================================
// TYPE DEFINITIONS
// ============================================

export type ZoneFormState = {
  error?: string;
  success?: boolean;
  zoneId?: string;
};

export type RouteDateFormState = {
  error?: string;
  success?: boolean;
  routeDateId?: string;
};

// ============================================
// ZONE MANAGEMENT
// ============================================

export async function getZones() {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const zones = await prisma.collectionZone.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { routeDates: true, sites: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return { success: true, zones };
  } catch (error) {
    console.error("Get zones error:", error);
    return { success: false, error: "Failed to fetch zones" };
  }
}

export async function createZone(
  _prevState: ZoneFormState,
  formData: FormData
): Promise<ZoneFormState> {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = createZoneSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { name, postcodePrefixes } = parsed.data;

    // Check for duplicate zone name
    const existing = await prisma.collectionZone.findFirst({
      where: { organizationId, name: { equals: name, mode: "insensitive" } },
    });

    if (existing) {
      return { error: "A zone with this name already exists" };
    }

    // Parse postcode prefixes
    const prefixes = postcodePrefixes
      ? postcodePrefixes
          .split(",")
          .map((p) => p.trim().toUpperCase())
          .filter(Boolean)
      : [];

    const zone = await prisma.collectionZone.create({
      data: {
        organizationId,
        name,
        postcodePrefixes: prefixes,
      },
    });

    revalidatePath("/dashboard/routes");

    return { success: true, zoneId: zone.id };
  } catch (error) {
    console.error("Create zone error:", error);
    return { error: "Failed to create zone" };
  }
}

export async function updateZone(
  id: string,
  data: { name?: string; postcodePrefixes?: string[] }
) {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const existing = await prisma.collectionZone.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { success: false, error: "Zone not found" };
    }

    const zone = await prisma.collectionZone.update({
      where: { id },
      data,
    });

    revalidatePath("/dashboard/routes");

    return { success: true, zone };
  } catch (error) {
    console.error("Update zone error:", error);
    return { success: false, error: "Failed to update zone" };
  }
}

export async function deleteZone(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const existing = await prisma.collectionZone.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { routeDates: true, sites: true } } },
    });

    if (!existing) {
      return { success: false, error: "Zone not found" };
    }

    if (existing._count.routeDates > 0) {
      return { success: false, error: "Cannot delete zone with scheduled routes" };
    }

    if (existing._count.sites > 0) {
      return { success: false, error: "Cannot delete zone with linked sites" };
    }

    await prisma.collectionZone.delete({ where: { id } });

    revalidatePath("/dashboard/routes");

    return { success: true };
  } catch (error) {
    console.error("Delete zone error:", error);
    return { success: false, error: "Failed to delete zone" };
  }
}

// ============================================
// ROUTE DATE MANAGEMENT
// ============================================

export async function getRouteDates(filters?: {
  zoneId?: string;
  fromDate?: Date;
  toDate?: Date;
  isOpen?: boolean;
}) {
  try {
    const { organizationId } = await requireMember();

    const where: {
      organizationId: string;
      zoneId?: string;
      serviceDate?: { gte?: Date; lte?: Date };
      isOpen?: boolean;
    } = { organizationId };

    if (filters?.zoneId) where.zoneId = filters.zoneId;
    if (filters?.isOpen !== undefined) where.isOpen = filters.isOpen;
    if (filters?.fromDate || filters?.toDate) {
      where.serviceDate = {};
      if (filters.fromDate) where.serviceDate.gte = filters.fromDate;
      if (filters.toDate) where.serviceDate.lte = filters.toDate;
    }

    const routes = await prisma.routeDate.findMany({
      where,
      include: {
        zone: true,
        _count: {
          select: {
            collections: { where: { status: { not: "CANCELLED" } } },
          },
        },
      },
      orderBy: { serviceDate: "asc" },
    });

    return { success: true, routes };
  } catch (error) {
    console.error("Get route dates error:", error);
    return { success: false, error: "Failed to fetch routes" };
  }
}

export async function createRouteDate(
  _prevState: RouteDateFormState,
  formData: FormData
): Promise<RouteDateFormState> {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = createRouteDateSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { zoneId, serviceDate, capacity, isOpen } = parsed.data;
    const parsedDate = new Date(serviceDate);

    // Validate date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      return { error: "Service date must be today or in the future" };
    }

    // Verify zone exists and belongs to organization
    const zone = await prisma.collectionZone.findFirst({
      where: { id: zoneId, organizationId },
    });

    if (!zone) {
      return { error: "Zone not found" };
    }

    // Check for existing route on same date and zone
    const existing = await prisma.routeDate.findFirst({
      where: { zoneId, serviceDate: parsedDate },
    });

    if (existing) {
      return { error: "A route already exists for this zone on this date" };
    }

    const routeDate = await prisma.routeDate.create({
      data: {
        organizationId,
        zoneId,
        serviceDate: parsedDate,
        capacity,
        isOpen,
      },
    });

    revalidatePath("/dashboard/routes");

    return { success: true, routeDateId: routeDate.id };
  } catch (error) {
    console.error("Create route date error:", error);
    return { error: "Failed to create route date" };
  }
}

export async function updateRouteDate(
  id: string,
  data: { capacity?: number; isOpen?: boolean }
) {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const existing = await prisma.routeDate.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { collections: { where: { status: { not: "CANCELLED" } } } } } },
    });

    if (!existing) {
      return { success: false, error: "Route not found" };
    }

    // Prevent reducing capacity below current bookings
    if (data.capacity !== undefined && data.capacity < existing._count.collections) {
      return {
        success: false,
        error: `Cannot reduce capacity below current bookings (${existing._count.collections})`,
      };
    }

    const routeDate = await prisma.routeDate.update({
      where: { id },
      data,
    });

    revalidatePath("/dashboard/routes");

    return { success: true, routeDate };
  } catch (error) {
    console.error("Update route date error:", error);
    return { success: false, error: "Failed to update route" };
  }
}

export async function deleteRouteDate(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const existing = await prisma.routeDate.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { collections: { where: { status: { not: "CANCELLED" } } } } } },
    });

    if (!existing) {
      return { success: false, error: "Route not found" };
    }

    if (existing._count.collections > 0) {
      return { success: false, error: "Cannot delete route with existing bookings" };
    }

    await prisma.routeDate.delete({ where: { id } });

    revalidatePath("/dashboard/routes");

    return { success: true };
  } catch (error) {
    console.error("Delete route date error:", error);
    return { success: false, error: "Failed to delete route" };
  }
}

export async function toggleRouteStatus(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const existing = await prisma.routeDate.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { success: false, error: "Route not found" };
    }

    const routeDate = await prisma.routeDate.update({
      where: { id },
      data: { isOpen: !existing.isOpen },
    });

    revalidatePath("/dashboard/routes");

    return { success: true, routeDate };
  } catch (error) {
    console.error("Toggle route status error:", error);
    return { success: false, error: "Failed to update route" };
  }
}

// ============================================
// BULK ROUTE CREATION (Recurring Routes)
// ============================================

export async function createRecurringRoutes(data: {
  zoneId: string;
  startDate: string;
  endDate: string;
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  capacity: number;
  isOpen: boolean;
}) {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const { zoneId, startDate, endDate, daysOfWeek, capacity, isOpen } = data;

    // Verify zone exists
    const zone = await prisma.collectionZone.findFirst({
      where: { id: zoneId, organizationId },
    });

    if (!zone) {
      return { success: false, error: "Zone not found" };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return { success: false, error: "End date must be after start date" };
    }

    // Generate dates
    const dates: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      if (daysOfWeek.includes(current.getDay())) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    if (dates.length === 0) {
      return { success: false, error: "No dates match the selected days of week" };
    }

    if (dates.length > 52) {
      return { success: false, error: "Cannot create more than 52 routes at once" };
    }

    // Check for existing routes on these dates
    const existingRoutes = await prisma.routeDate.findMany({
      where: {
        zoneId,
        serviceDate: { in: dates },
      },
      select: { serviceDate: true },
    });

    const existingDates = new Set(
      existingRoutes.map((r) => r.serviceDate.toISOString().split("T")[0])
    );

    // Filter out dates that already have routes
    const newDates = dates.filter(
      (d) => !existingDates.has(d.toISOString().split("T")[0])
    );

    if (newDates.length === 0) {
      return { success: false, error: "All selected dates already have routes" };
    }

    // Create routes
    await prisma.routeDate.createMany({
      data: newDates.map((serviceDate) => ({
        organizationId,
        zoneId,
        serviceDate,
        capacity,
        isOpen,
      })),
    });

    revalidatePath("/dashboard/routes");

    return {
      success: true,
      created: newDates.length,
      skipped: dates.length - newDates.length,
    };
  } catch (error) {
    console.error("Create recurring routes error:", error);
    return { success: false, error: "Failed to create routes" };
  }
}

// ============================================
// AVAILABLE ROUTES FOR BOOKING
// ============================================

export async function getAvailableRoutesForPostcode(postcode: string) {
  try {
    const { organizationId } = await requireMember();

    const postcodePrefix = postcode.split(" ")[0]?.toUpperCase() || "";

    // Find zones that serve this postcode
    const zones = await prisma.collectionZone.findMany({
      where: {
        organizationId,
        postcodePrefixes: { has: postcodePrefix },
      },
    });

    if (zones.length === 0) {
      return { success: true, routes: [], message: "No collection service for this postcode area" };
    }

    const zoneIds = zones.map((z) => z.id);

    // Find open routes with available capacity
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const routes = await prisma.routeDate.findMany({
      where: {
        organizationId,
        zoneId: { in: zoneIds },
        serviceDate: { gte: today },
        isOpen: true,
      },
      include: {
        zone: true,
        _count: {
          select: {
            collections: { where: { status: { not: "CANCELLED" } } },
          },
        },
      },
      orderBy: { serviceDate: "asc" },
      take: 30,
    });

    // Filter to routes with available capacity
    const availableRoutes = routes.filter(
      (r) => r.capacity > r._count.collections
    );

    return {
      success: true,
      routes: availableRoutes.map((r) => ({
        id: r.id,
        serviceDate: r.serviceDate,
        zoneName: r.zone.name,
        capacity: r.capacity,
        booked: r._count.collections,
        available: r.capacity - r._count.collections,
      })),
    };
  } catch (error) {
    console.error("Get available routes error:", error);
    return { success: false, error: "Failed to fetch available routes" };
  }
}

// ============================================
// CAPACITY VALIDATION FOR BOOKING
// ============================================

export async function checkAndReserveCapacity(
  routeDateId: string,
  collectionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { organizationId } = await requireMember();

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const routeDate = await tx.routeDate.findFirst({
        where: { id: routeDateId, organizationId },
        include: {
          _count: {
            select: {
              collections: { where: { status: { not: "CANCELLED" } } },
            },
          },
        },
      });

      if (!routeDate) {
        throw new Error("Route not found");
      }

      if (!routeDate.isOpen) {
        throw new Error("This route is not accepting bookings");
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (routeDate.serviceDate < today) {
        throw new Error("Cannot book past routes");
      }

      // Calculate current bookings (excluding the collection being updated if provided)
      let currentBookings = routeDate._count.collections;
      if (collectionId) {
        const existingCollection = await tx.collection.findFirst({
          where: { id: collectionId, routeDateId },
        });
        if (existingCollection) {
          currentBookings -= 1; // Don't count the current booking
        }
      }

      if (currentBookings >= routeDate.capacity) {
        throw new Error("This route is at full capacity");
      }

      return { success: true };
    });

    return result;
  } catch (error) {
    console.error("Check capacity error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Capacity check failed",
    };
  }
}

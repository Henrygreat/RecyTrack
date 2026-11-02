"use server";

import { prisma } from "@/lib/prisma";
import { requireCustomerAccess, type CustomerPortalContext } from "@/lib/portal-access";
import type { AssetStatus, MediaSanitisationStatus, CollectionStatus, CertificateType, CertificateStatus } from "@prisma/client";

// ============================================
// DASHBOARD STATS
// ============================================

export async function getPortalDashboardStats() {
  const ctx = await requireCustomerAccess();

  // Build base where clause for assets
  const assetWhere = {
    organizationId: ctx.organizationId,
    customerId: ctx.customerId,
  };

  // Fetch all stats in parallel
  const [
    totalAssets,
    assetsByStatus,
    mediaStats,
    certificateStats,
    recentCollections,
    processingTrend,
  ] = await Promise.all([
    // Total assets collected
    prisma.asset.count({ where: assetWhere }),

    // Assets by status
    prisma.asset.groupBy({
      by: ["status"],
      where: assetWhere,
      _count: true,
    }),

    // Storage media stats - use raw query to avoid double counting
    prisma.$queryRaw<Array<{ status: MediaSanitisationStatus; count: bigint }>>`
      SELECT sm."sanitisationStatus" as status, COUNT(DISTINCT sm.id) as count
      FROM "StorageMedia" sm
      JOIN "Asset" a ON sm."assetId" = a.id AND sm."organizationId" = a."organizationId"
      WHERE a."customerId" = ${ctx.customerId}
        AND a."organizationId" = ${ctx.organizationId}
      GROUP BY sm."sanitisationStatus"
    `,

    // Certificate stats
    prisma.certificate.groupBy({
      by: ["status"],
      where: {
        organizationId: ctx.organizationId,
        customerId: ctx.customerId,
      },
      _count: true,
    }),

    // Recent collections
    prisma.collection.findMany({
      where: {
        customerId: ctx.customerId,
        organizationId: ctx.organizationId,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        reference: true,
        status: true,
        scheduledDate: true,
        createdAt: true,
        _count: { select: { assets: true } },
      },
    }),

    // Processing trend (last 6 months)
    prisma.$queryRaw<Array<{ month: string; sanitised: bigint; destroyed: bigint }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', sm."verifiedAt"), 'YYYY-MM') as month,
        COUNT(DISTINCT CASE WHEN sm."sanitisationStatus" = 'VERIFIED' AND sm."destructionJobId" IS NULL THEN sm.id END) as sanitised,
        COUNT(DISTINCT CASE WHEN sm."destructionJobId" IS NOT NULL THEN sm.id END) as destroyed
      FROM "StorageMedia" sm
      JOIN "Asset" a ON sm."assetId" = a.id AND sm."organizationId" = a."organizationId"
      WHERE a."customerId" = ${ctx.customerId}
        AND a."organizationId" = ${ctx.organizationId}
        AND sm."verifiedAt" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', sm."verifiedAt")
      ORDER BY month DESC
    `,
  ]);

  // Process status counts
  const statusCounts: Record<string, number> = {};
  for (const item of assetsByStatus) {
    statusCounts[item.status] = item._count;
  }

  // Process media stats
  const mediaStatusCounts: Record<string, number> = {};
  for (const item of mediaStats) {
    mediaStatusCounts[item.status] = Number(item.count);
  }

  // Process certificate stats
  const certCounts: Record<string, number> = {};
  for (const item of certificateStats) {
    certCounts[item.status] = item._count;
  }

  return {
    success: true,
    stats: {
      totalAssets,
      assetsReceived: statusCounts["RECEIVED"] || 0,
      assetsInspection: statusCounts["INSPECTION"] || 0,
      assetsProcessing: statusCounts["PROCESSING"] || 0,
      assetsReady: statusCounts["READY"] || 0,
      assetsReleased: statusCounts["RELEASED"] || 0,
      mediaAwaitingSanitisation: mediaStatusCounts["PENDING"] || 0,
      mediaVerified: mediaStatusCounts["VERIFIED"] || 0,
      mediaFailed: mediaStatusCounts["FAILED"] || 0,
      certificatesIssued: certCounts["ISSUED"] || 0,
      certificatesPending: (certCounts["DRAFT"] || 0) + (certCounts["PENDING_APPROVAL"] || 0),
      recentCollections,
      processingTrend: processingTrend.map((t) => ({
        month: t.month,
        sanitised: Number(t.sanitised),
        destroyed: Number(t.destroyed),
      })),
    },
  };
}

// ============================================
// ASSET TRACKING
// ============================================

export async function getPortalAssets(filters?: {
  status?: AssetStatus;
  collectionId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const ctx = await requireCustomerAccess();
  const page = filters?.page || 1;
  const limit = filters?.limit || 25;
  const skip = (page - 1) * limit;

  const where: {
    organizationId: string;
    customerId: string;
    status?: AssetStatus;
    collectionId?: string;
    OR?: Array<{
      assetTag?: { contains: string; mode: "insensitive" };
      serialNumber?: { contains: string; mode: "insensitive" };
      customerAssetTag?: { contains: string; mode: "insensitive" };
    }>;
  } = {
    organizationId: ctx.organizationId,
    customerId: ctx.customerId,
  };

  if (filters?.status) where.status = filters.status;
  if (filters?.collectionId) where.collectionId = filters.collectionId;
  if (filters?.search) {
    where.OR = [
      { assetTag: { contains: filters.search, mode: "insensitive" } },
      { serialNumber: { contains: filters.search, mode: "insensitive" } },
      { customerAssetTag: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      select: {
        id: true,
        assetTag: true,
        customerAssetTag: true,
        category: true,
        manufacturer: true,
        model: true,
        serialNumber: true,
        status: true,
        receivedAt: true,
        processedAt: true,
        collection: {
          select: { id: true, reference: true, scheduledDate: true },
        },
        storageMedia: {
          select: {
            id: true,
            sanitisationStatus: true,
            destructionJob: { select: { id: true } },
            certificateItems: {
              where: { certificate: { status: "ISSUED" } },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { receivedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.asset.count({ where }),
  ]);

  // Process assets to add computed fields (hide internal details)
  const processedAssets = assets.map((asset) => {
    const allMediaVerified = asset.storageMedia.length > 0 &&
      asset.storageMedia.every((m) => m.sanitisationStatus === "VERIFIED");
    const hasCertificate = asset.storageMedia.some((m) => m.certificateItems.length > 0);

    return {
      id: asset.id,
      assetTag: asset.assetTag,
      customerAssetTag: asset.customerAssetTag,
      category: asset.category,
      manufacturer: asset.manufacturer,
      model: asset.model,
      serialNumber: asset.serialNumber,
      status: asset.status,
      receivedAt: asset.receivedAt,
      processedAt: asset.processedAt,
      collectionReference: asset.collection?.reference || null,
      collectionDate: asset.collection?.scheduledDate || null,
      mediaCount: asset.storageMedia.length,
      sanitisationComplete: allMediaVerified,
      hasCertificate,
    };
  });

  return {
    success: true,
    assets: processedAssets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPortalAssetDetail(assetId: string) {
  const ctx = await requireCustomerAccess();

  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      organizationId: ctx.organizationId,
      customerId: ctx.customerId,
    },
    select: {
      id: true,
      assetTag: true,
      customerAssetTag: true,
      category: true,
      manufacturer: true,
      model: true,
      serialNumber: true,
      status: true,
      physicalCondition: true,
      functionalCondition: true,
      receivedAt: true,
      processedAt: true,
      releasedAt: true,
      collection: {
        select: { id: true, reference: true, scheduledDate: true, receivedAt: true },
      },
      storageMedia: {
        select: {
          id: true,
          reference: true,
          mediaType: true,
          capacity: true,
          sanitisationStatus: true,
          // Don't expose internal IDs
        },
      },
      statusHistory: {
        select: {
          fromStatus: true,
          toStatus: true,
          createdAt: true,
          // Don't expose staff names
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!asset) {
    return { success: false, error: "Asset not found" };
  }

  // Get certificates for this asset's media
  const certificates = await prisma.certificate.findMany({
    where: {
      organizationId: ctx.organizationId,
      customerId: ctx.customerId,
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
      issueDate: true,
      status: true,
    },
  });

  return {
    success: true,
    asset: {
      ...asset,
      certificates,
    },
  };
}

// ============================================
// COLLECTIONS
// ============================================

export async function getPortalCollections(filters?: {
  status?: CollectionStatus;
  page?: number;
  limit?: number;
}) {
  const ctx = await requireCustomerAccess();
  const page = filters?.page || 1;
  const limit = filters?.limit || 25;
  const skip = (page - 1) * limit;

  const where: {
    organizationId: string;
    customerId: string;
    status?: CollectionStatus;
  } = {
    organizationId: ctx.organizationId,
    customerId: ctx.customerId,
  };

  if (filters?.status) where.status = filters.status;

  const [collections, total] = await Promise.all([
    prisma.collection.findMany({
      where,
      select: {
        id: true,
        reference: true,
        status: true,
        scheduledDate: true,
        collectedAt: true,
        receivedAt: true,
        address: true,
        postcode: true,
        createdAt: true,
        _count: { select: { assets: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.collection.count({ where }),
  ]);

  return {
    success: true,
    collections,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================
// CERTIFICATES
// ============================================

export async function getPortalCertificates(filters?: {
  type?: CertificateType;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const ctx = await requireCustomerAccess();
  const page = filters?.page || 1;
  const limit = filters?.limit || 25;
  const skip = (page - 1) * limit;

  // Build where clause for certificates - only show issued, revoked, or superseded
  const statusFilter: CertificateStatus[] = ["ISSUED", "REVOKED", "SUPERSEDED"];

  const [certificates, total] = await Promise.all([
    prisma.certificate.findMany({
      where: {
        organizationId: ctx.organizationId,
        customerId: ctx.customerId,
        status: { in: statusFilter },
        ...(filters?.type ? { certificateType: filters.type } : {}),
        ...(filters?.search ? {
          OR: [
            { certificateNumber: { contains: filters.search, mode: "insensitive" } },
            { reference: { contains: filters.search, mode: "insensitive" } },
          ],
        } : {}),
      },
      select: {
        id: true,
        reference: true,
        certificateNumber: true,
        certificateType: true,
        status: true,
        issueDate: true,
        totalMediaCount: true,
        verificationToken: true,
        revokedAt: true,
        supersededAt: true,
      },
      orderBy: { issueDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.certificate.count({
      where: {
        organizationId: ctx.organizationId,
        customerId: ctx.customerId,
        status: { in: ["ISSUED", "REVOKED", "SUPERSEDED"] },
      },
    }),
  ]);

  return {
    success: true,
    certificates,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPortalCertificateDetail(certificateId: string) {
  const ctx = await requireCustomerAccess();

  const certificate = await prisma.certificate.findFirst({
    where: {
      id: certificateId,
      organizationId: ctx.organizationId,
      customerId: ctx.customerId,
      status: { in: ["ISSUED", "REVOKED", "SUPERSEDED"] },
    },
    select: {
      id: true,
      reference: true,
      certificateNumber: true,
      certificateType: true,
      status: true,
      issueDate: true,
      totalMediaCount: true,
      processingStartDate: true,
      processingCompleteDate: true,
      sanitisationSummary: true,
      verificationToken: true,
      issuedByName: true,
      revokedAt: true,
      revocationReason: true,
      supersededAt: true,
      items: {
        select: {
          id: true,
          mediaReference: true,
          mediaType: true,
          serialNumber: true,
          assetTag: true,
          processingType: true,
          processingMethod: true,
          processingDate: true,
          outcomeStatus: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!certificate) {
    return { success: false, error: "Certificate not found" };
  }

  return { success: true, certificate };
}

// ============================================
// CUSTOMER USER MANAGEMENT
// ============================================

export async function getPortalUsers() {
  const ctx = await requireCustomerAccess();

  // Only CUSTOMER_ADMIN can view users
  if (!ctx.isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const users = await prisma.customerAccess.findMany({
    where: {
      customerId: ctx.customerId,
      organizationId: ctx.organizationId,
    },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      siteAccess: {
        select: {
          site: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  // Get pending invitations (not accepted, not revoked, not expired)
  const invitations = await prisma.customerInvitation.findMany({
    where: {
      customerId: ctx.customerId,
      organizationId: ctx.organizationId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return {
    success: true,
    users: users.map((u) => ({
      id: u.id,
      userId: u.user.id,
      name: u.user.name,
      email: u.user.email,
      role: u.role,
      createdAt: u.createdAt,
      sites: u.siteAccess.map((s) => s.site),
    })),
    invitations,
  };
}

export async function revokePortalUserAccess(customerAccessId: string) {
  const ctx = await requireCustomerAccess();

  if (!ctx.isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const access = await prisma.customerAccess.findFirst({
    where: {
      id: customerAccessId,
      customerId: ctx.customerId,
      organizationId: ctx.organizationId,
    },
  });

  if (!access) {
    return { success: false, error: "User access not found" };
  }

  // Prevent self-revocation
  if (access.userId === ctx.userId) {
    return { success: false, error: "Cannot revoke your own access" };
  }

  await prisma.customerAccess.delete({
    where: { id: customerAccessId },
  });

  return { success: true };
}

export async function cancelPortalInvitation(invitationId: string) {
  const ctx = await requireCustomerAccess();

  if (!ctx.isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const invitation = await prisma.customerInvitation.findFirst({
    where: {
      id: invitationId,
      customerId: ctx.customerId,
      organizationId: ctx.organizationId,
      acceptedAt: null,
      revokedAt: null,
    },
  });

  if (!invitation) {
    return { success: false, error: "Invitation not found" };
  }

  await prisma.customerInvitation.update({
    where: { id: invitationId },
    data: { revokedAt: new Date() },
  });

  return { success: true };
}

// ============================================
// COMPLIANCE REPORTS
// ============================================

export async function getPortalReportData(reportType: string, filters?: {
  startDate?: Date;
  endDate?: Date;
  collectionId?: string;
}) {
  const ctx = await requireCustomerAccess();

  const baseWhere = {
    organizationId: ctx.organizationId,
    customerId: ctx.customerId,
  };

  const dateFilter = {
    ...(filters?.startDate ? { gte: filters.startDate } : {}),
    ...(filters?.endDate ? { lte: filters.endDate } : {}),
  };

  switch (reportType) {
    case "collection_summary": {
      const collections = await prisma.collection.findMany({
        where: {
          ...baseWhere,
          ...(Object.keys(dateFilter).length > 0 ? { scheduledDate: dateFilter } : {}),
        },
        select: {
          reference: true,
          status: true,
          scheduledDate: true,
          collectedAt: true,
          receivedAt: true,
          address: true,
          postcode: true,
          _count: { select: { assets: true } },
        },
        orderBy: { scheduledDate: "desc" },
      });

      return {
        success: true,
        reportType,
        data: collections.map((c) => ({
          reference: c.reference,
          status: c.status,
          scheduledDate: c.scheduledDate?.toISOString().split("T")[0] || "",
          collectedDate: c.collectedAt?.toISOString().split("T")[0] || "",
          receivedDate: c.receivedAt?.toISOString().split("T")[0] || "",
          address: c.address,
          postcode: c.postcode,
          assetCount: c._count.assets,
        })),
      };
    }

    case "asset_processing": {
      const assets = await prisma.asset.findMany({
        where: {
          ...baseWhere,
          ...(filters?.collectionId ? { collectionId: filters.collectionId } : {}),
        },
        select: {
          assetTag: true,
          customerAssetTag: true,
          category: true,
          manufacturer: true,
          model: true,
          serialNumber: true,
          status: true,
          receivedAt: true,
          processedAt: true,
          collection: { select: { reference: true } },
          storageMedia: {
            select: {
              reference: true,
              mediaType: true,
              sanitisationStatus: true,
            },
          },
        },
        orderBy: { assetTag: "asc" },
      });

      return {
        success: true,
        reportType,
        data: assets.map((a) => ({
          assetTag: a.assetTag,
          customerRef: a.customerAssetTag || "",
          category: a.category,
          make: a.manufacturer || "",
          model: a.model || "",
          serialNumber: a.serialNumber || "",
          status: a.status,
          collection: a.collection?.reference || "",
          receivedDate: a.receivedAt?.toISOString().split("T")[0] || "",
          processedDate: a.processedAt?.toISOString().split("T")[0] || "",
          mediaCount: a.storageMedia.length,
          sanitisationStatus: a.storageMedia.every((m) => m.sanitisationStatus === "VERIFIED")
            ? "Complete"
            : a.storageMedia.some((m) => m.sanitisationStatus === "ERASURE_FAILED")
            ? "Failed"
            : "Pending",
        })),
      };
    }

    case "certificate_register": {
      const certificates = await prisma.certificate.findMany({
        where: {
          ...baseWhere,
          status: { in: ["ISSUED", "REVOKED", "SUPERSEDED"] },
          ...(Object.keys(dateFilter).length > 0 ? { issueDate: dateFilter } : {}),
        },
        select: {
          certificateNumber: true,
          certificateType: true,
          status: true,
          issueDate: true,
          totalMediaCount: true,
          sanitisationSummary: true,
          revokedAt: true,
        },
        orderBy: { issueDate: "desc" },
      });

      return {
        success: true,
        reportType,
        data: certificates.map((c) => ({
          certificateNumber: c.certificateNumber,
          type: c.certificateType.replace(/_/g, " "),
          status: c.status,
          issueDate: c.issueDate?.toISOString().split("T")[0] || "",
          mediaCount: c.totalMediaCount,
          methods: c.sanitisationSummary || "",
          revokedDate: c.revokedAt?.toISOString().split("T")[0] || "",
        })),
      };
    }

    default:
      return { success: false, error: "Unknown report type" };
  }
}

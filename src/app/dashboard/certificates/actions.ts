"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMember, STAFF_ROLES, MANAGEMENT_ROLES } from "@/lib/access";
import {
  checkBatchEligibility,
  validateCertificateCreation,
} from "@/lib/certificate-eligibility";
import type { CertificateType, CertificateStatus } from "@prisma/client";
import crypto from "crypto";

// ============================================
// REFERENCE GENERATION
// ============================================

async function generateCertificateReference(organizationId: string): Promise<string> {
  const count = await prisma.certificate.count({ where: { organizationId } });
  const num = count + 1;
  return `CERT-${String(num).padStart(6, "0")}`;
}

async function generateCertificateNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.certificate.count({
    where: {
      organizationId,
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  const num = count + 1;
  return `${year}/${String(num).padStart(5, "0")}`;
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ============================================
// CERTIFICATE ACTIONS
// ============================================

export async function getCertificates(filters?: {
  status?: CertificateStatus;
  type?: CertificateType;
  customerId?: string;
  search?: string;
}) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const where: {
      organizationId: string;
      status?: CertificateStatus;
      certificateType?: CertificateType;
      customerId?: string;
      OR?: Array<{
        reference?: { contains: string; mode: "insensitive" };
        certificateNumber?: { contains: string; mode: "insensitive" };
      }>;
    } = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.certificateType = filters.type;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: "insensitive" } },
        { certificateNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const certificates = await prisma.certificate.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, reference: true },
        },
        items: {
          select: { id: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, certificates };
  } catch (error) {
    console.error("Get certificates error:", error);
    return { success: false, error: "Failed to fetch certificates" };
  }
}

export async function getCertificateById(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const certificate = await prisma.certificate.findFirst({
      where: { id, organizationId },
      include: {
        customer: {
          select: { id: true, name: true, reference: true, address: true, postcode: true },
        },
        items: {
          include: {
            storageMedia: {
              include: {
                asset: {
                  select: {
                    id: true,
                    assetTag: true,
                    category: true,
                    manufacturer: true,
                    model: true,
                    serialNumber: true,
                  },
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        events: {
          orderBy: { eventDate: "desc" },
        },
      },
    });

    if (!certificate) {
      return { success: false, error: "Certificate not found" };
    }

    return { success: true, certificate };
  } catch (error) {
    console.error("Get certificate by ID error:", error);
    return { success: false, error: "Failed to fetch certificate" };
  }
}

export async function checkEligibility(storageMediaIds: string[]) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const eligibility = await checkBatchEligibility(organizationId, storageMediaIds);

    return { success: true, eligibility };
  } catch (error) {
    console.error("Check eligibility error:", error);
    return { success: false, error: "Failed to check eligibility" };
  }
}

export async function createCertificate(data: {
  storageMediaIds: string[];
  certificateType: CertificateType;
  notes?: string;
}) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    // Validate eligibility within transaction
    const validation = await validateCertificateCreation(
      organizationId,
      data.storageMediaIds,
      data.certificateType
    );

    if (!validation.valid) {
      return {
        success: false,
        error: "Certificate eligibility check failed",
        errors: validation.errors,
      };
    }

    // Get eligibility details for certificate creation
    const eligibility = await checkBatchEligibility(organizationId, data.storageMediaIds);

    if (!eligibility.allEligible) {
      return {
        success: false,
        error: "Not all items are eligible for certification",
      };
    }

    if (!eligibility.customerId) {
      return {
        success: false,
        error: "No customer associated with the selected media",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const reference = await generateCertificateReference(organizationId);
    const certificateNumber = await generateCertificateNumber(organizationId);
    const verificationToken = generateVerificationToken();

    // Calculate processing dates
    const processingDates = eligibility.items
      .filter((item) => item.details.processingDate)
      .map((item) => item.details.processingDate!);

    const processingStartDate = processingDates.length > 0
      ? new Date(Math.min(...processingDates.map((d) => d.getTime())))
      : null;
    const processingCompleteDate = processingDates.length > 0
      ? new Date(Math.max(...processingDates.map((d) => d.getTime())))
      : null;

    // Summarise methods used
    const methodsUsed = new Set(
      eligibility.items
        .filter((item) => item.details.processingMethod)
        .map((item) => item.details.processingMethod!)
    );
    const sanitisationSummary = Array.from(methodsUsed).join(", ");

    const certificate = await prisma.$transaction(async (tx) => {
      // Create certificate
      const newCert = await tx.certificate.create({
        data: {
          organizationId,
          reference,
          certificateNumber,
          verificationToken,
          certificateType: data.certificateType,
          status: "DRAFT",
          customerId: eligibility.customerId!,
          totalMediaCount: data.storageMediaIds.length,
          processingStartDate,
          processingCompleteDate,
          sanitisationSummary,
          notes: data.notes,
          createdByUserId: userId,
          createdByName: user?.name || user?.email || "Unknown",
        },
      });

      // Create certificate items
      for (let i = 0; i < eligibility.items.length; i++) {
        const item = eligibility.items[i];
        await tx.certificateItem.create({
          data: {
            certificateId: newCert.id,
            storageMediaId: item.details.storageMediaId,
            mediaReference: item.details.mediaReference,
            mediaType: item.details.processingType === "DESTRUCTION" ? "DESTROYED" : "ERASED",
            serialNumber: item.details.serialNumber,
            assetTag: item.details.assetTag,
            processingType: item.details.processingType || "ERASURE",
            processingMethod: item.details.processingMethod || "Unknown",
            processingDate: item.details.processingDate || new Date(),
            outcomeStatus: "VERIFIED",
            verifiedByName: item.details.verifiedByName,
            verifiedAt: item.details.verifiedAt,
            sortOrder: i,
          },
        });
      }

      // Create event
      await tx.certificateEvent.create({
        data: {
          certificateId: newCert.id,
          eventType: "CREATED",
          actorUserId: userId,
          actorName: user?.name || user?.email || "Unknown",
          details: {
            itemCount: data.storageMediaIds.length,
            certificateType: data.certificateType,
          },
        },
      });

      return newCert;
    });

    revalidatePath("/dashboard/certificates");

    return { success: true, certificate };
  } catch (error) {
    console.error("Create certificate error:", error);
    return { success: false, error: "Failed to create certificate" };
  }
}

export async function submitCertificateForApproval(id: string) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const certificate = await prisma.certificate.findFirst({
      where: { id, organizationId },
    });

    if (!certificate) {
      return { success: false, error: "Certificate not found" };
    }

    if (certificate.status !== "DRAFT") {
      return { success: false, error: "Certificate is not in draft status" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.$transaction([
      prisma.certificate.update({
        where: { id },
        data: { status: "PENDING_APPROVAL" },
      }),
      prisma.certificateEvent.create({
        data: {
          certificateId: id,
          eventType: "SUBMITTED",
          actorUserId: userId,
          actorName: user?.name || user?.email || "Unknown",
        },
      }),
    ]);

    revalidatePath("/dashboard/certificates");
    revalidatePath(`/dashboard/certificates/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Submit certificate error:", error);
    return { success: false, error: "Failed to submit certificate" };
  }
}

export async function approveCertificate(id: string, notes?: string) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const certificate = await prisma.certificate.findFirst({
      where: { id, organizationId },
    });

    if (!certificate) {
      return { success: false, error: "Certificate not found" };
    }

    if (certificate.status !== "PENDING_APPROVAL") {
      return { success: false, error: "Certificate is not pending approval" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.$transaction([
      prisma.certificate.update({
        where: { id },
        data: {
          status: "ISSUED",
          issueDate: new Date(),
          issuedByUserId: userId,
          issuedByName: user?.name || user?.email || "Unknown",
          approvedAt: new Date(),
          approvedByUserId: userId,
          approvedByName: user?.name || user?.email || "Unknown",
          approvalNotes: notes,
        },
      }),
      prisma.certificateEvent.create({
        data: {
          certificateId: id,
          eventType: "APPROVED",
          actorUserId: userId,
          actorName: user?.name || user?.email || "Unknown",
          notes,
        },
      }),
      prisma.certificateEvent.create({
        data: {
          certificateId: id,
          eventType: "ISSUED",
          actorUserId: userId,
          actorName: user?.name || user?.email || "Unknown",
        },
      }),
    ]);

    revalidatePath("/dashboard/certificates");
    revalidatePath(`/dashboard/certificates/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Approve certificate error:", error);
    return { success: false, error: "Failed to approve certificate" };
  }
}

export async function rejectCertificate(id: string, reason: string) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const certificate = await prisma.certificate.findFirst({
      where: { id, organizationId },
    });

    if (!certificate) {
      return { success: false, error: "Certificate not found" };
    }

    if (certificate.status !== "PENDING_APPROVAL") {
      return { success: false, error: "Certificate is not pending approval" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.$transaction([
      prisma.certificate.update({
        where: { id },
        data: {
          status: "DRAFT",
          approvalNotes: reason,
        },
      }),
      prisma.certificateEvent.create({
        data: {
          certificateId: id,
          eventType: "REJECTED",
          actorUserId: userId,
          actorName: user?.name || user?.email || "Unknown",
          notes: reason,
        },
      }),
    ]);

    revalidatePath("/dashboard/certificates");
    revalidatePath(`/dashboard/certificates/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Reject certificate error:", error);
    return { success: false, error: "Failed to reject certificate" };
  }
}

export async function revokeCertificate(id: string, reason: string) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const certificate = await prisma.certificate.findFirst({
      where: { id, organizationId },
    });

    if (!certificate) {
      return { success: false, error: "Certificate not found" };
    }

    if (certificate.status !== "ISSUED") {
      return { success: false, error: "Only issued certificates can be revoked" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.$transaction([
      prisma.certificate.update({
        where: { id },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedByUserId: userId,
          revokedByName: user?.name || user?.email || "Unknown",
          revocationReason: reason,
        },
      }),
      prisma.certificateEvent.create({
        data: {
          certificateId: id,
          eventType: "REVOKED",
          actorUserId: userId,
          actorName: user?.name || user?.email || "Unknown",
          notes: reason,
        },
      }),
    ]);

    revalidatePath("/dashboard/certificates");
    revalidatePath(`/dashboard/certificates/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Revoke certificate error:", error);
    return { success: false, error: "Failed to revoke certificate" };
  }
}

export async function supersedeCertificate(
  id: string,
  data: {
    storageMediaIds: string[];
    certificateType: CertificateType;
    reason: string;
  }
) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const oldCertificate = await prisma.certificate.findFirst({
      where: { id, organizationId },
    });

    if (!oldCertificate) {
      return { success: false, error: "Original certificate not found" };
    }

    if (oldCertificate.status !== "ISSUED") {
      return { success: false, error: "Only issued certificates can be superseded" };
    }

    // Create new certificate
    const createResult = await createCertificate({
      storageMediaIds: data.storageMediaIds,
      certificateType: data.certificateType,
      notes: `Supersedes ${oldCertificate.reference}: ${data.reason}`,
    });

    if (!createResult.success || !createResult.certificate) {
      return createResult;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Update old certificate as superseded
    await prisma.$transaction([
      prisma.certificate.update({
        where: { id },
        data: {
          status: "SUPERSEDED",
          supersededById: createResult.certificate.id,
          supersededAt: new Date(),
          supersessionReason: data.reason,
        },
      }),
      prisma.certificateEvent.create({
        data: {
          certificateId: id,
          eventType: "SUPERSEDED",
          actorUserId: userId,
          actorName: user?.name || user?.email || "Unknown",
          notes: data.reason,
          details: {
            newCertificateId: createResult.certificate.id,
            newCertificateReference: createResult.certificate.reference,
          },
        },
      }),
    ]);

    revalidatePath("/dashboard/certificates");
    revalidatePath(`/dashboard/certificates/${id}`);

    return { success: true, newCertificate: createResult.certificate };
  } catch (error) {
    console.error("Supersede certificate error:", error);
    return { success: false, error: "Failed to supersede certificate" };
  }
}

export async function getCertificateStats() {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const [
      totalCertificates,
      draftCount,
      pendingApprovalCount,
      issuedCount,
      revokedCount,
      recentCertificates,
    ] = await Promise.all([
      prisma.certificate.count({ where: { organizationId } }),
      prisma.certificate.count({ where: { organizationId, status: "DRAFT" } }),
      prisma.certificate.count({ where: { organizationId, status: "PENDING_APPROVAL" } }),
      prisma.certificate.count({ where: { organizationId, status: "ISSUED" } }),
      prisma.certificate.count({ where: { organizationId, status: "REVOKED" } }),
      prisma.certificate.findMany({
        where: { organizationId },
        include: {
          customer: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      success: true,
      stats: {
        totalCertificates,
        draftCount,
        pendingApprovalCount,
        issuedCount,
        revokedCount,
        recentCertificates,
      },
    };
  } catch (error) {
    console.error("Get certificate stats error:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}

// ============================================
// PUBLIC VERIFICATION
// ============================================

export async function verifyCertificate(verificationToken: string, clientIp?: string) {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: { verificationToken },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        customer: {
          select: { name: true },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    // Log verification attempt
    if (certificate) {
      await prisma.certificateVerificationLog.create({
        data: {
          certificateId: certificate.id,
          verifierIp: clientIp,
          verificationResult: certificate.status,
        },
      });

      await prisma.certificateEvent.create({
        data: {
          certificateId: certificate.id,
          eventType: "VERIFIED",
          actorIp: clientIp,
          details: { result: certificate.status },
        },
      });
    }

    if (!certificate) {
      return {
        success: true,
        result: "NOT_FOUND",
        certificate: null,
      };
    }

    // Return minimal non-sensitive information
    return {
      success: true,
      result: certificate.status,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        certificateType: certificate.certificateType,
        status: certificate.status,
        issueDate: certificate.issueDate,
        organizationName: certificate.organization.name,
        customerName: certificate.customer.name,
        itemCount: certificate._count.items,
        revokedAt: certificate.revokedAt,
        revocationReason: certificate.status === "REVOKED" ? certificate.revocationReason : null,
        supersededAt: certificate.supersededAt,
      },
    };
  } catch (error) {
    console.error("Verify certificate error:", error);
    return { success: false, error: "Verification failed" };
  }
}

// ============================================
// ELIGIBLE MEDIA RETRIEVAL
// ============================================

export async function getEligibleMedia(filters?: {
  customerId?: string;
  search?: string;
}) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    // Find storage media that is verified and doesn't have an active certificate
    const where: {
      organizationId: string;
      sanitisationStatus: "VERIFIED";
      asset?: {
        customerId?: string;
        customer?: { status: "ACTIVE" };
        OR?: Array<{
          assetTag?: { contains: string; mode: "insensitive" };
          serialNumber?: { contains: string; mode: "insensitive" };
        }>;
      };
      NOT?: {
        certificateItems?: {
          some: {
            certificate: {
              status: { in: CertificateStatus[] };
            };
          };
        };
      };
    } = {
      organizationId,
      sanitisationStatus: "VERIFIED",
      NOT: {
        certificateItems: {
          some: {
            certificate: {
              status: { in: ["DRAFT", "PENDING_APPROVAL", "ISSUED"] },
            },
          },
        },
      },
    };

    if (filters?.customerId) {
      where.asset = {
        ...(where.asset || {}),
        customerId: filters.customerId,
        customer: { status: "ACTIVE" },
      };
    }

    if (filters?.search) {
      where.asset = {
        ...(where.asset || {}),
        OR: [
          { assetTag: { contains: filters.search, mode: "insensitive" } },
          { serialNumber: { contains: filters.search, mode: "insensitive" } },
        ],
      };
    }

    const media = await prisma.storageMedia.findMany({
      where,
      include: {
        asset: {
          include: {
            customer: {
              select: { id: true, name: true, reference: true },
            },
          },
        },
        erasureJobs: {
          where: { status: "VERIFIED" },
          orderBy: { completedAt: "desc" },
          take: 1,
          select: {
            id: true,
            methodName: true,
            completedAt: true,
            verifiedByName: true,
          },
        },
        destructionJob: {
          where: { status: "VERIFIED" },
          select: {
            id: true,
            destructionMethod: true,
            completedAt: true,
            verifiedByName: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    // Transform for display
    const eligibleMedia = media.map((m) => {
      const erasureJob = m.erasureJobs[0];
      const destructionJob = m.destructionJob;

      return {
        id: m.id,
        reference: m.reference,
        serialNumber: m.serialNumber,
        mediaType: m.mediaType,
        capacity: m.capacity,
        asset: m.asset ? {
          id: m.asset.id,
          assetTag: m.asset.assetTag,
          category: m.asset.category,
          manufacturer: m.asset.manufacturer,
          model: m.asset.model,
          serialNumber: m.asset.serialNumber,
        } : null,
        customer: m.asset?.customer || null,
        processingType: destructionJob ? "DESTRUCTION" : (erasureJob ? "ERASURE" : null),
        processingMethod: destructionJob?.destructionMethod || erasureJob?.methodName || null,
        processingDate: destructionJob?.completedAt || erasureJob?.completedAt || null,
        verifiedBy: destructionJob?.verifiedByName || erasureJob?.verifiedByName || null,
      };
    });

    return { success: true, media: eligibleMedia };
  } catch (error) {
    console.error("Get eligible media error:", error);
    return { success: false, error: "Failed to fetch eligible media" };
  }
}

export async function getCustomersWithEligibleMedia() {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const customers = await prisma.customer.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        assets: {
          some: {
            storageMedia: {
              some: {
                sanitisationStatus: "VERIFIED",
                NOT: {
                  certificateItems: {
                    some: {
                      certificate: {
                        status: { in: ["DRAFT", "PENDING_APPROVAL", "ISSUED"] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        reference: true,
        _count: {
          select: {
            assets: {
              where: {
                storageMedia: {
                  some: {
                    sanitisationStatus: "VERIFIED",
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return { success: true, customers };
  } catch (error) {
    console.error("Get customers with eligible media error:", error);
    return { success: false, error: "Failed to fetch customers" };
  }
}

// ============================================
// PDF GENERATION (placeholder - will be implemented)
// ============================================

export async function generateCertificatePdf(id: string) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const certificate = await prisma.certificate.findFirst({
      where: { id, organizationId },
      include: {
        organization: true,
        customer: true,
        items: {
          include: {
            storageMedia: {
              include: {
                asset: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!certificate) {
      return { success: false, error: "Certificate not found" };
    }

    if (certificate.status !== "ISSUED") {
      return { success: false, error: "Only issued certificates can generate PDF" };
    }

    // TODO: Implement PDF generation using @react-pdf/renderer
    // For now, return placeholder

    return {
      success: true,
      message: "PDF generation will be implemented",
      certificate,
    };
  } catch (error) {
    console.error("Generate PDF error:", error);
    return { success: false, error: "Failed to generate PDF" };
  }
}

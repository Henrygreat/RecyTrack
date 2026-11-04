"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMember, STAFF_ROLES, MANAGEMENT_ROLES } from "@/lib/access";
import type {
  MediaType,
  MediaSanitisationStatus,
  ErasureMethodCategory,
  ErasureJobStatus,
  DestructionMethod,
  DestructionStatus,
  EvidenceType,
} from "@prisma/client";

// ============================================
// REFERENCE GENERATION
// ============================================

async function generateReference(
  organizationId: string,
  prefix: string,
  model: "storageMedia" | "erasureJob" | "destructionJob"
): Promise<string> {
  let count: number;

  switch (model) {
    case "storageMedia":
      count = await prisma.storageMedia.count({ where: { organizationId } });
      break;
    case "erasureJob":
      count = await prisma.erasureJob.count({ where: { organizationId } });
      break;
    case "destructionJob":
      count = await prisma.destructionJob.count({ where: { organizationId } });
      break;
  }

  const num = count + 1;
  return `${prefix}-${String(num).padStart(6, "0")}`;
}

// ============================================
// STORAGE MEDIA ACTIONS
// ============================================

export async function getStorageMedia(filters?: {
  assetId?: string;
  status?: MediaSanitisationStatus;
  mediaType?: MediaType;
  search?: string;
}) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const where: {
      organizationId: string;
      assetId?: string;
      sanitisationStatus?: MediaSanitisationStatus;
      mediaType?: MediaType;
      OR?: Array<{
        reference?: { contains: string; mode: "insensitive" };
        serialNumber?: { contains: string; mode: "insensitive" };
        manufacturer?: { contains: string; mode: "insensitive" };
        model?: { contains: string; mode: "insensitive" };
      }>;
    } = { organizationId };

    if (filters?.assetId) where.assetId = filters.assetId;
    if (filters?.status) where.sanitisationStatus = filters.status;
    if (filters?.mediaType) where.mediaType = filters.mediaType;
    if (filters?.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: "insensitive" } },
        { serialNumber: { contains: filters.search, mode: "insensitive" } },
        { manufacturer: { contains: filters.search, mode: "insensitive" } },
        { model: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const media = await prisma.storageMedia.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            category: true,
            manufacturer: true,
            model: true,
            customer: {
              select: { id: true, name: true, reference: true },
            },
          },
        },
        warehouseLocation: {
          select: { id: true, code: true, name: true },
        },
        erasureJobs: {
          select: {
            id: true,
            reference: true,
            status: true,
            completedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        destructionJob: {
          select: {
            id: true,
            reference: true,
            status: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, media };
  } catch (error) {
    console.error("Get storage media error:", error);
    return { success: false, error: "Failed to fetch storage media" };
  }
}

export async function getStorageMediaById(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const media = await prisma.storageMedia.findFirst({
      where: { id, organizationId },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            category: true,
            manufacturer: true,
            model: true,
            serialNumber: true,
            customer: {
              select: { id: true, name: true, reference: true },
            },
          },
        },
        warehouseLocation: {
          select: { id: true, code: true, name: true },
        },
        erasureJobs: {
          include: {
            erasureMethod: true,
            evidence: true,
          },
          orderBy: { createdAt: "desc" },
        },
        destructionJob: {
          include: {
            witnesses: true,
            evidence: true,
          },
        },
      },
    });

    if (!media) {
      return { success: false, error: "Storage media not found" };
    }

    return { success: true, media };
  } catch (error) {
    console.error("Get storage media by ID error:", error);
    return { success: false, error: "Failed to fetch storage media" };
  }
}

export async function createStorageMedia(data: {
  assetId: string;
  mediaType: MediaType;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  capacity?: string;
  interface?: string;
  isDataBearing?: boolean;
  containsSensitiveData?: boolean;
  dataClassification?: string;
  isRemovable?: boolean;
  warehouseLocationId?: string;
  binLocation?: string;
  notes?: string;
}) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    // Verify asset belongs to organization
    const asset = await prisma.asset.findFirst({
      where: { id: data.assetId, organizationId },
      select: { id: true, customerId: true },
    });

    if (!asset) {
      return { success: false, error: "Asset not found" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const reference = await generateReference(organizationId, "MED", "storageMedia");

    const media = await prisma.storageMedia.create({
      data: {
        organizationId,
        reference,
        assetId: data.assetId,
        mediaType: data.mediaType,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        capacity: data.capacity,
        interface: data.interface,
        isDataBearing: data.isDataBearing ?? true,
        containsSensitiveData: data.containsSensitiveData ?? false,
        dataClassification: data.dataClassification,
        isRemovable: data.isRemovable ?? false,
        warehouseLocationId: data.warehouseLocationId,
        binLocation: data.binLocation,
        notes: data.notes,
        sanitisationStatus: data.isDataBearing === false ? "EXEMPT" : "NOT_STARTED",
        createdByUserId: userId,
        createdByName: user?.name || user?.email || "Unknown",
      },
    });

    revalidatePath("/dashboard/destruction");
    revalidatePath(`/dashboard/assets/${data.assetId}`);

    return { success: true, media };
  } catch (error) {
    console.error("Create storage media error:", error);
    return { success: false, error: "Failed to create storage media" };
  }
}

export async function updateStorageMedia(
  id: string,
  data: {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    capacity?: string;
    interface?: string;
    isDataBearing?: boolean;
    containsSensitiveData?: boolean;
    dataClassification?: string;
    warehouseLocationId?: string | null;
    binLocation?: string;
    notes?: string;
  }
) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const existing = await prisma.storageMedia.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { success: false, error: "Storage media not found" };
    }

    // Determine sanitisation status based on isDataBearing change
    let sanitisationStatus: "EXEMPT" | "NOT_STARTED" | undefined;
    if (data.isDataBearing === false) {
      sanitisationStatus = "EXEMPT";
    } else if (data.isDataBearing === true && existing.sanitisationStatus === "EXEMPT") {
      sanitisationStatus = "NOT_STARTED";
    }

    const media = await prisma.storageMedia.update({
      where: { id },
      data: {
        ...data,
        sanitisationStatus,
      },
    });

    revalidatePath("/dashboard/destruction");
    revalidatePath(`/dashboard/destruction/media/${id}`);

    return { success: true, media };
  } catch (error) {
    console.error("Update storage media error:", error);
    return { success: false, error: "Failed to update storage media" };
  }
}

// ============================================
// ERASURE METHOD ACTIONS
// ============================================

export async function getErasureMethods(activeOnly = true) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const methods = await prisma.erasureMethod.findMany({
      where: {
        organizationId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return { success: true, methods };
  } catch (error) {
    console.error("Get erasure methods error:", error);
    return { success: false, error: "Failed to fetch erasure methods" };
  }
}

export async function getErasureMethodById(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const method = await prisma.erasureMethod.findFirst({
      where: { id, organizationId },
    });

    if (!method) {
      return { success: false, error: "Erasure method not found" };
    }

    return { success: true, method };
  } catch (error) {
    console.error("Get erasure method by ID error:", error);
    return { success: false, error: "Failed to fetch erasure method" };
  }
}

export async function createErasureMethod(data: {
  name: string;
  code: string;
  description?: string;
  category: ErasureMethodCategory;
  supportedMediaTypes: MediaType[];
  toolName?: string;
  toolVersion?: string;
  procedureRef?: string;
  requiresEvidence?: boolean;
  requiredEvidenceTypes?: EvidenceType[];
  requiresVerification?: boolean;
  complianceStandards?: string[];
  verificationMethod?: string;
  verificationCriteria?: string;
  sortOrder?: number;
}) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    // Check for duplicate code
    const existing = await prisma.erasureMethod.findFirst({
      where: { organizationId, code: data.code },
    });

    if (existing) {
      return { success: false, error: "A method with this code already exists" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const method = await prisma.erasureMethod.create({
      data: {
        organizationId,
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description,
        category: data.category,
        supportedMediaTypes: data.supportedMediaTypes,
        toolName: data.toolName,
        toolVersion: data.toolVersion,
        procedureRef: data.procedureRef,
        requiresEvidence: data.requiresEvidence ?? true,
        requiredEvidenceTypes: data.requiredEvidenceTypes || [],
        requiresVerification: data.requiresVerification ?? true,
        complianceStandards: data.complianceStandards || [],
        verificationMethod: data.verificationMethod,
        verificationCriteria: data.verificationCriteria,
        sortOrder: data.sortOrder ?? 0,
        createdByUserId: userId,
        createdByName: user?.name || user?.email || "Unknown",
      },
    });

    revalidatePath("/dashboard/destruction/methods");

    return { success: true, method };
  } catch (error) {
    console.error("Create erasure method error:", error);
    return { success: false, error: "Failed to create erasure method" };
  }
}

export async function updateErasureMethod(
  id: string,
  data: {
    name?: string;
    description?: string;
    supportedMediaTypes?: MediaType[];
    toolName?: string;
    toolVersion?: string;
    procedureRef?: string;
    requiresEvidence?: boolean;
    requiredEvidenceTypes?: EvidenceType[];
    requiresVerification?: boolean;
    complianceStandards?: string[];
    verificationMethod?: string;
    verificationCriteria?: string;
    isActive?: boolean;
    sortOrder?: number;
  }
) {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const existing = await prisma.erasureMethod.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { success: false, error: "Erasure method not found" };
    }

    const method = await prisma.erasureMethod.update({
      where: { id },
      data,
    });

    revalidatePath("/dashboard/destruction/methods");

    return { success: true, method };
  } catch (error) {
    console.error("Update erasure method error:", error);
    return { success: false, error: "Failed to update erasure method" };
  }
}

// ============================================
// ERASURE JOB ACTIONS
// ============================================

export async function getErasureJobs(filters?: {
  status?: ErasureJobStatus;
  storageMediaId?: string;
  technicianId?: string;
}) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const where: {
      organizationId: string;
      status?: ErasureJobStatus;
      storageMediaId?: string;
      assignedTechnicianUserId?: string;
    } = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.storageMediaId) where.storageMediaId = filters.storageMediaId;
    if (filters?.technicianId) where.assignedTechnicianUserId = filters.technicianId;

    const jobs = await prisma.erasureJob.findMany({
      where,
      include: {
        storageMedia: {
          include: {
            asset: {
              select: {
                id: true,
                assetTag: true,
                customer: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        erasureMethod: {
          select: { id: true, name: true, code: true },
        },
        evidence: {
          select: { id: true, evidenceType: true, fileName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, jobs };
  } catch (error) {
    console.error("Get erasure jobs error:", error);
    return { success: false, error: "Failed to fetch erasure jobs" };
  }
}

export async function getErasureJobById(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const job = await prisma.erasureJob.findFirst({
      where: { id, organizationId },
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
                customer: {
                  select: { id: true, name: true, reference: true },
                },
              },
            },
          },
        },
        erasureMethod: true,
        evidence: true,
      },
    });

    if (!job) {
      return { success: false, error: "Erasure job not found" };
    }

    return { success: true, job };
  } catch (error) {
    console.error("Get erasure job by ID error:", error);
    return { success: false, error: "Failed to fetch erasure job" };
  }
}

export async function createErasureJob(data: {
  storageMediaId: string;
  erasureMethodId: string;
  assignedTechnicianUserId?: string;
  assignedTechnicianName?: string;
  toolUsed?: string;
  toolVersion?: string;
  procedureFollowed?: string;
}) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    // Verify storage media exists and belongs to organization
    const media = await prisma.storageMedia.findFirst({
      where: { id: data.storageMediaId, organizationId },
      include: { asset: true },
    });

    if (!media) {
      return { success: false, error: "Storage media not found" };
    }

    // Check media isn't already destroyed or verified
    if (media.sanitisationStatus === "DESTROYED" || media.sanitisationStatus === "VERIFIED") {
      return { success: false, error: "This media has already been sanitised" };
    }

    // Get the erasure method
    const method = await prisma.erasureMethod.findFirst({
      where: { id: data.erasureMethodId, organizationId },
    });

    if (!method) {
      return { success: false, error: "Erasure method not found" };
    }

    // Check method supports this media type
    if (!method.supportedMediaTypes.includes(media.mediaType)) {
      return {
        success: false,
        error: `This method does not support ${media.mediaType} media`,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const reference = await generateReference(organizationId, "ERJ", "erasureJob");

    const job = await prisma.$transaction(async (tx) => {
      // Create the job
      const newJob = await tx.erasureJob.create({
        data: {
          organizationId,
          reference,
          storageMediaId: data.storageMediaId,
          erasureMethodId: data.erasureMethodId,
          methodName: method.name,
          methodCode: method.code,
          methodCategory: method.category,
          toolUsed: data.toolUsed || method.toolName,
          toolVersion: data.toolVersion || method.toolVersion,
          procedureFollowed: data.procedureFollowed || method.procedureRef,
          assignedTechnicianUserId: data.assignedTechnicianUserId || userId,
          assignedTechnicianName:
            data.assignedTechnicianName || user?.name || user?.email || "Unknown",
          assignedAt: new Date(),
          supervisorApprovalRequired: method.requiresVerification,
          createdByUserId: userId,
          createdByName: user?.name || user?.email || "Unknown",
        },
      });

      // Update media status
      await tx.storageMedia.update({
        where: { id: data.storageMediaId },
        data: { sanitisationStatus: "PENDING_ERASURE" },
      });

      return newJob;
    });

    revalidatePath("/dashboard/destruction");
    revalidatePath(`/dashboard/destruction/media/${data.storageMediaId}`);

    return { success: true, job };
  } catch (error) {
    console.error("Create erasure job error:", error);
    return { success: false, error: "Failed to create erasure job" };
  }
}

export async function startErasureJob(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const job = await prisma.erasureJob.findFirst({
      where: { id, organizationId },
    });

    if (!job) {
      return { success: false, error: "Erasure job not found" };
    }

    if (job.status !== "PENDING") {
      return { success: false, error: "Job cannot be started in current state" };
    }

    await prisma.$transaction([
      prisma.erasureJob.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      }),
      prisma.storageMedia.update({
        where: { id: job.storageMediaId },
        data: { sanitisationStatus: "ERASURE_IN_PROGRESS" },
      }),
    ]);

    revalidatePath("/dashboard/destruction");
    revalidatePath(`/dashboard/destruction/jobs/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Start erasure job error:", error);
    return { success: false, error: "Failed to start erasure job" };
  }
}

export async function completeErasureJob(
  id: string,
  data: {
    outcome: "PASSED" | "FAILED" | "INCONCLUSIVE";
    executionNotes?: string;
    passCount?: number;
    failureReason?: string;
    failureCategory?: string;
    verificationStatus?: string;
    verificationMethod?: string;
    verificationResult?: string;
  }
) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const job = await prisma.erasureJob.findFirst({
      where: { id, organizationId },
      include: { erasureMethod: true },
    });

    if (!job) {
      return { success: false, error: "Erasure job not found" };
    }

    if (job.status !== "IN_PROGRESS") {
      return { success: false, error: "Job must be in progress to complete" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Determine new status based on outcome and verification requirements
    let newStatus: ErasureJobStatus;
    let mediaStatus: MediaSanitisationStatus;

    if (data.outcome === "PASSED") {
      if (job.supervisorApprovalRequired) {
        newStatus = "PENDING_VERIFICATION";
        mediaStatus = "ERASURE_PASSED"; // Will be updated to VERIFIED after supervisor approval
      } else {
        newStatus = "VERIFIED";
        mediaStatus = "VERIFIED";
      }
    } else if (data.outcome === "FAILED") {
      newStatus = "FAILED";
      mediaStatus = "ERASURE_FAILED";
    } else {
      newStatus = "INCONCLUSIVE";
      mediaStatus = "ERASURE_FAILED"; // Treat inconclusive as failed for safety
    }

    await prisma.$transaction([
      prisma.erasureJob.update({
        where: { id },
        data: {
          status: newStatus,
          completedAt: new Date(),
          outcome: data.outcome,
          executionNotes: data.executionNotes,
          passCount: data.passCount,
          failureReason: data.failureReason,
          failureCategory: data.failureCategory,
          verificationStatus: data.verificationStatus,
          verificationMethod: data.verificationMethod,
          verificationResult: data.verificationResult,
          verifiedAt: data.outcome === "PASSED" ? new Date() : undefined,
          verifiedByUserId: data.outcome === "PASSED" ? userId : undefined,
          verifiedByName: data.outcome === "PASSED" ? user?.name || user?.email : undefined,
        },
      }),
      prisma.storageMedia.update({
        where: { id: job.storageMediaId },
        data: { sanitisationStatus: mediaStatus },
      }),
    ]);

    revalidatePath("/dashboard/destruction");
    revalidatePath(`/dashboard/destruction/jobs/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Complete erasure job error:", error);
    return { success: false, error: "Failed to complete erasure job" };
  }
}

export async function approveErasureJob(id: string, notes?: string) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const job = await prisma.erasureJob.findFirst({
      where: { id, organizationId },
    });

    if (!job) {
      return { success: false, error: "Erasure job not found" };
    }

    if (job.status !== "PENDING_VERIFICATION") {
      return { success: false, error: "Job is not pending verification" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.$transaction([
      prisma.erasureJob.update({
        where: { id },
        data: {
          status: "VERIFIED",
          supervisorApprovedAt: new Date(),
          supervisorApprovedByUserId: userId,
          supervisorApprovedByName: user?.name || user?.email || "Unknown",
          supervisorNotes: notes,
        },
      }),
      prisma.storageMedia.update({
        where: { id: job.storageMediaId },
        data: {
          sanitisationStatus: "VERIFIED",
          verifiedAt: new Date(),
          verifiedByUserId: userId,
          verifiedByName: user?.name || user?.email || "Unknown",
        },
      }),
    ]);

    revalidatePath("/dashboard/destruction");
    revalidatePath(`/dashboard/destruction/jobs/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Approve erasure job error:", error);
    return { success: false, error: "Failed to approve erasure job" };
  }
}

export async function rejectErasureJob(id: string, reason: string) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const job = await prisma.erasureJob.findFirst({
      where: { id, organizationId },
    });

    if (!job) {
      return { success: false, error: "Erasure job not found" };
    }

    if (job.status !== "PENDING_VERIFICATION") {
      return { success: false, error: "Job is not pending verification" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.$transaction([
      prisma.erasureJob.update({
        where: { id },
        data: {
          status: "FAILED",
          supervisorApprovedAt: new Date(),
          supervisorApprovedByUserId: userId,
          supervisorApprovedByName: user?.name || user?.email || "Unknown",
          supervisorNotes: reason,
          failureReason: reason,
        },
      }),
      prisma.storageMedia.update({
        where: { id: job.storageMediaId },
        data: { sanitisationStatus: "ERASURE_FAILED" },
      }),
    ]);

    revalidatePath("/dashboard/destruction");
    revalidatePath(`/dashboard/destruction/jobs/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Reject erasure job error:", error);
    return { success: false, error: "Failed to reject erasure job" };
  }
}

export async function retryErasureJob(
  id: string,
  data: {
    erasureMethodId?: string;
    retryReason: string;
  }
) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const job = await prisma.erasureJob.findFirst({
      where: { id, organizationId },
      include: { erasureMethod: true },
    });

    if (!job) {
      return { success: false, error: "Erasure job not found" };
    }

    if (job.status !== "FAILED" && job.status !== "INCONCLUSIVE") {
      return { success: false, error: "Only failed jobs can be retried" };
    }

    // Get method (use new one if specified, otherwise use existing)
    const methodId = data.erasureMethodId || job.erasureMethodId;
    const method = methodId
      ? await prisma.erasureMethod.findFirst({
          where: { id: methodId, organizationId },
        })
      : null;

    if (!method) {
      return { success: false, error: "Erasure method not found" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const reference = await generateReference(organizationId, "ERJ", "erasureJob");

    const newJob = await prisma.$transaction(async (tx) => {
      // Create new retry job
      const retryJob = await tx.erasureJob.create({
        data: {
          organizationId,
          reference,
          storageMediaId: job.storageMediaId,
          erasureMethodId: method.id,
          methodName: method.name,
          methodCode: method.code,
          methodCategory: method.category,
          toolUsed: method.toolName,
          toolVersion: method.toolVersion,
          procedureFollowed: method.procedureRef,
          assignedTechnicianUserId: userId,
          assignedTechnicianName: user?.name || user?.email || "Unknown",
          assignedAt: new Date(),
          supervisorApprovalRequired: method.requiresVerification,
          previousJobId: job.id,
          retryCount: job.retryCount + 1,
          retryReason: data.retryReason,
          createdByUserId: userId,
          createdByName: user?.name || user?.email || "Unknown",
        },
      });

      // Update media status
      await tx.storageMedia.update({
        where: { id: job.storageMediaId },
        data: { sanitisationStatus: "PENDING_ERASURE" },
      });

      return retryJob;
    });

    revalidatePath("/dashboard/destruction");
    revalidatePath(`/dashboard/destruction/jobs/${id}`);

    return { success: true, job: newJob };
  } catch (error) {
    console.error("Retry erasure job error:", error);
    return { success: false, error: "Failed to retry erasure job" };
  }
}

// ============================================
// ERASURE EVIDENCE ACTIONS
// ============================================

export async function addErasureEvidence(
  jobId: string,
  data: {
    evidenceType: EvidenceType;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    fileHash?: string;
    hashAlgorithm?: string;
    description?: string;
    capturedAt?: Date;
  }
) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    // Verify job exists
    const job = await prisma.erasureJob.findFirst({
      where: { id: jobId, organizationId },
    });

    if (!job) {
      return { success: false, error: "Erasure job not found" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const evidence = await prisma.erasureEvidence.create({
      data: {
        erasureJobId: jobId,
        evidenceType: data.evidenceType,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        fileHash: data.fileHash,
        hashAlgorithm: data.hashAlgorithm,
        description: data.description,
        capturedAt: data.capturedAt,
        uploadedByUserId: userId,
        uploadedByName: user?.name || user?.email || "Unknown",
      },
    });

    revalidatePath(`/dashboard/destruction/jobs/${jobId}`);

    return { success: true, evidence };
  } catch (error) {
    console.error("Add erasure evidence error:", error);
    return { success: false, error: "Failed to add evidence" };
  }
}

// ============================================
// PHYSICAL DESTRUCTION ACTIONS
// ============================================

export async function getDestructionJobs(filters?: {
  status?: DestructionStatus;
  performedByUserId?: string;
}) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const where: {
      organizationId: string;
      status?: DestructionStatus;
      performedByUserId?: string;
    } = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.performedByUserId) where.performedByUserId = filters.performedByUserId;

    const jobs = await prisma.destructionJob.findMany({
      where,
      include: {
        storageMedia: {
          include: {
            asset: {
              select: {
                id: true,
                assetTag: true,
                customer: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        witnesses: true,
        evidence: {
          select: { id: true, evidenceType: true, fileName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, jobs };
  } catch (error) {
    console.error("Get destruction jobs error:", error);
    return { success: false, error: "Failed to fetch destruction jobs" };
  }
}

export async function getDestructionJobById(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const job = await prisma.destructionJob.findFirst({
      where: { id, organizationId },
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
                customer: {
                  select: { id: true, name: true, reference: true },
                },
              },
            },
          },
        },
        witnesses: true,
        evidence: true,
      },
    });

    if (!job) {
      return { success: false, error: "Destruction job not found" };
    }

    return { success: true, job };
  } catch (error) {
    console.error("Get destruction job by ID error:", error);
    return { success: false, error: "Failed to fetch destruction job" };
  }
}

export async function createDestructionJob(data: {
  storageMediaId: string;
  destructionReason: string;
  reasonCategory?: string;
  destructionMethod: DestructionMethod;
  methodDescription?: string;
  equipmentUsed?: string;
  scheduledDate?: Date;
  destructionLocation?: string;
  requiresWitness?: boolean;
  witnessCount?: number;
}) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    // Verify storage media exists
    const media = await prisma.storageMedia.findFirst({
      where: { id: data.storageMediaId, organizationId },
    });

    if (!media) {
      return { success: false, error: "Storage media not found" };
    }

    // Check if media already has a destruction job
    const existingJob = await prisma.destructionJob.findFirst({
      where: { storageMediaId: data.storageMediaId },
    });

    if (existingJob) {
      return { success: false, error: "This media already has a destruction job" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const reference = await generateReference(organizationId, "DST", "destructionJob");

    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.destructionJob.create({
        data: {
          organizationId,
          reference,
          storageMediaId: data.storageMediaId,
          destructionReason: data.destructionReason,
          reasonCategory: data.reasonCategory,
          destructionMethod: data.destructionMethod,
          methodDescription: data.methodDescription,
          equipmentUsed: data.equipmentUsed,
          scheduledDate: data.scheduledDate,
          scheduledByUserId: userId,
          scheduledByName: user?.name || user?.email || "Unknown",
          destructionLocation: data.destructionLocation,
          requiresWitness: data.requiresWitness ?? true,
          witnessCount: data.witnessCount ?? 1,
          createdByUserId: userId,
          createdByName: user?.name || user?.email || "Unknown",
        },
      });

      await tx.storageMedia.update({
        where: { id: data.storageMediaId },
        data: { sanitisationStatus: "PENDING_DESTRUCTION" },
      });

      return newJob;
    });

    revalidatePath("/dashboard/destruction");
    revalidatePath(`/dashboard/destruction/media/${data.storageMediaId}`);

    return { success: true, job };
  } catch (error) {
    console.error("Create destruction job error:", error);
    return { success: false, error: "Failed to create destruction job" };
  }
}

export async function startDestructionJob(id: string) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const job = await prisma.destructionJob.findFirst({
      where: { id, organizationId },
    });

    if (!job) {
      return { success: false, error: "Destruction job not found" };
    }

    if (job.status !== "SCHEDULED") {
      return { success: false, error: "Job cannot be started in current state" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.$transaction([
      prisma.destructionJob.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          performedByUserId: userId,
          performedByName: user?.name || user?.email || "Unknown",
        },
      }),
      prisma.storageMedia.update({
        where: { id: job.storageMediaId },
        data: { sanitisationStatus: "DESTRUCTION_IN_PROGRESS" },
      }),
    ]);

    revalidatePath("/dashboard/destruction");
    revalidatePath(`/dashboard/destruction/physical/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Start destruction job error:", error);
    return { success: false, error: "Failed to start destruction job" };
  }
}

export async function completeDestructionJob(
  id: string,
  data: {
    executionNotes?: string;
    serialNumberConfirmed: boolean;
  }
) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const job = await prisma.destructionJob.findFirst({
      where: { id, organizationId },
      include: { witnesses: true },
    });

    if (!job) {
      return { success: false, error: "Destruction job not found" };
    }

    if (job.status !== "IN_PROGRESS") {
      return { success: false, error: "Job must be in progress to complete" };
    }

    // Check witness requirements
    if (job.requiresWitness) {
      const confirmedWitnesses = job.witnesses.filter((w) => w.confirmedAt);
      if (confirmedWitnesses.length < job.witnessCount) {
        return {
          success: false,
          error: `${job.witnessCount} witness(es) must confirm destruction before completion`,
        };
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.$transaction([
      prisma.destructionJob.update({
        where: { id },
        data: {
          status: "PENDING_VERIFICATION",
          completedAt: new Date(),
          executionNotes: data.executionNotes,
          serialNumberConfirmed: data.serialNumberConfirmed,
          serialConfirmedAt: data.serialNumberConfirmed ? new Date() : undefined,
          serialConfirmedByUserId: data.serialNumberConfirmed ? userId : undefined,
          serialConfirmedByName: data.serialNumberConfirmed
            ? user?.name || user?.email
            : undefined,
        },
      }),
      prisma.storageMedia.update({
        where: { id: job.storageMediaId },
        data: { sanitisationStatus: "DESTROYED" },
      }),
    ]);

    revalidatePath("/dashboard/destruction");
    revalidatePath(`/dashboard/destruction/physical/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Complete destruction job error:", error);
    return { success: false, error: "Failed to complete destruction job" };
  }
}

export async function verifyDestructionJob(id: string, notes?: string) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const job = await prisma.destructionJob.findFirst({
      where: { id, organizationId },
    });

    if (!job) {
      return { success: false, error: "Destruction job not found" };
    }

    if (job.status !== "PENDING_VERIFICATION") {
      return { success: false, error: "Job is not pending verification" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await prisma.$transaction([
      prisma.destructionJob.update({
        where: { id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedByUserId: userId,
          verifiedByName: user?.name || user?.email || "Unknown",
          verificationNotes: notes,
        },
      }),
      prisma.storageMedia.update({
        where: { id: job.storageMediaId },
        data: {
          sanitisationStatus: "VERIFIED",
          verifiedAt: new Date(),
          verifiedByUserId: userId,
          verifiedByName: user?.name || user?.email || "Unknown",
          verificationNotes: notes,
        },
      }),
    ]);

    revalidatePath("/dashboard/destruction");
    revalidatePath(`/dashboard/destruction/physical/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Verify destruction job error:", error);
    return { success: false, error: "Failed to verify destruction job" };
  }
}

// ============================================
// WITNESS ACTIONS
// ============================================

export async function addDestructionWitness(
  jobId: string,
  data: {
    witnessUserId?: string;
    witnessName: string;
    witnessRole?: string;
    witnessEmail?: string;
  }
) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const job = await prisma.destructionJob.findFirst({
      where: { id: jobId, organizationId },
    });

    if (!job) {
      return { success: false, error: "Destruction job not found" };
    }

    const witness = await prisma.destructionWitness.create({
      data: {
        destructionJobId: jobId,
        witnessUserId: data.witnessUserId,
        witnessName: data.witnessName,
        witnessRole: data.witnessRole,
        witnessEmail: data.witnessEmail,
      },
    });

    revalidatePath(`/dashboard/destruction/physical/${jobId}`);

    return { success: true, witness };
  } catch (error) {
    console.error("Add destruction witness error:", error);
    return { success: false, error: "Failed to add witness" };
  }
}

export async function confirmWitness(
  witnessId: string,
  data: {
    signatureData?: string;
    witnessStatement?: string;
  }
) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const witness = await prisma.destructionWitness.findFirst({
      where: { id: witnessId },
      include: {
        destructionJob: {
          select: { organizationId: true },
        },
      },
    });

    if (!witness || witness.destructionJob.organizationId !== organizationId) {
      return { success: false, error: "Witness record not found" };
    }

    // Verify the user is the assigned witness (if witness has userId)
    if (witness.witnessUserId && witness.witnessUserId !== userId) {
      return { success: false, error: "You are not authorized to confirm this witness record" };
    }

    await prisma.destructionWitness.update({
      where: { id: witnessId },
      data: {
        confirmedAt: new Date(),
        signatureData: data.signatureData,
        witnessStatement: data.witnessStatement,
      },
    });

    revalidatePath(`/dashboard/destruction/physical/${witness.destructionJobId}`);

    return { success: true };
  } catch (error) {
    console.error("Confirm witness error:", error);
    return { success: false, error: "Failed to confirm witness" };
  }
}

// ============================================
// DESTRUCTION EVIDENCE ACTIONS
// ============================================

export async function addDestructionEvidence(
  jobId: string,
  data: {
    evidenceType: EvidenceType;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    fileHash?: string;
    hashAlgorithm?: string;
    description?: string;
    capturedAt?: Date;
  }
) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const job = await prisma.destructionJob.findFirst({
      where: { id: jobId, organizationId },
    });

    if (!job) {
      return { success: false, error: "Destruction job not found" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const evidence = await prisma.destructionEvidence.create({
      data: {
        destructionJobId: jobId,
        evidenceType: data.evidenceType,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        fileHash: data.fileHash,
        hashAlgorithm: data.hashAlgorithm,
        description: data.description,
        capturedAt: data.capturedAt,
        uploadedByUserId: userId,
        uploadedByName: user?.name || user?.email || "Unknown",
      },
    });

    revalidatePath(`/dashboard/destruction/physical/${jobId}`);

    return { success: true, evidence };
  } catch (error) {
    console.error("Add destruction evidence error:", error);
    return { success: false, error: "Failed to add evidence" };
  }
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDestructionStats() {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const [
      totalMedia,
      pendingErasure,
      erasureInProgress,
      pendingDestruction,
      verified,
      pendingJobs,
      activeJobs,
      pendingVerification,
    ] = await Promise.all([
      prisma.storageMedia.count({ where: { organizationId } }),
      prisma.storageMedia.count({
        where: { organizationId, sanitisationStatus: "PENDING_ERASURE" },
      }),
      prisma.storageMedia.count({
        where: { organizationId, sanitisationStatus: "ERASURE_IN_PROGRESS" },
      }),
      prisma.storageMedia.count({
        where: { organizationId, sanitisationStatus: "PENDING_DESTRUCTION" },
      }),
      prisma.storageMedia.count({
        where: { organizationId, sanitisationStatus: "VERIFIED" },
      }),
      prisma.erasureJob.count({
        where: { organizationId, status: "PENDING" },
      }),
      prisma.erasureJob.count({
        where: { organizationId, status: "IN_PROGRESS" },
      }),
      prisma.erasureJob.count({
        where: { organizationId, status: "PENDING_VERIFICATION" },
      }),
    ]);

    return {
      success: true,
      stats: {
        totalMedia,
        pendingErasure,
        erasureInProgress,
        pendingDestruction,
        verified,
        pendingJobs,
        activeJobs,
        pendingVerification,
      },
    };
  } catch (error) {
    console.error("Get destruction stats error:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}

// ============================================
// SEED DEFAULT ERASURE METHODS
// ============================================

export async function seedDefaultErasureMethods() {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const defaultMethods = [
      {
        name: "NIST 800-88 Clear",
        code: "NIST-CLEAR",
        description:
          "Logical techniques to sanitize data in user-addressable storage locations. Protects against simple, non-invasive data recovery.",
        category: "CLEAR" as ErasureMethodCategory,
        supportedMediaTypes: ["HDD", "SSD", "NVME", "USB", "MEMORY_CARD"] as MediaType[],
        complianceStandards: ["NIST 800-88"],
        verificationMethod: "Read verification of all sectors",
        verificationCriteria: "All sectors must read as zeros or random data",
        requiredEvidenceTypes: ["LOG_FILE", "REPORT"] as EvidenceType[],
        sortOrder: 1,
      },
      {
        name: "NIST 800-88 Purge",
        code: "NIST-PURGE",
        description:
          "Physical or logical techniques that render data recovery infeasible using state-of-the-art laboratory techniques.",
        category: "PURGE" as ErasureMethodCategory,
        supportedMediaTypes: ["HDD", "SSD", "NVME"] as MediaType[],
        complianceStandards: ["NIST 800-88"],
        verificationMethod: "Read verification plus forensic sampling",
        verificationCriteria: "No recoverable data using forensic tools",
        requiredEvidenceTypes: ["LOG_FILE", "REPORT", "HASH_VERIFICATION"] as EvidenceType[],
        sortOrder: 2,
      },
      {
        name: "DoD 5220.22-M (3-pass)",
        code: "DOD-3PASS",
        description:
          "Department of Defense standard three-pass overwrite method. Pass 1: zeros, Pass 2: ones, Pass 3: random data with verification.",
        category: "PURGE" as ErasureMethodCategory,
        supportedMediaTypes: ["HDD"] as MediaType[],
        complianceStandards: ["DoD 5220.22-M"],
        toolName: "DBAN",
        verificationMethod: "Read verification of all sectors after final pass",
        verificationCriteria: "All sectors verified with no read errors",
        requiredEvidenceTypes: ["LOG_FILE", "SCREENSHOT"] as EvidenceType[],
        sortOrder: 3,
      },
      {
        name: "Cryptographic Erase (SED)",
        code: "CRYPTO-SED",
        description:
          "Sanitization achieved by destroying the encryption key on self-encrypting drives (SED). Renders all data unreadable instantaneously.",
        category: "CRYPTO_ERASE" as ErasureMethodCategory,
        supportedMediaTypes: ["SSD", "NVME"] as MediaType[],
        complianceStandards: ["NIST 800-88", "IEEE 2883"],
        verificationMethod: "Verify key destruction confirmation from drive",
        verificationCriteria: "Drive reports successful key destruction",
        requiredEvidenceTypes: ["LOG_FILE", "SERIAL_CONFIRMATION"] as EvidenceType[],
        sortOrder: 4,
      },
      {
        name: "ATA Secure Erase",
        code: "ATA-SE",
        description:
          "Built-in ATA command that instructs the drive to overwrite all user data areas. Supported by most HDDs and SSDs.",
        category: "SECURE_ERASE" as ErasureMethodCategory,
        supportedMediaTypes: ["HDD", "SSD"] as MediaType[],
        toolName: "hdparm",
        verificationMethod: "Read verification plus drive status check",
        verificationCriteria: "Drive reports successful completion",
        requiredEvidenceTypes: ["LOG_FILE"] as EvidenceType[],
        sortOrder: 5,
      },
      {
        name: "NVMe Sanitize Block Erase",
        code: "NVME-SANITIZE",
        description:
          "NVMe Sanitize command with Block Erase option. Erases all user data and returns drive to factory state.",
        category: "SANITIZE" as ErasureMethodCategory,
        supportedMediaTypes: ["NVME"] as MediaType[],
        complianceStandards: ["NVMe Specification"],
        verificationMethod: "Check sanitize operation status",
        verificationCriteria: "Sanitize operation completed successfully",
        requiredEvidenceTypes: ["LOG_FILE", "SERIAL_CONFIRMATION"] as EvidenceType[],
        sortOrder: 6,
      },
      {
        name: "Degaussing",
        code: "DEGAUSS",
        description:
          "Applies a strong magnetic field to neutralize data on magnetic media. Renders the drive permanently unusable.",
        category: "DEGAUSS" as ErasureMethodCategory,
        supportedMediaTypes: ["HDD", "TAPE"] as MediaType[],
        complianceStandards: ["NSA EPL", "NIST 800-88"],
        verificationMethod: "Visual inspection and functional test",
        verificationCriteria: "Drive fails to initialize, no magnetic signal detected",
        requiredEvidenceTypes: ["PHOTO", "SERIAL_CONFIRMATION"] as EvidenceType[],
        sortOrder: 7,
      },
    ];

    let created = 0;
    for (const method of defaultMethods) {
      const existing = await prisma.erasureMethod.findFirst({
        where: { organizationId, code: method.code },
      });

      if (!existing) {
        await prisma.erasureMethod.create({
          data: {
            organizationId,
            ...method,
            requiresEvidence: true,
            requiresVerification: true,
            createdByUserId: userId,
            createdByName: user?.name || user?.email || "System",
          },
        });
        created++;
      }
    }

    revalidatePath("/dashboard/destruction/methods");

    return {
      success: true,
      message: `Created ${created} default erasure methods`,
    };
  } catch (error) {
    console.error("Seed default erasure methods error:", error);
    return { success: false, error: "Failed to seed default methods" };
  }
}

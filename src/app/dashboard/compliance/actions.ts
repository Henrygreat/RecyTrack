"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMember, STAFF_ROLES, MANAGEMENT_ROLES } from "@/lib/access";
import type {
  CompliancePolicyStatus,
  ComplianceExceptionSeverity,
  ComplianceExceptionStatus,
  ComplianceExceptionCategory,
  AuditStatus,
  AuditFindingSeverity,
  AuditFindingStatus,
} from "@prisma/client";

// ============================================
// REFERENCE GENERATION
// ============================================

async function generateReference(
  organizationId: string,
  prefix: string,
  model: "compliancePolicy" | "complianceException" | "complianceAudit"
): Promise<string> {
  let count: number;

  switch (model) {
    case "compliancePolicy":
      count = await prisma.compliancePolicy.count({ where: { organizationId } });
      break;
    case "complianceException":
      count = await prisma.complianceException.count({ where: { organizationId } });
      break;
    case "complianceAudit":
      count = await prisma.complianceAudit.count({ where: { organizationId } });
      break;
  }

  const num = count + 1;
  return `${prefix}-${String(num).padStart(6, "0")}`;
}

// ============================================
// COMPLIANCE POLICY ACTIONS
// ============================================

export async function getPolicies(filters?: {
  status?: CompliancePolicyStatus;
  search?: string;
}) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const where: {
      organizationId: string;
      status?: CompliancePolicyStatus;
      OR?: Array<{
        title?: { contains: string; mode: "insensitive" };
        reference?: { contains: string; mode: "insensitive" };
      }>;
    } = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { reference: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const policies = await prisma.compliancePolicy.findMany({
      where,
      orderBy: [{ status: "asc" }, { effectiveDate: "desc" }],
    });

    return { success: true, policies };
  } catch (error) {
    console.error("Get policies error:", error);
    return { success: false, error: "Failed to fetch policies" };
  }
}

export async function getPolicyById(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const policy = await prisma.compliancePolicy.findFirst({
      where: { id, organizationId },
    });

    if (!policy) {
      return { success: false, error: "Policy not found" };
    }

    return { success: true, policy };
  } catch (error) {
    console.error("Get policy error:", error);
    return { success: false, error: "Failed to fetch policy" };
  }
}

export async function createPolicy(data: {
  title: string;
  description?: string;
  effectiveDate?: Date;
  reviewDate?: Date;
  policyContent?: string;
  documentUrl?: string;
  approvedErasureMethods?: string[];
  approvedDestructionMethods?: string[];
  complianceStandards?: string[];
}) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const reference = await generateReference(organizationId, "POL", "compliancePolicy");

    const policy = await prisma.compliancePolicy.create({
      data: {
        organizationId,
        reference,
        title: data.title,
        description: data.description,
        effectiveDate: data.effectiveDate,
        reviewDate: data.reviewDate,
        policyContent: data.policyContent,
        documentUrl: data.documentUrl,
        approvedErasureMethods: data.approvedErasureMethods || [],
        approvedDestructionMethods: data.approvedDestructionMethods || [],
        complianceStandards: data.complianceStandards || [],
        ownerUserId: userId,
        ownerName: user?.name || user?.email || "Unknown",
        createdByUserId: userId,
        createdByName: user?.name || user?.email || "Unknown",
      },
    });

    revalidatePath("/dashboard/compliance/policies");

    return { success: true, policy };
  } catch (error) {
    console.error("Create policy error:", error);
    return { success: false, error: "Failed to create policy" };
  }
}

export async function updatePolicy(
  id: string,
  data: {
    title?: string;
    description?: string;
    effectiveDate?: Date;
    reviewDate?: Date;
    policyContent?: string;
    documentUrl?: string;
    approvedErasureMethods?: string[];
    approvedDestructionMethods?: string[];
    complianceStandards?: string[];
  }
) {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const existing = await prisma.compliancePolicy.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { success: false, error: "Policy not found" };
    }

    if (existing.status !== "DRAFT") {
      return { success: false, error: "Only draft policies can be edited" };
    }

    const policy = await prisma.compliancePolicy.update({
      where: { id },
      data,
    });

    revalidatePath("/dashboard/compliance/policies");
    revalidatePath(`/dashboard/compliance/policies/${id}`);

    return { success: true, policy };
  } catch (error) {
    console.error("Update policy error:", error);
    return { success: false, error: "Failed to update policy" };
  }
}

export async function approvePolicy(id: string) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const existing = await prisma.compliancePolicy.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { success: false, error: "Policy not found" };
    }

    if (existing.status !== "DRAFT" && existing.status !== "PENDING_APPROVAL") {
      return { success: false, error: "Policy cannot be approved in current status" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const policy = await prisma.compliancePolicy.update({
      where: { id },
      data: {
        status: "ACTIVE",
        approvedAt: new Date(),
        approvedByUserId: userId,
        approvedByName: user?.name || user?.email || "Unknown",
      },
    });

    revalidatePath("/dashboard/compliance/policies");

    return { success: true, policy };
  } catch (error) {
    console.error("Approve policy error:", error);
    return { success: false, error: "Failed to approve policy" };
  }
}

export async function archivePolicy(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const existing = await prisma.compliancePolicy.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { success: false, error: "Policy not found" };
    }

    const policy = await prisma.compliancePolicy.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    revalidatePath("/dashboard/compliance/policies");

    return { success: true, policy };
  } catch (error) {
    console.error("Archive policy error:", error);
    return { success: false, error: "Failed to archive policy" };
  }
}

// ============================================
// COMPLIANCE EXCEPTION ACTIONS
// ============================================

export async function getExceptions(filters?: {
  status?: ComplianceExceptionStatus;
  severity?: ComplianceExceptionSeverity;
  category?: ComplianceExceptionCategory;
  assignedToUserId?: string;
}) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const where: {
      organizationId: string;
      status?: ComplianceExceptionStatus;
      severity?: ComplianceExceptionSeverity;
      category?: ComplianceExceptionCategory;
      assignedToUserId?: string;
    } = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.category) where.category = filters.category;
    if (filters?.assignedToUserId) where.assignedToUserId = filters.assignedToUserId;

    const exceptions = await prisma.complianceException.findMany({
      where,
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });

    return { success: true, exceptions };
  } catch (error) {
    console.error("Get exceptions error:", error);
    return { success: false, error: "Failed to fetch exceptions" };
  }
}

export async function getExceptionById(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const exception = await prisma.complianceException.findFirst({
      where: { id, organizationId },
    });

    if (!exception) {
      return { success: false, error: "Exception not found" };
    }

    return { success: true, exception };
  } catch (error) {
    console.error("Get exception error:", error);
    return { success: false, error: "Failed to fetch exception" };
  }
}

export async function createException(data: {
  title: string;
  description: string;
  category: ComplianceExceptionCategory;
  severity: ComplianceExceptionSeverity;
  assetId?: string;
  storageMediaId?: string;
  erasureJobId?: string;
  destructionJobId?: string;
  customerId?: string;
  isBlocking?: boolean;
  assignedToUserId?: string;
  assignedToName?: string;
  correctiveActionDue?: Date;
}) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const reference = await generateReference(organizationId, "CEX", "complianceException");

    const exception = await prisma.complianceException.create({
      data: {
        organizationId,
        reference,
        title: data.title,
        description: data.description,
        category: data.category,
        severity: data.severity,
        assetId: data.assetId,
        storageMediaId: data.storageMediaId,
        erasureJobId: data.erasureJobId,
        destructionJobId: data.destructionJobId,
        customerId: data.customerId,
        isBlocking: data.isBlocking ?? false,
        assignedToUserId: data.assignedToUserId,
        assignedToName: data.assignedToName,
        correctiveActionDue: data.correctiveActionDue,
        detectedByUserId: userId,
        detectedByName: user?.name || user?.email || "Unknown",
      },
    });

    revalidatePath("/dashboard/compliance/exceptions");

    return { success: true, exception };
  } catch (error) {
    console.error("Create exception error:", error);
    return { success: false, error: "Failed to create exception" };
  }
}

export async function updateExceptionStatus(
  id: string,
  data: {
    status: ComplianceExceptionStatus;
    investigationNotes?: string;
    correctiveAction?: string;
    correctiveActionTaken?: string;
    resolutionNotes?: string;
  }
) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const existing = await prisma.complianceException.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { success: false, error: "Exception not found" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const updateData: Record<string, unknown> = {
      status: data.status,
    };

    if (data.investigationNotes) {
      updateData.investigationNotes = data.investigationNotes;
      updateData.investigatedByUserId = userId;
      updateData.investigatedByName = user?.name || user?.email;
    }

    if (data.correctiveAction) {
      updateData.correctiveAction = data.correctiveAction;
    }

    if (data.correctiveActionTaken) {
      updateData.correctiveActionTaken = data.correctiveActionTaken;
      updateData.correctiveCompletedAt = new Date();
    }

    if (data.status === "RESOLVED" || data.status === "CLOSED") {
      updateData.resolutionNotes = data.resolutionNotes;
      updateData.resolvedByUserId = userId;
      updateData.resolvedByName = user?.name || user?.email;
      updateData.resolvedAt = new Date();
    }

    if (data.status === "ESCALATED") {
      updateData.escalatedAt = new Date();
    }

    const exception = await prisma.complianceException.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/dashboard/compliance/exceptions");
    revalidatePath(`/dashboard/compliance/exceptions/${id}`);

    return { success: true, exception };
  } catch (error) {
    console.error("Update exception error:", error);
    return { success: false, error: "Failed to update exception" };
  }
}

// ============================================
// COMPLIANCE AUDIT ACTIONS
// ============================================

export async function getAudits(filters?: {
  status?: AuditStatus;
  customerId?: string;
}) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const where: {
      organizationId: string;
      status?: AuditStatus;
      customerId?: string;
    } = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;

    const audits = await prisma.complianceAudit.findMany({
      where,
      include: {
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, audits };
  } catch (error) {
    console.error("Get audits error:", error);
    return { success: false, error: "Failed to fetch audits" };
  }
}

export async function getAuditById(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const audit = await prisma.complianceAudit.findFirst({
      where: { id, organizationId },
      include: {
        findings: {
          orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!audit) {
      return { success: false, error: "Audit not found" };
    }

    return { success: true, audit };
  } catch (error) {
    console.error("Get audit error:", error);
    return { success: false, error: "Failed to fetch audit" };
  }
}

export async function createAudit(data: {
  title: string;
  description?: string;
  auditType?: string;
  scope?: string;
  customerId?: string;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  auditorName?: string;
  auditorEmail?: string;
  externalAuditor?: boolean;
  auditorOrganization?: string;
}) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const reference = await generateReference(organizationId, "AUD", "complianceAudit");

    const audit = await prisma.complianceAudit.create({
      data: {
        organizationId,
        reference,
        title: data.title,
        description: data.description,
        auditType: data.auditType,
        scope: data.scope,
        customerId: data.customerId,
        plannedStartDate: data.plannedStartDate,
        plannedEndDate: data.plannedEndDate,
        auditorUserId: data.externalAuditor ? null : userId,
        auditorName: data.auditorName || user?.name || user?.email,
        auditorEmail: data.auditorEmail,
        externalAuditor: data.externalAuditor ?? false,
        auditorOrganization: data.auditorOrganization,
        createdByUserId: userId,
        createdByName: user?.name || user?.email || "Unknown",
      },
    });

    revalidatePath("/dashboard/compliance/audits");

    return { success: true, audit };
  } catch (error) {
    console.error("Create audit error:", error);
    return { success: false, error: "Failed to create audit" };
  }
}

export async function startAudit(id: string) {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const existing = await prisma.complianceAudit.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { success: false, error: "Audit not found" };
    }

    if (existing.status !== "PLANNED") {
      return { success: false, error: "Audit cannot be started in current status" };
    }

    const audit = await prisma.complianceAudit.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        actualStartDate: new Date(),
      },
    });

    revalidatePath("/dashboard/compliance/audits");

    return { success: true, audit };
  } catch (error) {
    console.error("Start audit error:", error);
    return { success: false, error: "Failed to start audit" };
  }
}

export async function addAuditFinding(
  auditId: string,
  data: {
    title: string;
    description: string;
    severity: AuditFindingSeverity;
    area?: string;
    requirement?: string;
    correctiveActionRequired?: string;
    correctiveActionDue?: Date;
  }
) {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const audit = await prisma.complianceAudit.findFirst({
      where: { id: auditId, organizationId },
      include: { _count: { select: { findings: true } } },
    });

    if (!audit) {
      return { success: false, error: "Audit not found" };
    }

    const findingNum = audit._count.findings + 1;
    const reference = `F${String(findingNum).padStart(3, "0")}`;

    const finding = await prisma.$transaction(async (tx) => {
      const newFinding = await tx.auditFinding.create({
        data: {
          auditId,
          reference,
          title: data.title,
          description: data.description,
          severity: data.severity,
          area: data.area,
          requirement: data.requirement,
          correctiveActionRequired: data.correctiveActionRequired,
          correctiveActionDue: data.correctiveActionDue,
        },
      });

      // Update audit finding counts
      const counts = {
        totalFindings: audit.totalFindings + 1,
        criticalFindings: audit.criticalFindings + (data.severity === "CRITICAL" ? 1 : 0),
        majorFindings: audit.majorFindings + (data.severity === "MAJOR" ? 1 : 0),
        minorFindings: audit.minorFindings + (data.severity === "MINOR" ? 1 : 0),
        observations: audit.observations + (data.severity === "OBSERVATION" ? 1 : 0),
      };

      await tx.complianceAudit.update({
        where: { id: auditId },
        data: counts,
      });

      return newFinding;
    });

    revalidatePath(`/dashboard/compliance/audits/${auditId}`);

    return { success: true, finding };
  } catch (error) {
    console.error("Add finding error:", error);
    return { success: false, error: "Failed to add finding" };
  }
}

export async function updateFindingStatus(
  findingId: string,
  data: {
    status: AuditFindingStatus;
    correctiveActionTaken?: string;
    verificationNotes?: string;
    closureNotes?: string;
  }
) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const finding = await prisma.auditFinding.findFirst({
      where: { id: findingId },
      include: { audit: { select: { organizationId: true } } },
    });

    if (!finding || finding.audit.organizationId !== organizationId) {
      return { success: false, error: "Finding not found" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const updateData: Record<string, unknown> = {
      status: data.status,
    };

    if (data.correctiveActionTaken) {
      updateData.correctiveActionTaken = data.correctiveActionTaken;
      updateData.actionTakenByUserId = userId;
      updateData.actionTakenByName = user?.name || user?.email;
      updateData.actionTakenAt = new Date();
    }

    if (data.status === "PENDING_VERIFICATION") {
      updateData.verificationNotes = data.verificationNotes;
    }

    if (data.status === "CLOSED") {
      updateData.closureNotes = data.closureNotes;
      updateData.closedByUserId = userId;
      updateData.closedByName = user?.name || user?.email;
      updateData.closedAt = new Date();
    }

    const updatedFinding = await prisma.auditFinding.update({
      where: { id: findingId },
      data: updateData,
    });

    revalidatePath(`/dashboard/compliance/audits/${finding.auditId}`);

    return { success: true, finding: updatedFinding };
  } catch (error) {
    console.error("Update finding error:", error);
    return { success: false, error: "Failed to update finding" };
  }
}

export async function completeAudit(id: string, reviewNotes?: string) {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const existing = await prisma.complianceAudit.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { success: false, error: "Audit not found" };
    }

    if (existing.status !== "IN_PROGRESS") {
      return { success: false, error: "Audit cannot be completed in current status" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const audit = await prisma.complianceAudit.update({
      where: { id },
      data: {
        status: "COMPLETED",
        actualEndDate: new Date(),
        reviewedByUserId: userId,
        reviewedByName: user?.name || user?.email,
        reviewedAt: new Date(),
        reviewNotes,
        closedByUserId: userId,
        closedByName: user?.name || user?.email,
        closedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/compliance/audits");

    return { success: true, audit };
  } catch (error) {
    console.error("Complete audit error:", error);
    return { success: false, error: "Failed to complete audit" };
  }
}

// ============================================
// COMPLIANCE EVIDENCE ACTIONS
// ============================================

export async function getEvidence(filters?: {
  category?: string;
  storageMediaId?: string;
  erasureJobId?: string;
  destructionJobId?: string;
  certificateId?: string;
}) {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const where: {
      organizationId: string;
      category?: string;
      storageMediaId?: string;
      erasureJobId?: string;
      destructionJobId?: string;
      certificateId?: string;
    } = { organizationId };

    if (filters?.category) where.category = filters.category;
    if (filters?.storageMediaId) where.storageMediaId = filters.storageMediaId;
    if (filters?.erasureJobId) where.erasureJobId = filters.erasureJobId;
    if (filters?.destructionJobId) where.destructionJobId = filters.destructionJobId;
    if (filters?.certificateId) where.certificateId = filters.certificateId;

    const evidence = await prisma.complianceEvidence.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
    });

    return { success: true, evidence };
  } catch (error) {
    console.error("Get evidence error:", error);
    return { success: false, error: "Failed to fetch evidence" };
  }
}

export async function addEvidence(data: {
  category: string;
  title: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  fileHash?: string;
  storageMediaId?: string;
  erasureJobId?: string;
  destructionJobId?: string;
  certificateId?: string;
  auditId?: string;
  policyId?: string;
  exceptionId?: string;
  isRestricted?: boolean;
  accessLevel?: string;
  retentionYears?: number;
}) {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const evidence = await prisma.complianceEvidence.create({
      data: {
        organizationId,
        category: data.category,
        title: data.title,
        description: data.description,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        fileHash: data.fileHash,
        hashAlgorithm: data.fileHash ? "SHA-256" : undefined,
        storageMediaId: data.storageMediaId,
        erasureJobId: data.erasureJobId,
        destructionJobId: data.destructionJobId,
        certificateId: data.certificateId,
        auditId: data.auditId,
        policyId: data.policyId,
        exceptionId: data.exceptionId,
        isRestricted: data.isRestricted ?? false,
        accessLevel: data.accessLevel,
        retentionYears: data.retentionYears,
        expiresAt: data.retentionYears
          ? new Date(Date.now() + data.retentionYears * 365 * 24 * 60 * 60 * 1000)
          : undefined,
        uploadedByUserId: userId,
        uploadedByName: user?.name || user?.email || "Unknown",
      },
    });

    revalidatePath("/dashboard/compliance/evidence");

    return { success: true, evidence };
  } catch (error) {
    console.error("Add evidence error:", error);
    return { success: false, error: "Failed to add evidence" };
  }
}

// ============================================
// COMPLIANCE DASHBOARD STATS
// ============================================

export async function getComplianceStats() {
  try {
    const { organizationId } = await requireMember(undefined, STAFF_ROLES);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalCertificates,
      pendingApprovalCerts,
      revokedCerts,
      failedErasures,
      openExceptions,
      criticalExceptions,
      overdueActions,
      upcomingPolicyReviews,
      activeAudits,
      openFindings,
    ] = await Promise.all([
      prisma.certificate.count({ where: { organizationId, status: "ISSUED" } }),
      prisma.certificate.count({ where: { organizationId, status: "PENDING_APPROVAL" } }),
      prisma.certificate.count({ where: { organizationId, status: "REVOKED" } }),
      prisma.erasureJob.count({ where: { organizationId, status: "FAILED" } }),
      prisma.complianceException.count({
        where: { organizationId, status: { in: ["OPEN", "INVESTIGATING", "PENDING_ACTION"] } },
      }),
      prisma.complianceException.count({
        where: { organizationId, severity: "CRITICAL", status: { in: ["OPEN", "INVESTIGATING"] } },
      }),
      prisma.complianceException.count({
        where: {
          organizationId,
          status: { in: ["OPEN", "PENDING_ACTION"] },
          correctiveActionDue: { lt: now },
        },
      }),
      prisma.compliancePolicy.count({
        where: {
          organizationId,
          status: "ACTIVE",
          reviewDate: { lte: thirtyDaysFromNow },
        },
      }),
      prisma.complianceAudit.count({
        where: { organizationId, status: "IN_PROGRESS" },
      }),
      prisma.auditFinding.count({
        where: {
          audit: { organizationId },
          status: { in: ["OPEN", "CORRECTIVE_ACTION_REQUIRED", "ACTION_IN_PROGRESS"] },
        },
      }),
    ]);

    return {
      success: true,
      stats: {
        totalCertificates,
        pendingApprovalCerts,
        revokedCerts,
        failedErasures,
        openExceptions,
        criticalExceptions,
        overdueActions,
        upcomingPolicyReviews,
        activeAudits,
        openFindings,
      },
    };
  } catch (error) {
    console.error("Get compliance stats error:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}

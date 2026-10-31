"use server";

import { prisma } from "@/lib/prisma";
import { requireMember, MANAGEMENT_ROLES, STAFF_ROLES } from "@/lib/access";
import { revalidatePath } from "next/cache";
import {
  inspectionSchema,
  inspectionUpdateSchema,
  inspectionTemplateSchema,
  inspectionTemplateItemSchema,
} from "@/lib/validation";
import { Prisma } from "@prisma/client";
import type { InspectionStatus, ConditionGrade } from "@prisma/client";

// ============================================
// TYPES
// ============================================

export type InspectionActionState = {
  error?: string;
  success?: boolean;
  inspectionId?: string;
  reference?: string;
};

export type TemplateActionState = {
  error?: string;
  success?: boolean;
  templateId?: string;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function generateInspectionReference(organizationId: string): Promise<string> {
  const lastInspection = await prisma.inspection.findFirst({
    where: { organizationId },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });

  if (!lastInspection?.reference) {
    return "INS-000001";
  }

  const match = lastInspection.reference.match(/INS-(\d+)/);
  if (!match) {
    return "INS-000001";
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `INS-${nextNum.toString().padStart(6, "0")}`;
}

// ============================================
// INSPECTION TEMPLATE ACTIONS
// ============================================

export async function createInspectionTemplate(
  _prevState: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const rawData = Object.fromEntries(formData);
    const parsed = inspectionTemplateSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    // Check for existing template with same name
    const existing = await prisma.inspectionTemplate.findFirst({
      where: {
        organizationId,
        name: data.name,
        isActive: true,
      },
    });

    const version = existing ? existing.version + 1 : 1;

    const template = await prisma.$transaction(async (tx) => {
      // Deactivate previous version if exists
      if (existing) {
        await tx.inspectionTemplate.update({
          where: { id: existing.id },
          data: { isActive: false },
        });
      }

      const t = await tx.inspectionTemplate.create({
        data: {
          organizationId,
          name: data.name,
          description: data.description || null,
          category: data.category,
          version,
          isActive: true,
          createdByUserId: userId,
          createdByName: user?.name || user?.email || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "INSPECTION_TEMPLATE_CREATED",
          entityType: "InspectionTemplate",
          entityId: t.id,
          details: { name: t.name, category: t.category, version },
        },
      });

      return t;
    });

    revalidatePath("/dashboard/inspections/templates");
    return { success: true, templateId: template.id };
  } catch (error) {
    console.error("Create inspection template error:", error);
    return { error: "Failed to create inspection template. Please try again." };
  }
}

export async function addTemplateItem(
  _prevState: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = inspectionTemplateItemSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    // Verify template exists and belongs to organization
    const template = await prisma.inspectionTemplate.findFirst({
      where: { id: data.templateId, organizationId },
    });

    if (!template) {
      return { error: "Template not found" };
    }

    // Get max sort order
    const maxOrder = await prisma.inspectionTemplateItem.aggregate({
      where: { templateId: data.templateId },
      _max: { sortOrder: true },
    });

    await prisma.inspectionTemplateItem.create({
      data: {
        templateId: data.templateId,
        question: data.question,
        description: data.description || null,
        itemType: data.itemType,
        options: data.options ? JSON.parse(data.options) : null,
        isRequired: data.isRequired,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    revalidatePath(`/dashboard/inspections/templates/${data.templateId}`);
    return { success: true, templateId: data.templateId };
  } catch (error) {
    console.error("Add template item error:", error);
    return { error: "Failed to add template item. Please try again." };
  }
}

export async function deleteTemplateItem(itemId: string): Promise<TemplateActionState> {
  try {
    const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const item = await prisma.inspectionTemplateItem.findUnique({
      where: { id: itemId },
      include: { template: true },
    });

    if (!item || item.template.organizationId !== organizationId) {
      return { error: "Template item not found" };
    }

    await prisma.inspectionTemplateItem.delete({
      where: { id: itemId },
    });

    revalidatePath(`/dashboard/inspections/templates/${item.templateId}`);
    return { success: true, templateId: item.templateId };
  } catch (error) {
    console.error("Delete template item error:", error);
    return { error: "Failed to delete template item. Please try again." };
  }
}

// ============================================
// INSPECTION ACTIONS
// ============================================

export async function createInspection(
  _prevState: InspectionActionState,
  formData: FormData
): Promise<InspectionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const rawData = Object.fromEntries(formData);
    const parsed = inspectionSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    // Verify asset exists
    const asset = await prisma.asset.findFirst({
      where: { id: data.assetId, organizationId },
    });

    if (!asset) {
      return { error: "Asset not found" };
    }

    // Get template if provided
    let templateSnapshot = null;
    if (data.templateId) {
      const template = await prisma.inspectionTemplate.findFirst({
        where: { id: data.templateId, organizationId },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });

      if (template) {
        templateSnapshot = {
          templateId: template.id,
          templateName: template.name,
          version: template.version,
          items: template.items.map((item) => ({
            id: item.id,
            question: item.question,
            description: item.description,
            itemType: item.itemType,
            options: item.options,
            isRequired: item.isRequired,
          })),
        };
      }
    }

    const reference = await generateInspectionReference(organizationId);

    const inspection = await prisma.$transaction(async (tx) => {
      const insp = await tx.inspection.create({
        data: {
          organizationId,
          reference,
          assetId: data.assetId,
          templateId: data.templateId || null,
          inspectionType: data.inspectionType,
          status: "DRAFT",
          templateSnapshot: templateSnapshot ?? Prisma.JsonNull,
          inspectorUserId: userId,
          inspectorName: user?.name || user?.email || null,
          assetCategory: asset.category,
          assetManufacturer: asset.manufacturer,
          assetModel: asset.model,
          assetSerialNumber: asset.serialNumber,
          physicalCondition: data.physicalCondition || null,
          functionalCondition: data.functionalCondition || null,
          conditionGrade: data.conditionGrade as ConditionGrade || null,
          gradeRationale: data.gradeRationale || null,
          findings: data.findings || null,
          recommendedAction: data.recommendedAction || null,
          inspectorComments: data.inspectorComments || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "INSPECTION_CREATED",
          entityType: "Inspection",
          entityId: insp.id,
          details: { reference, assetId: data.assetId, type: data.inspectionType },
        },
      });

      return insp;
    });

    revalidatePath("/dashboard/inspections");
    revalidatePath(`/dashboard/assets/${data.assetId}`);
    return { success: true, inspectionId: inspection.id, reference: inspection.reference };
  } catch (error) {
    console.error("Create inspection error:", error);
    return { error: "Failed to create inspection. Please try again." };
  }
}

export async function updateInspection(
  _prevState: InspectionActionState,
  formData: FormData
): Promise<InspectionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = inspectionUpdateSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { id, ...data } = parsed.data;

    // Verify inspection exists and is editable
    const existing = await prisma.inspection.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { error: "Inspection not found" };
    }

    if (existing.status === "APPROVED") {
      return { error: "Cannot edit approved inspections. Create a revision instead." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.inspection.update({
        where: { id },
        data: {
          physicalCondition: data.physicalCondition || null,
          functionalCondition: data.functionalCondition || null,
          conditionGrade: data.conditionGrade as ConditionGrade || null,
          gradeRationale: data.gradeRationale || null,
          findings: data.findings || null,
          recommendedAction: data.recommendedAction || null,
          inspectorComments: data.inspectorComments || null,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "INSPECTION_UPDATED",
          entityType: "Inspection",
          entityId: id,
        },
      });
    });

    revalidatePath("/dashboard/inspections");
    revalidatePath(`/dashboard/inspections/${id}`);
    return { success: true, inspectionId: id };
  } catch (error) {
    console.error("Update inspection error:", error);
    return { error: "Failed to update inspection. Please try again." };
  }
}

export async function submitInspection(inspectionId: string): Promise<InspectionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, organizationId },
    });

    if (!inspection) {
      return { error: "Inspection not found" };
    }

    if (inspection.status !== "DRAFT") {
      return { error: "Only draft inspections can be submitted" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.inspection.update({
        where: { id: inspectionId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "INSPECTION_SUBMITTED",
          entityType: "Inspection",
          entityId: inspectionId,
          details: { submittedBy: user?.name || user?.email },
        },
      });
    });

    revalidatePath("/dashboard/inspections");
    revalidatePath(`/dashboard/inspections/${inspectionId}`);
    return { success: true, inspectionId };
  } catch (error) {
    console.error("Submit inspection error:", error);
    return { error: "Failed to submit inspection. Please try again." };
  }
}

export async function approveInspection(
  inspectionId: string,
  reviewNotes?: string
): Promise<InspectionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, organizationId },
      include: { asset: true },
    });

    if (!inspection) {
      return { error: "Inspection not found" };
    }

    if (inspection.status !== "SUBMITTED") {
      return { error: "Only submitted inspections can be approved" };
    }

    await prisma.$transaction(async (tx) => {
      // Update inspection status
      await tx.inspection.update({
        where: { id: inspectionId },
        data: {
          status: "APPROVED",
          reviewedByUserId: userId,
          reviewedByName: user?.name || user?.email || null,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
          updatedAt: new Date(),
        },
      });

      // Update asset with inspection results if condition grade was set
      if (inspection.conditionGrade) {
        await tx.asset.update({
          where: { id: inspection.assetId },
          data: {
            conditionGrade: inspection.conditionGrade,
            conditionGradeNotes: inspection.gradeRationale,
            conditionGradedBy: inspection.inspectorName,
            conditionGradedAt: new Date(),
            physicalCondition: inspection.physicalCondition || undefined,
            functionalCondition: inspection.functionalCondition || undefined,
            inspectedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "INSPECTION_APPROVED",
          entityType: "Inspection",
          entityId: inspectionId,
          details: {
            approvedBy: user?.name || user?.email,
            conditionGrade: inspection.conditionGrade,
          },
        },
      });
    });

    revalidatePath("/dashboard/inspections");
    revalidatePath(`/dashboard/inspections/${inspectionId}`);
    revalidatePath(`/dashboard/assets/${inspection.assetId}`);
    return { success: true, inspectionId };
  } catch (error) {
    console.error("Approve inspection error:", error);
    return { error: "Failed to approve inspection. Please try again." };
  }
}

export async function rejectInspection(
  inspectionId: string,
  rejectionReason: string
): Promise<InspectionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!rejectionReason?.trim()) {
      return { error: "Rejection reason is required" };
    }

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, organizationId },
    });

    if (!inspection) {
      return { error: "Inspection not found" };
    }

    if (inspection.status !== "SUBMITTED") {
      return { error: "Only submitted inspections can be rejected" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.inspection.update({
        where: { id: inspectionId },
        data: {
          status: "REJECTED",
          reviewedByUserId: userId,
          reviewedByName: user?.name || user?.email || null,
          reviewedAt: new Date(),
          rejectionReason,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "INSPECTION_REJECTED",
          entityType: "Inspection",
          entityId: inspectionId,
          details: { rejectedBy: user?.name || user?.email, reason: rejectionReason },
        },
      });
    });

    revalidatePath("/dashboard/inspections");
    revalidatePath(`/dashboard/inspections/${inspectionId}`);
    return { success: true, inspectionId };
  } catch (error) {
    console.error("Reject inspection error:", error);
    return { error: "Failed to reject inspection. Please try again." };
  }
}

export async function createInspectionRevision(
  inspectionId: string,
  reason: string,
  changes: Prisma.InputJsonValue
): Promise<InspectionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, organizationId },
    });

    if (!inspection) {
      return { error: "Inspection not found" };
    }

    if (inspection.status !== "APPROVED") {
      return { error: "Only approved inspections can have revisions" };
    }

    // Get current revision number
    const lastRevision = await prisma.inspectionRevision.findFirst({
      where: { inspectionId },
      orderBy: { revisionNum: "desc" },
    });

    const revisionNum = (lastRevision?.revisionNum ?? 0) + 1;

    await prisma.$transaction(async (tx) => {
      await tx.inspectionRevision.create({
        data: {
          inspectionId,
          revisionNum,
          reason,
          changes,
          revisedBy: userId,
          revisedByName: user?.name || user?.email || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "INSPECTION_REVISION_CREATED",
          entityType: "Inspection",
          entityId: inspectionId,
          details: { revisionNum, reason },
        },
      });
    });

    revalidatePath(`/dashboard/inspections/${inspectionId}`);
    return { success: true, inspectionId };
  } catch (error) {
    console.error("Create inspection revision error:", error);
    return { error: "Failed to create revision. Please try again." };
  }
}

export async function saveChecklistResponses(
  inspectionId: string,
  responses: Prisma.InputJsonValue
): Promise<InspectionActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, organizationId },
    });

    if (!inspection) {
      return { error: "Inspection not found" };
    }

    if (inspection.status === "APPROVED") {
      return { error: "Cannot modify approved inspections" };
    }

    await prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        checklistResponses: responses,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/dashboard/inspections/${inspectionId}`);
    return { success: true, inspectionId };
  } catch (error) {
    console.error("Save checklist responses error:", error);
    return { error: "Failed to save responses. Please try again." };
  }
}

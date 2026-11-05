"use server";

import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role, DocumentCategory, DocumentStatus, Prisma } from "@prisma/client";

// Roles that can manage documents
const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN", "OPERATIONS"];

// ============================================
// TYPES
// ============================================

export type DocumentWithMeta = Prisma.DocumentGetPayload<{
  include: {
    _count: { select: { versions: true } };
  };
}>;

export interface ActionState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  documentId?: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.nativeEnum(DocumentCategory),
  tags: z.string().optional(), // Comma-separated
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Valid file URL required"),
  fileSize: z.coerce.number().optional(),
  mimeType: z.string().optional(),
  ownerUserId: z.string().optional(),
  ownerName: z.string().optional(),
  effectiveDate: z.string().optional(),
  reviewDate: z.string().optional(),
  expiryDate: z.string().optional(),
  isRestricted: z.coerce.boolean().optional(),
  allowedRoles: z.string().optional(), // Comma-separated roles
});

const updateDocumentSchema = createDocumentSchema.partial().extend({
  documentId: z.string().min(1, "Document ID is required"),
});

// ============================================
// QUERIES
// ============================================

/**
 * Get all documents with filtering
 */
export async function getDocuments(options?: {
  category?: DocumentCategory;
  status?: DocumentStatus;
  search?: string;
  currentVersionOnly?: boolean;
}): Promise<{
  success: boolean;
  documents?: DocumentWithMeta[];
  error?: string;
}> {
  try {
    const { organizationId, membership } = await requireMember();
    const role = membership.role;

    const where: Prisma.DocumentWhereInput = {
      organizationId,
      status: { not: "DELETED" },
    };

    // Filter by category
    if (options?.category) {
      where.category = options.category;
    }

    // Filter by status
    if (options?.status) {
      where.status = options.status;
    }

    // Current versions only
    if (options?.currentVersionOnly !== false) {
      where.isCurrentVersion = true;
    }

    // Search
    if (options?.search) {
      where.OR = [
        { title: { contains: options.search, mode: "insensitive" } },
        { reference: { contains: options.search, mode: "insensitive" } },
        { description: { contains: options.search, mode: "insensitive" } },
        { tags: { has: options.search } },
      ];
    }

    // Role-based filtering for restricted documents
    if (!["OWNER", "ADMIN"].includes(role)) {
      where.OR = [
        { isRestricted: false },
        { allowedRoles: { has: role } },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return { success: true, documents };
  } catch (error) {
    console.error("Get documents error:", error);
    return { success: false, error: "Failed to load documents" };
  }
}

/**
 * Get a single document by ID
 */
export async function getDocument(documentId: string): Promise<{
  success: boolean;
  document?: DocumentWithMeta & { versions: DocumentWithMeta[] };
  error?: string;
}> {
  try {
    const { organizationId, membership } = await requireMember();
    const role = membership.role;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        _count: { select: { versions: true } },
        versions: {
          include: {
            _count: { select: { versions: true } },
          },
          orderBy: { version: "desc" },
        },
      },
    });

    if (!document || document.organizationId !== organizationId) {
      return { success: false, error: "Document not found" };
    }

    // Check access for restricted documents
    if (document.isRestricted && !["OWNER", "ADMIN"].includes(role)) {
      if (!document.allowedRoles.includes(role)) {
        return { success: false, error: "Access denied" };
      }
    }

    return { success: true, document };
  } catch (error) {
    console.error("Get document error:", error);
    return { success: false, error: "Failed to load document" };
  }
}

/**
 * Get document statistics
 */
export async function getDocumentStats(): Promise<{
  success: boolean;
  stats?: {
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    pendingReview: number;
  };
  error?: string;
}> {
  try {
    const { organizationId } = await requireMember();

    const [total, categoryGroups, statusGroups, pendingReview] = await Promise.all([
      prisma.document.count({
        where: { organizationId, isCurrentVersion: true, status: { not: "DELETED" } },
      }),
      prisma.document.groupBy({
        by: ["category"],
        where: { organizationId, isCurrentVersion: true, status: { not: "DELETED" } },
        _count: true,
      }),
      prisma.document.groupBy({
        by: ["status"],
        where: { organizationId, isCurrentVersion: true },
        _count: true,
      }),
      prisma.document.count({
        where: {
          organizationId,
          isCurrentVersion: true,
          status: "ACTIVE",
          reviewDate: { lte: new Date() },
        },
      }),
    ]);

    const byCategory: Record<string, number> = {};
    for (const group of categoryGroups) {
      byCategory[group.category] = group._count;
    }

    const byStatus: Record<string, number> = {};
    for (const group of statusGroups) {
      byStatus[group.status] = group._count;
    }

    return {
      success: true,
      stats: { total, byCategory, byStatus, pendingReview },
    };
  } catch (error) {
    console.error("Get document stats error:", error);
    return { success: false, error: "Failed to load statistics" };
  }
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Generate next document reference
 */
async function generateReference(organizationId: string): Promise<string> {
  const lastDoc = await prisma.document.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { reference: true },
  });

  if (!lastDoc) {
    return "DOC-00001";
  }

  const match = lastDoc.reference.match(/DOC-(\d+)/);
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `DOC-${nextNum.toString().padStart(5, "0")}`;
  }

  return `DOC-00001`;
}

/**
 * Create a new document
 */
export async function createDocument(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = createDocumentSchema.safeParse(rawData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      return { fieldErrors, error: "Please check the form for errors" };
    }

    const data = parsed.data;
    const reference = await generateReference(organizationId);

    // Get user info for name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const userName = user?.name || user?.email || "Unknown";

    // Parse tags
    const tags = data.tags
      ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    // Parse allowed roles
    const allowedRoles = data.allowedRoles
      ? (data.allowedRoles.split(",").map((r) => r.trim()).filter(Boolean) as Role[])
      : [];

    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          organizationId,
          reference,
          title: data.title,
          description: data.description || null,
          category: data.category,
          status: "DRAFT",
          tags,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileSize: data.fileSize || null,
          mimeType: data.mimeType || null,
          ownerUserId: data.ownerUserId || userId,
          ownerName: data.ownerName || userName,
          effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
          reviewDate: data.reviewDate ? new Date(data.reviewDate) : null,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          isRestricted: data.isRestricted || false,
          allowedRoles,
          uploadedByUserId: userId,
          uploadedByName: userName,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "DOCUMENT_CREATED",
          entityType: "Document",
          entityId: doc.id,
          details: { reference, title: data.title, category: data.category },
        },
      });

      return doc;
    });

    revalidatePath("/dashboard/documents");

    return { success: true, documentId: document.id };
  } catch (error) {
    console.error("Create document error:", error);
    return { error: "Failed to create document. Please try again." };
  }
}

/**
 * Update a document
 */
export async function updateDocument(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = updateDocumentSchema.safeParse(rawData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      return { fieldErrors, error: "Please check the form for errors" };
    }

    const { documentId, tags, allowedRoles, ...data } = parsed.data;

    // Verify document belongs to organization
    const existingDoc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!existingDoc || existingDoc.organizationId !== organizationId) {
      return { error: "Document not found" };
    }

    // Parse tags
    const parsedTags = tags
      ? tags.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    // Parse allowed roles
    const parsedRoles = allowedRoles
      ? (allowedRoles.split(",").map((r) => r.trim()).filter(Boolean) as Role[])
      : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: documentId },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description || null }),
          ...(data.category && { category: data.category }),
          ...(parsedTags && { tags: parsedTags }),
          ...(data.fileName && { fileName: data.fileName }),
          ...(data.fileUrl && { fileUrl: data.fileUrl }),
          ...(data.fileSize !== undefined && { fileSize: data.fileSize || null }),
          ...(data.mimeType !== undefined && { mimeType: data.mimeType || null }),
          ...(data.ownerUserId !== undefined && { ownerUserId: data.ownerUserId || null }),
          ...(data.ownerName !== undefined && { ownerName: data.ownerName || null }),
          ...(data.effectiveDate !== undefined && { effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null }),
          ...(data.reviewDate !== undefined && { reviewDate: data.reviewDate ? new Date(data.reviewDate) : null }),
          ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate ? new Date(data.expiryDate) : null }),
          ...(data.isRestricted !== undefined && { isRestricted: data.isRestricted }),
          ...(parsedRoles && { allowedRoles: parsedRoles }),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "DOCUMENT_UPDATED",
          entityType: "Document",
          entityId: documentId,
        },
      });
    });

    revalidatePath("/dashboard/documents");
    revalidatePath(`/dashboard/documents/${documentId}`);

    return { success: true };
  } catch (error) {
    console.error("Update document error:", error);
    return { error: "Failed to update document. Please try again." };
  }
}

/**
 * Upload a new version of a document
 */
export async function uploadNewVersion(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const parentDocumentId = formData.get("parentDocumentId")?.toString();
    const fileName = formData.get("fileName")?.toString();
    const fileUrl = formData.get("fileUrl")?.toString();
    const fileSize = formData.get("fileSize") ? parseInt(formData.get("fileSize") as string, 10) : null;
    const mimeType = formData.get("mimeType")?.toString() || null;

    if (!parentDocumentId || !fileName || !fileUrl) {
      return { error: "Missing required fields" };
    }

    // Get parent document
    const parentDoc = await prisma.document.findUnique({
      where: { id: parentDocumentId },
    });

    if (!parentDoc || parentDoc.organizationId !== organizationId) {
      return { error: "Parent document not found" };
    }

    // Get user info for name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const userName = user?.name || user?.email || "Unknown";

    const newVersion = parentDoc.version + 1;

    const document = await prisma.$transaction(async (tx) => {
      // Mark old version as archived
      await tx.document.update({
        where: { id: parentDocumentId },
        data: { isCurrentVersion: false, status: "ARCHIVED" },
      });

      // Create new version
      const doc = await tx.document.create({
        data: {
          organizationId,
          reference: parentDoc.reference,
          title: parentDoc.title,
          description: parentDoc.description,
          category: parentDoc.category,
          status: "DRAFT",
          tags: parentDoc.tags,
          version: newVersion,
          parentDocumentId,
          isCurrentVersion: true,
          fileName,
          fileUrl,
          fileSize,
          mimeType,
          ownerUserId: parentDoc.ownerUserId,
          ownerName: parentDoc.ownerName,
          effectiveDate: parentDoc.effectiveDate,
          reviewDate: parentDoc.reviewDate,
          expiryDate: parentDoc.expiryDate,
          isRestricted: parentDoc.isRestricted,
          allowedRoles: parentDoc.allowedRoles,
          uploadedByUserId: userId,
          uploadedByName: userName,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "DOCUMENT_VERSION_CREATED",
          entityType: "Document",
          entityId: doc.id,
          details: { reference: parentDoc.reference, version: newVersion, parentDocumentId },
        },
      });

      return doc;
    });

    revalidatePath("/dashboard/documents");
    revalidatePath(`/dashboard/documents/${parentDocumentId}`);

    return { success: true, documentId: document.id };
  } catch (error) {
    console.error("Upload new version error:", error);
    return { error: "Failed to upload new version. Please try again." };
  }
}

/**
 * Approve a document
 */
export async function approveDocument(documentId: string): Promise<ActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.organizationId !== organizationId) {
      return { error: "Document not found" };
    }

    if (document.status !== "DRAFT") {
      return { error: "Only draft documents can be approved" };
    }

    // Get user info for name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const userName = user?.name || user?.email || "Unknown";

    await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: documentId },
        data: {
          status: "ACTIVE",
          approvedAt: new Date(),
          approvedByUserId: userId,
          approvedByName: userName,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "DOCUMENT_APPROVED",
          entityType: "Document",
          entityId: documentId,
        },
      });
    });

    revalidatePath("/dashboard/documents");
    revalidatePath(`/dashboard/documents/${documentId}`);

    return { success: true };
  } catch (error) {
    console.error("Approve document error:", error);
    return { error: "Failed to approve document" };
  }
}

/**
 * Archive a document
 */
export async function archiveDocument(documentId: string): Promise<ActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.organizationId !== organizationId) {
      return { error: "Document not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: documentId },
        data: { status: "ARCHIVED" },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "DOCUMENT_ARCHIVED",
          entityType: "Document",
          entityId: documentId,
        },
      });
    });

    revalidatePath("/dashboard/documents");
    revalidatePath(`/dashboard/documents/${documentId}`);

    return { success: true };
  } catch (error) {
    console.error("Archive document error:", error);
    return { error: "Failed to archive document" };
  }
}

/**
 * Delete a document (soft delete)
 */
export async function deleteDocument(documentId: string): Promise<ActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ["OWNER", "ADMIN"]);

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.organizationId !== organizationId) {
      return { error: "Document not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: documentId },
        data: { status: "DELETED", isCurrentVersion: false },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "DOCUMENT_DELETED",
          entityType: "Document",
          entityId: documentId,
        },
      });
    });

    revalidatePath("/dashboard/documents");

    return { success: true };
  } catch (error) {
    console.error("Delete document error:", error);
    return { error: "Failed to delete document" };
  }
}

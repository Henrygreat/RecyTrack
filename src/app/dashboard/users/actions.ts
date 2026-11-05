"use server";

import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@prisma/client";
import { randomBytes } from "crypto";
import { sendStaffInvitationEmail, isEmailConfigured } from "@/lib/email";

// Only OWNER and ADMIN can manage users
const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

// Role hierarchy - users can only assign roles at or below their level
const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 100,
  ADMIN: 80,
  OPERATIONS: 60,
  WAREHOUSE: 40,
  DRIVER: 20,
  CUSTOMER: 0, // Not assignable via staff management
};

// Human-readable role labels
export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Administrator",
  OPERATIONS: "Operations Manager",
  WAREHOUSE: "Warehouse Staff",
  DRIVER: "Driver",
  CUSTOMER: "Customer",
};

// Roles that can be assigned to staff
export const ASSIGNABLE_STAFF_ROLES: Role[] = ["ADMIN", "OPERATIONS", "WAREHOUSE", "DRIVER"];

// ============================================
// TYPES
// ============================================

export interface UserListItem {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  membershipId: string;
}

export interface InvitationListItem {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: "pending" | "accepted" | "expired" | "revoked";
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  invitedByName: string | null;
}

export interface ActionState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const inviteStaffSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
  role: z.enum(["ADMIN", "OPERATIONS", "WAREHOUSE", "DRIVER"] as const),
});

const updateRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(["ADMIN", "OPERATIONS", "WAREHOUSE", "DRIVER"] as const),
});

// ============================================
// QUERIES
// ============================================

/**
 * Get all users (active and inactive) in the organization
 */
export async function getOrganizationUsers(): Promise<{
  success: boolean;
  users?: UserListItem[];
  error?: string;
}> {
  try {
    const { organizationId, membership } = await requireMember(undefined, ADMIN_ROLES);

    const memberships = await prisma.membership.findMany({
      where: {
        organizationId,
        role: { not: "CUSTOMER" }, // Exclude customer portal users
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: [
        { isActive: "desc" },
        { role: "asc" },
        { createdAt: "asc" },
      ],
    });

    const users: UserListItem[] = memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      isActive: m.isActive,
      createdAt: m.createdAt,
      lastLoginAt: m.user.lastLoginAt,
      membershipId: m.id,
    }));

    return { success: true, users };
  } catch (error) {
    console.error("Get users error:", error);
    return { success: false, error: "Failed to load users" };
  }
}

/**
 * Get all pending staff invitations
 */
export async function getPendingInvitations(): Promise<{
  success: boolean;
  invitations?: InvitationListItem[];
  error?: string;
}> {
  try {
    const { organizationId } = await requireMember(undefined, ADMIN_ROLES);

    const invitations = await prisma.staffInvitation.findMany({
      where: { organizationId },
      include: {
        invitedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const items: InvitationListItem[] = invitations.map((inv) => {
      let status: "pending" | "accepted" | "expired" | "revoked" = "pending";
      if (inv.acceptedAt) status = "accepted";
      else if (inv.revokedAt) status = "revoked";
      else if (inv.expiresAt < now) status = "expired";

      return {
        id: inv.id,
        email: inv.email,
        name: inv.name,
        role: inv.role,
        status,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        invitedByName: inv.invitedBy.name || inv.invitedBy.email,
      };
    });

    return { success: true, invitations: items };
  } catch (error) {
    console.error("Get invitations error:", error);
    return { success: false, error: "Failed to load invitations" };
  }
}

/**
 * Get a single user's details
 */
export async function getUserDetails(userId: string): Promise<{
  success: boolean;
  user?: UserListItem & {
    organizationName: string;
    deactivatedAt?: Date | null;
    deactivatedByName?: string | null;
  };
  error?: string;
}> {
  try {
    const { organizationId } = await requireMember(undefined, ADMIN_ROLES);

    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        organizationId,
        role: { not: "CUSTOMER" },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        organization: {
          select: { name: true },
        },
        deactivatedBy: {
          select: { name: true, email: true },
        },
      },
    });

    if (!membership) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      user: {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        isActive: membership.isActive,
        createdAt: membership.createdAt,
        lastLoginAt: membership.user.lastLoginAt,
        membershipId: membership.id,
        organizationName: membership.organization.name,
        deactivatedAt: membership.deactivatedAt,
        deactivatedByName: membership.deactivatedBy?.name || membership.deactivatedBy?.email,
      },
    };
  } catch (error) {
    console.error("Get user details error:", error);
    return { success: false, error: "Failed to load user details" };
  }
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Invite a new staff member
 */
export async function inviteStaffMember(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { organizationId, userId, membership } = await requireMember(undefined, ADMIN_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = inviteStaffSchema.safeParse(rawData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      return { fieldErrors, error: "Please check the form for errors" };
    }

    const { email, name, role } = parsed.data;

    // Check role hierarchy - can't assign a role higher than your own
    if (ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[membership.role]) {
      return { error: "You cannot invite users with a role equal to or higher than your own" };
    }

    // Check if user already exists in this organization
    const existingMembership = await prisma.membership.findFirst({
      where: {
        organizationId,
        user: { email: email.toLowerCase() },
      },
    });

    if (existingMembership) {
      return { error: "A user with this email already exists in this organization" };
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.staffInvitation.findFirst({
      where: {
        organizationId,
        email: email.toLowerCase(),
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return { error: "An invitation is already pending for this email address" };
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Get inviter name and organization for email
    const inviter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    // Create invitation
    const invitation = await prisma.staffInvitation.create({
      data: {
        organizationId,
        email: email.toLowerCase(),
        name: name || null,
        role,
        token,
        expiresAt,
        invitedByUserId: userId,
      },
    });

    // Send invitation email
    if (isEmailConfigured()) {
      const emailResult = await sendStaffInvitationEmail({
        to: email,
        inviteeName: name || undefined,
        invitedByName: inviter?.name || inviter?.email || "Administrator",
        organizationName: organization?.name || "RecyTrack",
        role,
        token,
        expiresAt,
      });

      if (emailResult.success && emailResult.messageId) {
        await prisma.staffInvitation.update({
          where: { id: invitation.id },
          data: {
            emailSentAt: new Date(),
            emailMessageId: emailResult.messageId,
          },
        });
      } else {
        // Log email failure but don't fail the invitation
        await prisma.staffInvitation.update({
          where: { id: invitation.id },
          data: {
            emailFailedAt: new Date(),
            emailFailureReason: emailResult.error,
          },
        });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: userId,
        action: "STAFF_INVITED",
        entityType: "StaffInvitation",
        entityId: invitation.id,
        details: { email, role },
      },
    });

    revalidatePath("/dashboard/users");

    return { success: true };
  } catch (error) {
    console.error("Invite staff error:", error);
    return { error: "Failed to send invitation. Please try again." };
  }
}

/**
 * Resend a staff invitation
 */
export async function resendStaffInvitation(invitationId: string): Promise<ActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const invitation = await prisma.staffInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
        acceptedAt: null,
        revokedAt: null,
      },
      include: {
        organization: { select: { name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    });

    if (!invitation) {
      return { error: "Invitation not found or already accepted/revoked" };
    }

    // Generate new token and extend expiry
    const newToken = randomBytes(32).toString("hex");
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.staffInvitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        lastResendAt: new Date(),
        resendCount: { increment: 1 },
      },
    });

    // Send new invitation email
    if (isEmailConfigured()) {
      const emailResult = await sendStaffInvitationEmail({
        to: invitation.email,
        inviteeName: invitation.name || undefined,
        invitedByName: invitation.invitedBy.name || invitation.invitedBy.email || "Administrator",
        organizationName: invitation.organization.name,
        role: invitation.role,
        token: newToken,
        expiresAt: newExpiresAt,
      });

      if (emailResult.success && emailResult.messageId) {
        await prisma.staffInvitation.update({
          where: { id: invitationId },
          data: {
            emailSentAt: new Date(),
            emailMessageId: emailResult.messageId,
            emailFailedAt: null,
            emailFailureReason: null,
          },
        });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: userId,
        action: "STAFF_INVITATION_RESENT",
        entityType: "StaffInvitation",
        entityId: invitationId,
        details: { email: invitation.email },
      },
    });

    revalidatePath("/dashboard/users");

    return { success: true };
  } catch (error) {
    console.error("Resend invitation error:", error);
    return { error: "Failed to resend invitation" };
  }
}

/**
 * Revoke a staff invitation
 */
export async function revokeStaffInvitation(invitationId: string): Promise<ActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, ADMIN_ROLES);

    const invitation = await prisma.staffInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
        acceptedAt: null,
        revokedAt: null,
      },
    });

    if (!invitation) {
      return { error: "Invitation not found or already accepted/revoked" };
    }

    await prisma.staffInvitation.update({
      where: { id: invitationId },
      data: { revokedAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: userId,
        action: "STAFF_INVITATION_REVOKED",
        entityType: "StaffInvitation",
        entityId: invitationId,
        details: { email: invitation.email },
      },
    });

    revalidatePath("/dashboard/users");

    return { success: true };
  } catch (error) {
    console.error("Revoke invitation error:", error);
    return { error: "Failed to revoke invitation" };
  }
}

/**
 * Update a user's role
 */
export async function updateUserRole(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { organizationId, userId, membership: actorMembership } = await requireMember(
      undefined,
      ADMIN_ROLES
    );

    const parsed = updateRoleSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { membershipId, role: newRole } = parsed.data;

    // Get the target membership
    const targetMembership = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId,
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    if (!targetMembership) {
      return { error: "User not found" };
    }

    // Prevent modifying your own role
    if (targetMembership.userId === userId) {
      return { error: "You cannot modify your own role" };
    }

    // Prevent modifying OWNER accounts (only another OWNER can do this)
    if (targetMembership.role === "OWNER" && actorMembership.role !== "OWNER") {
      return { error: "Only an Owner can modify another Owner's role" };
    }

    // Check role hierarchy - can't assign a role >= your own
    if (ROLE_HIERARCHY[newRole] >= ROLE_HIERARCHY[actorMembership.role]) {
      return { error: "You cannot assign a role equal to or higher than your own" };
    }

    // Check current role hierarchy - can't demote someone with role >= yours
    if (ROLE_HIERARCHY[targetMembership.role] >= ROLE_HIERARCHY[actorMembership.role]) {
      return { error: "You cannot modify users with a role equal to or higher than your own" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: { id: membershipId },
        data: { role: newRole },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "USER_ROLE_CHANGED",
          entityType: "Membership",
          entityId: membershipId,
          details: {
            userId: targetMembership.userId,
            email: targetMembership.user.email,
            fromRole: targetMembership.role,
            toRole: newRole,
          },
        },
      });
    });

    revalidatePath("/dashboard/users");
    revalidatePath(`/dashboard/users/${targetMembership.userId}`);

    return { success: true };
  } catch (error) {
    console.error("Update role error:", error);
    return { error: "Failed to update role" };
  }
}

/**
 * Deactivate a user's membership
 */
export async function deactivateUser(targetUserId: string): Promise<ActionState> {
  try {
    const { organizationId, userId, membership: actorMembership } = await requireMember(
      undefined,
      ADMIN_ROLES
    );

    // Prevent self-deactivation
    if (targetUserId === userId) {
      return { error: "You cannot deactivate your own account" };
    }

    const targetMembership = await prisma.membership.findFirst({
      where: {
        userId: targetUserId,
        organizationId,
      },
      include: {
        user: { select: { email: true } },
      },
    });

    if (!targetMembership) {
      return { error: "User not found" };
    }

    if (!targetMembership.isActive) {
      return { error: "User is already deactivated" };
    }

    // Prevent deactivating OWNER if it's the last active owner
    if (targetMembership.role === "OWNER") {
      const activeOwnerCount = await prisma.membership.count({
        where: {
          organizationId,
          role: "OWNER",
          isActive: true,
        },
      });

      if (activeOwnerCount <= 1) {
        return { error: "Cannot deactivate the last active Owner. Transfer ownership first." };
      }
    }

    // Check hierarchy - can't deactivate someone with role >= yours (unless you're OWNER)
    if (
      actorMembership.role !== "OWNER" &&
      ROLE_HIERARCHY[targetMembership.role] >= ROLE_HIERARCHY[actorMembership.role]
    ) {
      return { error: "You cannot deactivate users with a role equal to or higher than your own" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: { id: targetMembership.id },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "USER_DEACTIVATED",
          entityType: "Membership",
          entityId: targetMembership.id,
          details: {
            userId: targetUserId,
            email: targetMembership.user.email,
            role: targetMembership.role,
          },
        },
      });
    });

    revalidatePath("/dashboard/users");
    revalidatePath(`/dashboard/users/${targetUserId}`);

    return { success: true };
  } catch (error) {
    console.error("Deactivate user error:", error);
    return { error: "Failed to deactivate user" };
  }
}

/**
 * Reactivate a user's membership
 */
export async function reactivateUser(targetUserId: string): Promise<ActionState> {
  try {
    const { organizationId, userId, membership: actorMembership } = await requireMember(
      undefined,
      ADMIN_ROLES
    );

    const targetMembership = await prisma.membership.findFirst({
      where: {
        userId: targetUserId,
        organizationId,
      },
      include: {
        user: { select: { email: true } },
      },
    });

    if (!targetMembership) {
      return { error: "User not found" };
    }

    if (targetMembership.isActive) {
      return { error: "User is already active" };
    }

    // Check hierarchy
    if (
      actorMembership.role !== "OWNER" &&
      ROLE_HIERARCHY[targetMembership.role] >= ROLE_HIERARCHY[actorMembership.role]
    ) {
      return { error: "You cannot reactivate users with a role equal to or higher than your own" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: { id: targetMembership.id },
        data: {
          isActive: true,
          deactivatedAt: null,
          deactivatedById: null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "USER_REACTIVATED",
          entityType: "Membership",
          entityId: targetMembership.id,
          details: {
            userId: targetUserId,
            email: targetMembership.user.email,
            role: targetMembership.role,
          },
        },
      });
    });

    revalidatePath("/dashboard/users");
    revalidatePath(`/dashboard/users/${targetUserId}`);

    return { success: true };
  } catch (error) {
    console.error("Reactivate user error:", error);
    return { error: "Failed to reactivate user" };
  }
}

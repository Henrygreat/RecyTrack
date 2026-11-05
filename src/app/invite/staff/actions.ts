"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Administrator",
  OPERATIONS: "Operations Manager",
  WAREHOUSE: "Warehouse Staff",
  DRIVER: "Driver",
  CUSTOMER: "Customer",
};

export interface StaffInvitationValidation {
  valid: boolean;
  error?: string;
  invitation?: {
    email: string;
    name: string | null;
    role: Role;
    roleLabel: string;
    organizationName: string;
  };
  existingUser?: boolean;
}

/**
 * Validate a staff invitation token
 */
export async function validateStaffInvitationToken(
  token: string
): Promise<StaffInvitationValidation> {
  if (!token) {
    return { valid: false, error: "No invitation token provided" };
  }

  const invitation = await prisma.staffInvitation.findUnique({
    where: { token },
    include: {
      organization: { select: { name: true } },
    },
  });

  if (!invitation) {
    return { valid: false, error: "Invalid invitation token" };
  }

  if (invitation.revokedAt) {
    return { valid: false, error: "This invitation has been revoked" };
  }

  if (invitation.acceptedAt) {
    return { valid: false, error: "This invitation has already been accepted" };
  }

  if (invitation.expiresAt < new Date()) {
    return {
      valid: false,
      error: "This invitation has expired. Please request a new invitation.",
    };
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email.toLowerCase() },
  });

  return {
    valid: true,
    invitation: {
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      roleLabel: ROLE_LABELS[invitation.role],
      organizationName: invitation.organization.name,
    },
    existingUser: !!existingUser,
  };
}

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1, "Please enter your name"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const acceptExistingUserSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1, "Please enter your password"),
});

export interface AcceptInvitationState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Accept a staff invitation (new user - create account)
 */
export async function acceptStaffInvitation(
  _prevState: AcceptInvitationState,
  formData: FormData
): Promise<AcceptInvitationState> {
  try {
    const rawData = Object.fromEntries(formData);
    const parsed = acceptInvitationSchema.safeParse(rawData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      return { fieldErrors, error: "Please check the form for errors" };
    }

    const { token, name, password } = parsed.data;

    // Validate invitation again
    const validation = await validateStaffInvitationToken(token);
    if (!validation.valid) {
      return { error: validation.error };
    }

    if (validation.existingUser) {
      return { error: "An account already exists for this email. Please use the existing account option." };
    }

    // Get invitation details
    const invitation = await prisma.staffInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return { error: "Invalid invitation" };
    }

    // Create user and membership in a transaction
    const passwordHash = await hash(password, 12);

    await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: invitation.email.toLowerCase(),
          name,
          passwordHash,
        },
      });

      // Create membership
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      // Mark invitation as accepted
      await tx.staffInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          organizationId: invitation.organizationId,
          actorUserId: user.id,
          action: "STAFF_INVITATION_ACCEPTED",
          entityType: "User",
          entityId: user.id,
          details: {
            email: invitation.email,
            role: invitation.role,
            invitedBy: invitation.invitedByUserId,
          },
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Accept invitation error:", error);
    return { error: "Failed to accept invitation. Please try again." };
  }
}

/**
 * Accept invitation with existing account (verify password)
 */
export async function acceptStaffInvitationExistingUser(
  _prevState: AcceptInvitationState,
  formData: FormData
): Promise<AcceptInvitationState> {
  try {
    const { compare } = await import("bcryptjs");

    const rawData = Object.fromEntries(formData);
    const parsed = acceptExistingUserSchema.safeParse(rawData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      return { fieldErrors, error: "Please check the form for errors" };
    }

    const { token, password } = parsed.data;

    // Get invitation
    const invitation = await prisma.staffInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return { error: "Invalid invitation" };
    }

    // Validate invitation
    const validation = await validateStaffInvitationToken(token);
    if (!validation.valid) {
      return { error: validation.error };
    }

    // Get existing user
    const user = await prisma.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
    });

    if (!user) {
      return { error: "User not found. Please create a new account." };
    }

    // Verify password
    const passwordValid = await compare(password, user.passwordHash);
    if (!passwordValid) {
      return { error: "Incorrect password" };
    }

    // Check if user is already a member
    const existingMembership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        organizationId: invitation.organizationId,
      },
    });

    if (existingMembership) {
      // Just mark invitation as accepted
      await prisma.staffInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return { success: true };
    }

    // Create membership
    await prisma.$transaction(async (tx) => {
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      await tx.staffInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          organizationId: invitation.organizationId,
          actorUserId: user.id,
          action: "STAFF_INVITATION_ACCEPTED",
          entityType: "User",
          entityId: user.id,
          details: {
            email: invitation.email,
            role: invitation.role,
            invitedBy: invitation.invitedByUserId,
            existingUser: true,
          },
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Accept invitation (existing user) error:", error);
    return { error: "Failed to accept invitation. Please try again." };
  }
}

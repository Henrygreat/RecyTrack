"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";

const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const existingUserSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(1, "Password is required"),
});

export type AcceptInvitationState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
};

/**
 * Validate invitation token and return invitation details
 */
export async function validateInvitationToken(token: string) {
  const invitation = await prisma.customerInvitation.findUnique({
    where: { token },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    return { valid: false, error: "Invalid invitation link" };
  }

  if (invitation.acceptedAt) {
    return { valid: false, error: "This invitation has already been accepted" };
  }

  if (invitation.revokedAt) {
    return { valid: false, error: "This invitation has been revoked" };
  }

  if (invitation.expiresAt < new Date()) {
    return { valid: false, error: "This invitation has expired" };
  }

  if (invitation.customer.status !== "ACTIVE") {
    return { valid: false, error: "This customer account is no longer active" };
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email.toLowerCase() },
    select: { id: true, name: true, email: true },
  });

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      customerName: invitation.customer.name,
      organizationName: invitation.organization.name,
      siteId: invitation.siteId,
    },
    existingUser,
  };
}

/**
 * Accept invitation for a new user (creates account)
 */
export async function acceptInvitationNewUser(
  _prevState: AcceptInvitationState,
  formData: FormData
): Promise<AcceptInvitationState> {
  try {
    const rawData = {
      token: formData.get("token"),
      name: formData.get("name"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    };

    const parsed = acceptInvitationSchema.safeParse(rawData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      return { fieldErrors };
    }

    const { token, name, password } = parsed.data;

    // Validate token
    const validation = await validateInvitationToken(token);
    if (!validation.valid) {
      return { error: validation.error };
    }

    if (validation.existingUser) {
      return { error: "An account with this email already exists. Please sign in instead." };
    }

    const invitation = await prisma.customerInvitation.findUnique({
      where: { token },
      include: { customer: true },
    });

    if (!invitation) {
      return { error: "Invalid invitation" };
    }

    // Create user and grant access in a transaction
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

      // Create customer access
      const customerAccess = await tx.customerAccess.create({
        data: {
          userId: user.id,
          customerId: invitation.customerId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      // If site-specific access, create SiteAccess record
      if (invitation.siteId) {
        await tx.siteAccess.create({
          data: {
            customerAccessId: customerAccess.id,
            siteId: invitation.siteId,
            organizationId: invitation.organizationId,
          },
        });
      }

      // Mark invitation as accepted
      await tx.customerInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          organizationId: invitation.organizationId,
          actorUserId: user.id,
          action: "INVITATION_ACCEPTED",
          entityType: "CustomerInvitation",
          entityId: invitation.id,
          details: {
            email: invitation.email,
            role: invitation.role,
            customerId: invitation.customerId,
          },
        },
      });
    });

    // Sign in the new user
    await signIn("credentials", {
      email: invitation.email.toLowerCase(),
      password,
      redirectTo: "/portal/dashboard",
    });

    return { success: true };
  } catch (error) {
    // Check if it's a redirect (signIn throws NEXT_REDIRECT)
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Accept invitation error:", error);
    return { error: "Failed to accept invitation. Please try again." };
  }
}

/**
 * Accept invitation for an existing user
 */
export async function acceptInvitationExistingUser(
  _prevState: AcceptInvitationState,
  formData: FormData
): Promise<AcceptInvitationState> {
  try {
    const rawData = {
      token: formData.get("token"),
      password: formData.get("password"),
    };

    const parsed = existingUserSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { token, password } = parsed.data;

    // Validate token
    const validation = await validateInvitationToken(token);
    if (!validation.valid) {
      return { error: validation.error };
    }

    if (!validation.existingUser) {
      return { error: "No account found with this email. Please create an account." };
    }

    const invitation = await prisma.customerInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return { error: "Invalid invitation" };
    }

    // Verify password by attempting sign in check
    const user = await prisma.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
    });

    if (!user) {
      return { error: "User not found" };
    }

    // Verify password
    const { compare } = await import("bcryptjs");
    const passwordValid = await compare(password, user.passwordHash);

    if (!passwordValid) {
      return { error: "Incorrect password" };
    }

    // Check if user already has access to this customer
    const existingAccess = await prisma.customerAccess.findUnique({
      where: {
        userId_customerId: {
          userId: user.id,
          customerId: invitation.customerId,
        },
      },
    });

    if (existingAccess) {
      // Already has access, just mark invitation as accepted
      await prisma.customerInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
    } else {
      // Grant access
      await prisma.$transaction(async (tx) => {
        const customerAccess = await tx.customerAccess.create({
          data: {
            userId: user.id,
            customerId: invitation.customerId,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        });

        // If site-specific access, create SiteAccess record
        if (invitation.siteId) {
          await tx.siteAccess.create({
            data: {
              customerAccessId: customerAccess.id,
              siteId: invitation.siteId,
              organizationId: invitation.organizationId,
            },
          });
        }

        // Mark invitation as accepted
        await tx.customerInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            organizationId: invitation.organizationId,
            actorUserId: user.id,
            action: "INVITATION_ACCEPTED",
            entityType: "CustomerInvitation",
            entityId: invitation.id,
            details: {
              email: invitation.email,
              role: invitation.role,
              customerId: invitation.customerId,
            },
          },
        });
      });
    }

    // Sign in the user
    await signIn("credentials", {
      email: invitation.email.toLowerCase(),
      password,
      redirectTo: "/portal/dashboard",
    });

    return { success: true };
  } catch (error) {
    // Check if it's a redirect
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Accept invitation error:", error);
    return { error: "Failed to accept invitation. Please try again." };
  }
}

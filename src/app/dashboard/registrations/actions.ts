"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/access";
import { Role } from "@prisma/client";
import {
  sendRegistrationApprovedEmail,
  sendRegistrationRejectedEmail,
} from "@/lib/email";

const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

export type ActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Generate the next customer reference
 */
async function generateCustomerReference(organizationId: string): Promise<string> {
  const lastCustomer = await prisma.customer.findFirst({
    where: { organizationId },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });

  if (!lastCustomer?.reference) {
    return "CUST-0001";
  }

  const match = lastCustomer.reference.match(/CUST-(\d+)/);
  if (!match) {
    return "CUST-0001";
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `CUST-${nextNum.toString().padStart(4, "0")}`;
}

/**
 * Approve a customer registration
 *
 * This action:
 * 1. Verifies admin access
 * 2. Creates a User record with the registration's password hash
 * 3. Creates a Customer record
 * 4. Creates a CustomerAccess record with CUSTOMER_ADMIN role
 * 5. Updates the registration status to APPROVED
 * 6. Sends an approval notification email
 */
export async function approveRegistration(
  registrationId: string
): Promise<ActionResult> {
  try {
    // Verify admin access
    const { userId, organizationId } = await requireMember(undefined, ADMIN_ROLES);

    // Fetch the current user's name for recording who approved
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Fetch the registration
    const registration = await prisma.customerRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      return { success: false, error: "Registration not found" };
    }

    if (registration.status !== "PENDING_APPROVAL") {
      return {
        success: false,
        error: `Cannot approve registration with status: ${registration.status}`,
      };
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: registration.email },
    });

    if (existingUser) {
      return {
        success: false,
        error: "A user with this email already exists",
      };
    }

    // Generate customer reference
    const customerReference = await generateCustomerReference(organizationId);

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the User
      const newUser = await tx.user.create({
        data: {
          email: registration.email,
          name: registration.contactName,
          passwordHash: registration.passwordHash,
        },
      });

      // 2. Create the Customer
      const customer = await tx.customer.create({
        data: {
          organizationId,
          reference: customerReference,
          name: registration.companyName,
          email: registration.email,
          contactName: registration.contactName,
          status: "ACTIVE",
        },
      });

      // 3. Create the CustomerAccess record
      await tx.customerAccess.create({
        data: {
          userId: newUser.id,
          customerId: customer.id,
          organizationId,
          role: "CUSTOMER_ADMIN",
        },
      });

      // 4. Update the registration
      await tx.customerRegistration.update({
        where: { id: registrationId },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedByUserId: userId,
          reviewedByName: currentUser?.name || currentUser?.email || "Admin",
          createdCustomerId: customer.id,
          createdUserId: newUser.id,
        },
      });

      return { userId: newUser.id, customerId: customer.id };
    });

    // Send approval email
    try {
      await sendRegistrationApprovedEmail({
        to: registration.email,
        name: registration.contactName,
        companyName: registration.companyName,
      });
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
      // Don't fail the approval if email fails
    }

    revalidatePath("/dashboard/registrations");
    revalidatePath("/dashboard/customers");

    return { success: true };
  } catch (error) {
    console.error("Error approving registration:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve registration",
    };
  }
}

/**
 * Reject a customer registration
 *
 * This action:
 * 1. Verifies admin access
 * 2. Updates the registration status to REJECTED
 * 3. Sends a rejection notification email
 */
export async function rejectRegistration(
  registrationId: string,
  reason?: string
): Promise<ActionResult> {
  try {
    // Verify admin access
    const { userId } = await requireMember(undefined, ADMIN_ROLES);

    // Fetch the current user's name
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Fetch the registration
    const registration = await prisma.customerRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      return { success: false, error: "Registration not found" };
    }

    if (registration.status !== "PENDING_APPROVAL") {
      return {
        success: false,
        error: `Cannot reject registration with status: ${registration.status}`,
      };
    }

    // Update the registration
    await prisma.customerRegistration.update({
      where: { id: registrationId },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedByUserId: userId,
        reviewedByName: currentUser?.name || currentUser?.email || "Admin",
        rejectionReason: reason || null,
      },
    });

    // Send rejection email
    try {
      await sendRegistrationRejectedEmail({
        to: registration.email,
        name: registration.contactName,
        reason: reason || undefined,
      });
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
      // Don't fail the rejection if email fails
    }

    revalidatePath("/dashboard/registrations");

    return { success: true };
  } catch (error) {
    console.error("Error rejecting registration:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject registration",
    };
  }
}

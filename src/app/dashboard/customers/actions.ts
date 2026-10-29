"use server";

import { prisma } from "@/lib/prisma";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import {
  customerSchema,
  customerUpdateSchema,
  siteSchema,
  siteUpdateSchema,
  contactSchema,
  contactUpdateSchema,
  invitationSchema,
} from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import type { CustomerStatus } from "@prisma/client";
import { sendInvitationEmail, isEmailConfigured } from "@/lib/email";

// ============================================
// HELPER FUNCTIONS
// ============================================

function cleanEmptyStrings<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    if (result[key] === "") {
      result[key] = null as T[Extract<keyof T, string>];
    }
  }
  return result;
}

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

async function generateSiteReference(organizationId: string): Promise<string> {
  const lastSite = await prisma.site.findFirst({
    where: { organizationId },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });

  if (!lastSite?.reference) {
    return "SITE-0001";
  }

  const match = lastSite.reference.match(/SITE-(\d+)/);
  if (!match) {
    return "SITE-0001";
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `SITE-${nextNum.toString().padStart(4, "0")}`;
}

// ============================================
// CUSTOMER ACTIONS
// ============================================

export type CustomerActionState = {
  error?: string;
  success?: boolean;
  customerId?: string;
};

export async function createCustomer(
  _prevState: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = customerSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = cleanEmptyStrings(parsed.data);

    // Check for duplicate by name (case-insensitive)
    const existingByName = await prisma.customer.findFirst({
      where: {
        organizationId,
        name: { equals: data.name, mode: "insensitive" },
        status: "ACTIVE",
      },
    });

    if (existingByName) {
      return { error: `A customer named "${data.name}" already exists` };
    }

    // Check for duplicate by email if provided
    if (data.email) {
      const existingByEmail = await prisma.customer.findFirst({
        where: {
          organizationId,
          email: { equals: data.email, mode: "insensitive" },
          status: "ACTIVE",
        },
      });

      if (existingByEmail) {
        return { error: `A customer with email "${data.email}" already exists` };
      }
    }

    const reference = await generateCustomerReference(organizationId);

    const customer = await prisma.$transaction(async (tx) => {
      const c = await tx.customer.create({
        data: {
          ...data,
          reference,
          organizationId,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTOMER_CREATED",
          entityType: "Customer",
          entityId: c.id,
          details: { reference, name: data.name },
        },
      });

      return c;
    });

    revalidatePath("/dashboard/customers");
    return { success: true, customerId: customer.id };
  } catch (error) {
    console.error("Create customer error:", error);
    return { error: "Failed to create customer. Please try again." };
  }
}

export async function updateCustomer(
  _prevState: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = customerUpdateSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { id, ...data } = cleanEmptyStrings(parsed.data);

    // Verify customer exists and belongs to organization
    const existing = await prisma.customer.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { error: "Customer not found" };
    }

    // Check for duplicate name (excluding current customer)
    const duplicateName = await prisma.customer.findFirst({
      where: {
        organizationId,
        name: { equals: data.name, mode: "insensitive" },
        status: "ACTIVE",
        NOT: { id },
      },
    });

    if (duplicateName) {
      return { error: `A customer named "${data.name}" already exists` };
    }

    // Check for duplicate email (excluding current customer)
    if (data.email) {
      const duplicateEmail = await prisma.customer.findFirst({
        where: {
          organizationId,
          email: { equals: data.email, mode: "insensitive" },
          status: "ACTIVE",
          NOT: { id },
        },
      });

      if (duplicateEmail) {
        return { error: `A customer with email "${data.email}" already exists` };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data,
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTOMER_UPDATED",
          entityType: "Customer",
          entityId: id,
          details: { changes: data },
        },
      });
    });

    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${id}`);
    return { success: true, customerId: id };
  } catch (error) {
    console.error("Update customer error:", error);
    return { error: "Failed to update customer. Please try again." };
  }
}

export async function archiveCustomer(customerId: string): Promise<CustomerActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });

    if (!customer) {
      return { error: "Customer not found" };
    }

    if (customer.status === "ARCHIVED") {
      return { error: "Customer is already archived" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customerId },
        data: { status: "ARCHIVED" },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTOMER_ARCHIVED",
          entityType: "Customer",
          entityId: customerId,
        },
      });
    });

    revalidatePath("/dashboard/customers");
    return { success: true };
  } catch (error) {
    console.error("Archive customer error:", error);
    return { error: "Failed to archive customer. Please try again." };
  }
}

export async function reactivateCustomer(customerId: string): Promise<CustomerActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });

    if (!customer) {
      return { error: "Customer not found" };
    }

    if (customer.status === "ACTIVE") {
      return { error: "Customer is already active" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customerId },
        data: { status: "ACTIVE" },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTOMER_REACTIVATED",
          entityType: "Customer",
          entityId: customerId,
        },
      });
    });

    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${customerId}`);
    return { success: true };
  } catch (error) {
    console.error("Reactivate customer error:", error);
    return { error: "Failed to reactivate customer. Please try again." };
  }
}

// ============================================
// SITE ACTIONS
// ============================================

export type SiteActionState = {
  error?: string;
  success?: boolean;
  siteId?: string;
};

export async function createSite(
  _prevState: SiteActionState,
  formData: FormData
): Promise<SiteActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = siteSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = cleanEmptyStrings(parsed.data);

    // Verify customer exists and belongs to organization
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId },
    });

    if (!customer) {
      return { error: "Customer not found" };
    }

    // Verify zone if provided
    if (data.zoneId) {
      const zone = await prisma.collectionZone.findFirst({
        where: { id: data.zoneId, organizationId },
      });
      if (!zone) {
        return { error: "Collection zone not found" };
      }
    }

    const reference = await generateSiteReference(organizationId);

    const site = await prisma.$transaction(async (tx) => {
      // If this is set as default, unset other defaults for this customer
      if (data.isDefault) {
        await tx.site.updateMany({
          where: { customerId: data.customerId, organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const s = await tx.site.create({
        data: {
          ...data,
          reference,
          organizationId,
          zoneId: data.zoneId || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "SITE_CREATED",
          entityType: "Site",
          entityId: s.id,
          details: { reference, name: data.name, customerId: data.customerId },
        },
      });

      return s;
    });

    revalidatePath(`/dashboard/customers/${data.customerId}`);
    return { success: true, siteId: site.id };
  } catch (error) {
    console.error("Create site error:", error);
    return { error: "Failed to create site. Please try again." };
  }
}

export async function updateSite(
  _prevState: SiteActionState,
  formData: FormData
): Promise<SiteActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = siteUpdateSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { id, ...data } = cleanEmptyStrings(parsed.data);

    // Verify site exists and belongs to organization
    const existing = await prisma.site.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { error: "Site not found" };
    }

    // Verify zone if provided
    if (data.zoneId) {
      const zone = await prisma.collectionZone.findFirst({
        where: { id: data.zoneId, organizationId },
      });
      if (!zone) {
        return { error: "Collection zone not found" };
      }
    }

    await prisma.$transaction(async (tx) => {
      // If this is set as default, unset other defaults for this customer
      if (data.isDefault) {
        await tx.site.updateMany({
          where: {
            customerId: data.customerId,
            organizationId,
            isDefault: true,
            NOT: { id },
          },
          data: { isDefault: false },
        });
      }

      await tx.site.update({
        where: { id },
        data: {
          ...data,
          zoneId: data.zoneId || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "SITE_UPDATED",
          entityType: "Site",
          entityId: id,
          details: { changes: data },
        },
      });
    });

    revalidatePath(`/dashboard/customers/${data.customerId}`);
    return { success: true, siteId: id };
  } catch (error) {
    console.error("Update site error:", error);
    return { error: "Failed to update site. Please try again." };
  }
}

export async function toggleSiteActive(siteId: string): Promise<SiteActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const site = await prisma.site.findFirst({
      where: { id: siteId, organizationId },
    });

    if (!site) {
      return { error: "Site not found" };
    }

    const newStatus = !site.isActive;

    await prisma.$transaction(async (tx) => {
      await tx.site.update({
        where: { id: siteId },
        data: { isActive: newStatus },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: newStatus ? "SITE_ACTIVATED" : "SITE_DEACTIVATED",
          entityType: "Site",
          entityId: siteId,
        },
      });
    });

    revalidatePath(`/dashboard/customers/${site.customerId}`);
    return { success: true };
  } catch (error) {
    console.error("Toggle site error:", error);
    return { error: "Failed to update site. Please try again." };
  }
}

// ============================================
// CONTACT ACTIONS
// ============================================

export type ContactActionState = {
  error?: string;
  success?: boolean;
  contactId?: string;
};

export async function createContact(
  _prevState: ContactActionState,
  formData: FormData
): Promise<ContactActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = contactSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = cleanEmptyStrings(parsed.data);

    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId },
    });

    if (!customer) {
      return { error: "Customer not found" };
    }

    // Verify site if provided
    if (data.siteId) {
      const site = await prisma.site.findFirst({
        where: { id: data.siteId, organizationId, customerId: data.customerId },
      });
      if (!site) {
        return { error: "Site not found" };
      }
    }

    const contact = await prisma.$transaction(async (tx) => {
      // If this is set as primary, unset other primaries for this customer
      if (data.isPrimary) {
        await tx.customerContact.updateMany({
          where: { customerId: data.customerId, organizationId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const c = await tx.customerContact.create({
        data: {
          ...data,
          organizationId,
          siteId: data.siteId || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CONTACT_CREATED",
          entityType: "CustomerContact",
          entityId: c.id,
          details: { name: data.name, customerId: data.customerId },
        },
      });

      return c;
    });

    revalidatePath(`/dashboard/customers/${data.customerId}`);
    return { success: true, contactId: contact.id };
  } catch (error) {
    console.error("Create contact error:", error);
    return { error: "Failed to create contact. Please try again." };
  }
}

export async function updateContact(
  _prevState: ContactActionState,
  formData: FormData
): Promise<ContactActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = contactUpdateSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { id, ...data } = cleanEmptyStrings(parsed.data);

    // Verify contact exists
    const existing = await prisma.customerContact.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return { error: "Contact not found" };
    }

    await prisma.$transaction(async (tx) => {
      // If this is set as primary, unset other primaries for this customer
      if (data.isPrimary) {
        await tx.customerContact.updateMany({
          where: {
            customerId: data.customerId,
            organizationId,
            isPrimary: true,
            NOT: { id },
          },
          data: { isPrimary: false },
        });
      }

      await tx.customerContact.update({
        where: { id },
        data: {
          ...data,
          siteId: data.siteId || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CONTACT_UPDATED",
          entityType: "CustomerContact",
          entityId: id,
          details: { changes: data },
        },
      });
    });

    revalidatePath(`/dashboard/customers/${data.customerId}`);
    return { success: true, contactId: id };
  } catch (error) {
    console.error("Update contact error:", error);
    return { error: "Failed to update contact. Please try again." };
  }
}

export async function toggleContactActive(contactId: string): Promise<ContactActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const contact = await prisma.customerContact.findFirst({
      where: { id: contactId, organizationId },
    });

    if (!contact) {
      return { error: "Contact not found" };
    }

    const newStatus = !contact.isActive;

    await prisma.$transaction(async (tx) => {
      await tx.customerContact.update({
        where: { id: contactId },
        data: { isActive: newStatus },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: newStatus ? "CONTACT_ACTIVATED" : "CONTACT_DEACTIVATED",
          entityType: "CustomerContact",
          entityId: contactId,
        },
      });
    });

    revalidatePath(`/dashboard/customers/${contact.customerId}`);
    return { success: true };
  } catch (error) {
    console.error("Toggle contact error:", error);
    return { error: "Failed to update contact. Please try again." };
  }
}

// ============================================
// INVITATION ACTIONS
// ============================================

export type InvitationActionState = {
  error?: string;
  success?: boolean;
  invitationId?: string;
  emailSent?: boolean;
  emailError?: string;
};

export async function createInvitation(
  _prevState: InvitationActionState,
  formData: FormData
): Promise<InvitationActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const rawData = Object.fromEntries(formData);
    const parsed = invitationSchema.safeParse(rawData);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;

    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId },
    });

    if (!customer) {
      return { error: "Customer not found" };
    }

    // Verify site if provided
    if (data.siteId) {
      const site = await prisma.site.findFirst({
        where: { id: data.siteId, organizationId, customerId: data.customerId },
      });
      if (!site) {
        return { error: "Site not found" };
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.customerInvitation.findFirst({
      where: {
        organizationId,
        customerId: data.customerId,
        email: data.email.toLowerCase(),
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return { error: "An invitation has already been sent to this email address" };
    }

    // Check if user already has access
    const existingAccess = await prisma.customerAccess.findFirst({
      where: {
        customerId: data.customerId,
        user: { email: data.email.toLowerCase() },
      },
    });

    if (existingAccess) {
      return { error: "This user already has access to this customer" };
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    // Get inviter name for email
    const inviter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const inviterName = inviter?.name || inviter?.email || "A team member";

    const invitation = await prisma.$transaction(async (tx) => {
      const inv = await tx.customerInvitation.create({
        data: {
          organizationId,
          customerId: data.customerId,
          siteId: data.siteId || null,
          email: data.email.toLowerCase(),
          role: data.role,
          token,
          expiresAt,
          invitedByUserId: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "INVITATION_CREATED",
          entityType: "CustomerInvitation",
          entityId: inv.id,
          details: {
            email: data.email,
            customerId: data.customerId,
            role: data.role,
          },
        },
      });

      return inv;
    });

    // Send invitation email
    let emailSent = false;
    let emailError: string | undefined;

    if (isEmailConfigured()) {
      const emailResult = await sendInvitationEmail({
        to: data.email,
        customerName: customer.name,
        invitedByName: inviterName,
        role: data.role,
        token,
        expiresAt,
      });

      if (emailResult.success) {
        emailSent = true;
        // Update invitation with email tracking info
        await prisma.customerInvitation.update({
          where: { id: invitation.id },
          data: {
            emailSentAt: new Date(),
            emailMessageId: emailResult.messageId,
          },
        });
      } else {
        emailError = emailResult.error;
        // Track email failure
        await prisma.customerInvitation.update({
          where: { id: invitation.id },
          data: {
            emailFailedAt: new Date(),
            emailFailureReason: emailResult.error,
          },
        });
      }
    } else {
      emailError = "Email service not configured. Set RESEND_API_KEY environment variable.";
    }

    revalidatePath(`/dashboard/customers/${data.customerId}`);
    return {
      success: true,
      invitationId: invitation.id,
      emailSent,
      emailError,
    };
  } catch (error) {
    console.error("Create invitation error:", error);
    return { error: "Failed to create invitation. Please try again." };
  }
}

export async function resendInvitation(invitationId: string): Promise<InvitationActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const invitation = await prisma.customerInvitation.findFirst({
      where: { id: invitationId, organizationId },
      include: {
        customer: { select: { name: true } },
      },
    });

    if (!invitation) {
      return { error: "Invitation not found" };
    }

    if (invitation.acceptedAt) {
      return { error: "Invitation has already been accepted" };
    }

    if (invitation.revokedAt) {
      return { error: "Invitation has been revoked" };
    }

    if (invitation.expiresAt < new Date()) {
      return { error: "Invitation has expired. Please create a new invitation." };
    }

    if (!isEmailConfigured()) {
      return { error: "Email service not configured. Set RESEND_API_KEY environment variable." };
    }

    // Get inviter name for email
    const inviter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const inviterName = inviter?.name || inviter?.email || "A team member";

    const emailResult = await sendInvitationEmail({
      to: invitation.email,
      customerName: invitation.customer.name,
      invitedByName: inviterName,
      role: invitation.role,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    });

    if (emailResult.success) {
      await prisma.$transaction(async (tx) => {
        await tx.customerInvitation.update({
          where: { id: invitationId },
          data: {
            emailSentAt: new Date(),
            emailMessageId: emailResult.messageId,
            lastResendAt: new Date(),
            resendCount: { increment: 1 },
            emailFailedAt: null,
            emailFailureReason: null,
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId,
            actorUserId: userId,
            action: "INVITATION_RESENT",
            entityType: "CustomerInvitation",
            entityId: invitationId,
            details: { email: invitation.email },
          },
        });
      });

      revalidatePath(`/dashboard/customers/${invitation.customerId}`);
      return { success: true, emailSent: true };
    } else {
      await prisma.customerInvitation.update({
        where: { id: invitationId },
        data: {
          emailFailedAt: new Date(),
          emailFailureReason: emailResult.error,
        },
      });

      revalidatePath(`/dashboard/customers/${invitation.customerId}`);
      return { success: false, emailError: emailResult.error };
    }
  } catch (error) {
    console.error("Resend invitation error:", error);
    return { error: "Failed to resend invitation. Please try again." };
  }
}

export async function revokeInvitation(invitationId: string): Promise<InvitationActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const invitation = await prisma.customerInvitation.findFirst({
      where: { id: invitationId, organizationId },
    });

    if (!invitation) {
      return { error: "Invitation not found" };
    }

    if (invitation.acceptedAt) {
      return { error: "Invitation has already been accepted" };
    }

    if (invitation.revokedAt) {
      return { error: "Invitation has already been revoked" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.customerInvitation.update({
        where: { id: invitationId },
        data: { revokedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "INVITATION_REVOKED",
          entityType: "CustomerInvitation",
          entityId: invitationId,
        },
      });
    });

    revalidatePath(`/dashboard/customers/${invitation.customerId}`);
    return { success: true };
  } catch (error) {
    console.error("Revoke invitation error:", error);
    return { error: "Failed to revoke invitation. Please try again." };
  }
}

export async function removeCustomerAccess(accessId: string): Promise<InvitationActionState> {
  try {
    const { organizationId, userId } = await requireMember(undefined, MANAGEMENT_ROLES);

    const access = await prisma.customerAccess.findFirst({
      where: { id: accessId, organizationId },
    });

    if (!access) {
      return { error: "Access record not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.customerAccess.delete({
        where: { id: accessId },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "CUSTOMER_ACCESS_REMOVED",
          entityType: "CustomerAccess",
          entityId: accessId,
          details: { customerId: access.customerId, removedUserId: access.userId },
        },
      });
    });

    revalidatePath(`/dashboard/customers/${access.customerId}`);
    return { success: true };
  } catch (error) {
    console.error("Remove access error:", error);
    return { error: "Failed to remove access. Please try again." };
  }
}

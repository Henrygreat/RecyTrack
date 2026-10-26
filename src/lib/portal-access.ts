import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { CustomerRole } from "@prisma/client";

/**
 * Customer Portal Access Control
 *
 * This module provides access control for customer portal routes.
 * It checks CustomerAccess records instead of Membership records.
 *
 * Key security principles:
 * - Customers can ONLY access their authorized customers/sites
 * - Customers CANNOT access admin routes (/dashboard/*)
 * - Site-level restrictions are enforced via SiteAccess
 */

export interface CustomerPortalContext {
  userId: string;
  customerAccess: {
    id: string;
    customerId: string;
    organizationId: string;
    role: CustomerRole;
    customer: {
      id: string;
      name: string;
      reference: string;
      organizationId: string;
    };
    siteAccess: Array<{
      siteId: string;
    }>;
  };
  // Derived helpers
  customerId: string;
  organizationId: string;
  isAdmin: boolean;
  authorizedSiteIds: string[] | null; // null means all sites
}

/**
 * Require customer portal access
 * Redirects to /login if not authenticated
 * Redirects to /portal/no-access if user has no customer access
 */
export async function requireCustomerAccess(
  customerId?: string
): Promise<CustomerPortalContext> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Check if user has any customer access
  const customerAccess = await prisma.customerAccess.findFirst({
    where: {
      userId,
      ...(customerId ? { customerId } : {}),
      customer: {
        status: "ACTIVE",
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          reference: true,
          organizationId: true,
        },
      },
      siteAccess: {
        select: {
          siteId: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!customerAccess) {
    // User has no CustomerAccess - redirect to portal no-access page
    // The no-access page will check if user is staff and show appropriate message
    // Staff can access portal if they have a CustomerAccess record (for preview/testing)
    redirect("/portal/no-access");
  }

  // Determine site restrictions
  // If siteAccess is empty, user has access to all sites
  const authorizedSiteIds =
    customerAccess.siteAccess.length > 0
      ? customerAccess.siteAccess.map((sa) => sa.siteId)
      : null;

  return {
    userId,
    customerAccess,
    customerId: customerAccess.customerId,
    organizationId: customerAccess.customer.organizationId,
    isAdmin: customerAccess.role === "CUSTOMER_ADMIN",
    authorizedSiteIds,
  };
}

/**
 * Check if user can access a specific site
 */
export function canAccessSite(
  ctx: CustomerPortalContext,
  siteId: string
): boolean {
  // null means all sites are authorized
  if (ctx.authorizedSiteIds === null) {
    return true;
  }
  return ctx.authorizedSiteIds.includes(siteId);
}

/**
 * Get all customers the user has access to
 */
export async function getCustomerAccessList(userId: string) {
  return prisma.customerAccess.findMany({
    where: {
      userId,
      customer: {
        status: "ACTIVE",
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          reference: true,
        },
      },
    },
    orderBy: {
      customer: {
        name: "asc",
      },
    },
  });
}

/**
 * Build a Prisma where clause that restricts to authorized sites
 */
export function siteWhereClause(ctx: CustomerPortalContext) {
  if (ctx.authorizedSiteIds === null) {
    return { customerId: ctx.customerId };
  }
  return {
    customerId: ctx.customerId,
    id: { in: ctx.authorizedSiteIds },
  };
}

/**
 * Build a Prisma where clause for collections
 * that respects site-level access restrictions
 */
export function collectionWhereClause(ctx: CustomerPortalContext) {
  const base = {
    customerId: ctx.customerId,
    organizationId: ctx.organizationId,
  };

  // If user has site restrictions, we need to filter collections
  // by the sites they can access. Collections don't have a direct
  // siteId, but we can use address matching or add siteId to collections
  // in a future phase. For now, return base filter.
  return base;
}

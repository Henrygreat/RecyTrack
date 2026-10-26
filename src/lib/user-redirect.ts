import { prisma } from "@/lib/prisma";

export type UserAccessType = "staff" | "customer" | "both" | "none";

export interface UserAccessInfo {
  type: UserAccessType;
  redirectPath: string;
  hasMembership: boolean;
  hasCustomerAccess: boolean;
}

/**
 * Determine where a user should be redirected based on their access type.
 *
 * - Staff (Membership only) -> /dashboard
 * - Customer (CustomerAccess only) -> /portal/dashboard
 * - Both -> /dashboard (staff takes priority, but can access portal)
 * - None -> /no-access
 */
export async function getUserAccessInfo(userId: string): Promise<UserAccessInfo> {
  const [membership, customerAccess] = await Promise.all([
    prisma.membership.findFirst({
      where: { userId },
      select: { id: true },
    }),
    prisma.customerAccess.findFirst({
      where: {
        userId,
        customer: { status: "ACTIVE" },
      },
      select: { id: true },
    }),
  ]);

  const hasMembership = !!membership;
  const hasCustomerAccess = !!customerAccess;

  if (hasMembership && hasCustomerAccess) {
    return {
      type: "both",
      redirectPath: "/dashboard",
      hasMembership: true,
      hasCustomerAccess: true,
    };
  }

  if (hasMembership) {
    return {
      type: "staff",
      redirectPath: "/dashboard",
      hasMembership: true,
      hasCustomerAccess: false,
    };
  }

  if (hasCustomerAccess) {
    return {
      type: "customer",
      redirectPath: "/portal/dashboard",
      hasMembership: false,
      hasCustomerAccess: true,
    };
  }

  return {
    type: "none",
    redirectPath: "/no-access",
    hasMembership: false,
    hasCustomerAccess: false,
  };
}

/**
 * Get the default redirect path for a user after login.
 */
export async function getPostLoginRedirect(userId: string): Promise<string> {
  const info = await getUserAccessInfo(userId);
  return info.redirectPath;
}

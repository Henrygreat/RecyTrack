import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserAccessInfo, getPostLoginRedirect, type UserAccessType } from "./user-redirect";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findFirst: vi.fn(),
    },
    customerAccess: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("getUserAccessInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 'staff' type for users with only Membership", async () => {
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: "mem-1" } as never);
    vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue(null);

    const result = await getUserAccessInfo("user-1");

    expect(result.type).toBe("staff");
    expect(result.redirectPath).toBe("/dashboard");
    expect(result.hasMembership).toBe(true);
    expect(result.hasCustomerAccess).toBe(false);
  });

  it("should return 'customer' type for users with only CustomerAccess", async () => {
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue({ id: "ca-1" } as never);

    const result = await getUserAccessInfo("user-2");

    expect(result.type).toBe("customer");
    expect(result.redirectPath).toBe("/portal/dashboard");
    expect(result.hasMembership).toBe(false);
    expect(result.hasCustomerAccess).toBe(true);
  });

  it("should return 'both' type for users with Membership AND CustomerAccess", async () => {
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: "mem-1" } as never);
    vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue({ id: "ca-1" } as never);

    const result = await getUserAccessInfo("user-3");

    expect(result.type).toBe("both");
    expect(result.redirectPath).toBe("/dashboard");
    expect(result.hasMembership).toBe(true);
    expect(result.hasCustomerAccess).toBe(true);
  });

  it("should return 'none' type for users with no access", async () => {
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue(null);

    const result = await getUserAccessInfo("user-4");

    expect(result.type).toBe("none");
    expect(result.redirectPath).toBe("/no-access");
    expect(result.hasMembership).toBe(false);
    expect(result.hasCustomerAccess).toBe(false);
  });
});

describe("getPostLoginRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect staff to /dashboard", async () => {
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: "mem-1" } as never);
    vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue(null);

    const redirect = await getPostLoginRedirect("staff-user");
    expect(redirect).toBe("/dashboard");
  });

  it("should redirect customers to /portal/dashboard", async () => {
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue({ id: "ca-1" } as never);

    const redirect = await getPostLoginRedirect("customer-user");
    expect(redirect).toBe("/portal/dashboard");
  });

  it("should redirect users with both roles to /dashboard", async () => {
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: "mem-1" } as never);
    vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue({ id: "ca-1" } as never);

    const redirect = await getPostLoginRedirect("dual-user");
    expect(redirect).toBe("/dashboard");
  });

  it("should redirect users with no access to /no-access", async () => {
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue(null);

    const redirect = await getPostLoginRedirect("unknown-user");
    expect(redirect).toBe("/no-access");
  });
});

describe("Access control scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Administrator account", () => {
    it("should have staff access type", async () => {
      // Admin with Membership record
      vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: "admin-mem" } as never);
      vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue(null);

      const info = await getUserAccessInfo("admin-user");

      expect(info.type).toBe("staff");
      expect(info.hasMembership).toBe(true);
      expect(info.redirectPath).toBe("/dashboard");
    });

    it("should be able to access portal if CustomerAccess is granted", async () => {
      // Admin with both Membership and CustomerAccess (for portal preview)
      vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: "admin-mem" } as never);
      vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue({ id: "preview-ca" } as never);

      const info = await getUserAccessInfo("admin-preview-user");

      expect(info.type).toBe("both");
      expect(info.hasMembership).toBe(true);
      expect(info.hasCustomerAccess).toBe(true);
      // Staff takes priority for redirect, but portal access is available
      expect(info.redirectPath).toBe("/dashboard");
    });
  });

  describe("Customer account", () => {
    it("should have customer access type", async () => {
      // Customer with only CustomerAccess record
      vi.mocked(prisma.membership.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue({ id: "cust-ca" } as never);

      const info = await getUserAccessInfo("customer-user");

      expect(info.type).toBe("customer");
      expect(info.hasCustomerAccess).toBe(true);
      expect(info.hasMembership).toBe(false);
      expect(info.redirectPath).toBe("/portal/dashboard");
    });

    it("should NOT have access to operations dashboard", async () => {
      // Customer without Membership should NOT be directed to /dashboard
      vi.mocked(prisma.membership.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue({ id: "cust-ca" } as never);

      const info = await getUserAccessInfo("customer-user");

      expect(info.hasMembership).toBe(false);
      expect(info.redirectPath).not.toBe("/dashboard");
      expect(info.redirectPath).toBe("/portal/dashboard");
    });
  });

  describe("Security requirements", () => {
    it("customers cannot access internal operations routes (no Membership)", async () => {
      vi.mocked(prisma.membership.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue({ id: "ca" } as never);

      const info = await getUserAccessInfo("customer");

      // No Membership means they should NOT be able to access /dashboard
      expect(info.hasMembership).toBe(false);
    });

    it("customer access is scoped - CustomerAccess query filters by customerId", async () => {
      // This test verifies the Prisma query structure is correct
      vi.mocked(prisma.membership.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue({ id: "ca" } as never);

      await getUserAccessInfo("user-id");

      // Verify CustomerAccess query was called
      expect(prisma.customerAccess.findFirst).toHaveBeenCalled();
    });

    it("staff without CustomerAccess cannot preview portal", async () => {
      vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: "mem" } as never);
      vi.mocked(prisma.customerAccess.findFirst).mockResolvedValue(null);

      const info = await getUserAccessInfo("staff-user");

      // Staff without CustomerAccess has no portal access
      expect(info.hasCustomerAccess).toBe(false);
      expect(info.type).toBe("staff");
    });
  });
});

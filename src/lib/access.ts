import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
export async function requireMember(organizationId?: string, allowedRoles?: Role[]) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, ...(organizationId ? { organizationId } : {}), ...(allowedRoles ? { role: { in: allowedRoles } } : {}) },
    include: { organization: true }, orderBy: { id: "asc" }
  });
  if (!membership) redirect("/no-access");
  return { userId: session.user.id, membership, organizationId: membership.organizationId };
}
export const STAFF_ROLES: Role[] = ["OWNER", "ADMIN", "OPERATIONS", "WAREHOUSE"];
export const MANAGEMENT_ROLES: Role[] = ["OWNER", "ADMIN", "OPERATIONS"];

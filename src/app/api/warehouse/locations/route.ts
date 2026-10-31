import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's organization through membership
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
    orderBy: { id: "asc" },
  });

  if (!membership) {
    return NextResponse.json({ error: "No organization access" }, { status: 403 });
  }

  try {
    const locations = await prisma.warehouseLocation.findMany({
      where: {
        organizationId: membership.organizationId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Get locations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

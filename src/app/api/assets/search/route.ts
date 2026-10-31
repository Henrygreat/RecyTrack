import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (!query || query.length < 2) {
    return NextResponse.json({ assets: [] });
  }

  try {
    const assets = await prisma.asset.findMany({
      where: {
        organizationId: membership.organizationId,
        OR: [
          { assetTag: { contains: query, mode: "insensitive" } },
          { serialNumber: { contains: query, mode: "insensitive" } },
          { manufacturer: { contains: query, mode: "insensitive" } },
          { model: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        assetTag: true,
        category: true,
        manufacturer: true,
        model: true,
        serialNumber: true,
        status: true,
      },
      take: limit,
      orderBy: { assetTag: "asc" },
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("Asset search error:", error);
    return NextResponse.json(
      { error: "Failed to search assets" },
      { status: 500 }
    );
  }
}

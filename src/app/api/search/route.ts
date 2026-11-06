"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface SearchResult {
  id: string;
  type: "asset" | "customer" | "site" | "collection" | "erasure" | "destruction";
  title: string;
  subtitle?: string;
  url: string;
  metadata?: Record<string, string>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's organization through membership
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true, role: true },
    orderBy: { id: "asc" },
  });

  if (!membership) {
    return NextResponse.json({ error: "No organization access" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim() || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const orgId = membership.organizationId;
  const results: SearchResult[] = [];

  try {
    // Search assets (tag, serial number, model)
    const assets = await prisma.asset.findMany({
      where: {
        organizationId: orgId,
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
      take: 5,
      orderBy: { assetTag: "asc" },
    });

    for (const asset of assets) {
      results.push({
        id: asset.id,
        type: "asset",
        title: asset.assetTag,
        subtitle: [asset.manufacturer, asset.model].filter(Boolean).join(" ") || asset.category,
        url: `/dashboard/assets/${asset.id}`,
        metadata: {
          status: asset.status,
          serial: asset.serialNumber || "",
        },
      });
    }

    // Search customers
    const customers = await prisma.customer.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { reference: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        reference: true,
        name: true,
        email: true,
        status: true,
      },
      take: 5,
      orderBy: { name: "asc" },
    });

    for (const customer of customers) {
      results.push({
        id: customer.id,
        type: "customer",
        title: customer.name,
        subtitle: customer.reference,
        url: `/dashboard/customers/${customer.id}`,
        metadata: {
          email: customer.email || "",
          status: customer.status,
        },
      });
    }

    // Search customer sites
    const sites = await prisma.site.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { reference: { contains: query, mode: "insensitive" } },
          { address: { contains: query, mode: "insensitive" } },
          { postcode: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        reference: true,
        name: true,
        address: true,
        postcode: true,
        customerId: true,
        customer: { select: { name: true } },
      },
      take: 5,
      orderBy: { name: "asc" },
    });

    for (const site of sites) {
      results.push({
        id: site.id,
        type: "site",
        title: site.name,
        subtitle: `${site.customer.name} - ${site.postcode}`,
        url: `/dashboard/customers/${site.customerId}`,
        metadata: {
          address: site.address,
        },
      });
    }

    // Search collections
    const collections = await prisma.collection.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { reference: { contains: query, mode: "insensitive" } },
          { address: { contains: query, mode: "insensitive" } },
          { postcode: { contains: query, mode: "insensitive" } },
          { contactName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        reference: true,
        status: true,
        scheduledDate: true,
        customer: { select: { name: true } },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    for (const collection of collections) {
      results.push({
        id: collection.id,
        type: "collection",
        title: collection.reference,
        subtitle: collection.customer.name,
        url: `/dashboard/collections/${collection.id}`,
        metadata: {
          status: collection.status,
          date: collection.scheduledDate?.toISOString().split("T")[0] || "",
        },
      });
    }

    // Search erasure jobs
    const erasureJobs = await prisma.erasureJob.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { reference: { contains: query, mode: "insensitive" } },
          { methodName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        reference: true,
        status: true,
        methodName: true,
        storageMedia: {
          select: { reference: true },
        },
      },
      take: 3,
      orderBy: { createdAt: "desc" },
    });

    for (const job of erasureJobs) {
      results.push({
        id: job.id,
        type: "erasure",
        title: job.reference,
        subtitle: job.methodName,
        url: `/dashboard/destruction/jobs/${job.id}`,
        metadata: {
          status: job.status,
          media: job.storageMedia.reference,
        },
      });
    }

    // Search destruction jobs
    const destructionJobs = await prisma.destructionJob.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { reference: { contains: query, mode: "insensitive" } },
          { destructionReason: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        reference: true,
        status: true,
        destructionMethod: true,
        storageMedia: {
          select: { reference: true },
        },
      },
      take: 3,
      orderBy: { createdAt: "desc" },
    });

    for (const job of destructionJobs) {
      results.push({
        id: job.id,
        type: "destruction",
        title: job.reference,
        subtitle: job.destructionMethod.replace(/_/g, " "),
        url: `/dashboard/destruction/physical/${job.id}`,
        metadata: {
          status: job.status,
          media: job.storageMedia.reference,
        },
      });
    }

    return NextResponse.json({
      results: results.slice(0, limit),
      total: results.length,
    });
  } catch (error) {
    console.error("Global search error:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}

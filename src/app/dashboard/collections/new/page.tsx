import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CollectionForm } from "../components/collection-form";

export default async function NewCollection() {
  const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

  const [customers, routes] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId, status: "ACTIVE" },
      include: {
        sites: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.routeDate.findMany({
      where: {
        organizationId,
        isOpen: true,
        serviceDate: {
          gte: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"),
        },
      },
      include: {
        zone: true,
        _count: {
          select: {
            collections: {
              where: { status: { notIn: ["CANCELLED", "COMPLETED"] } },
            },
          },
        },
      },
      orderBy: { serviceDate: "asc" },
      take: 60,
    }),
  ]);

  // Filter routes with available capacity
  const availableRoutes = routes.filter((r) => r._count.collections < r.capacity);

  return (
    <>
      <Link
        href="/dashboard/collections"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          color: "#64748b",
          fontSize: "0.875rem",
          marginBottom: "1rem",
          textDecoration: "none",
        }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Collections
      </Link>

      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>
          Book Collection
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
          Create a new collection booking for a customer
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CollectionForm customers={customers} routes={availableRoutes} />
        </CardContent>
      </Card>
    </>
  );
}

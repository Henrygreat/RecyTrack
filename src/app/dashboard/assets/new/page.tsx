import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AssetForm } from "../components/asset-form";

export default async function NewAsset() {
  const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

  const [customers, collections, warehouseLocations] = await Promise.all([
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
    prisma.collection.findMany({
      where: {
        organizationId,
        status: { in: ["RECEIVED", "COLLECTED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.warehouseLocation.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <Link
        href="/dashboard/assets"
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
        Back to Assets
      </Link>

      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>
          Register Asset
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
          Add a new IT asset to the inventory
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AssetForm
            customers={customers}
            collections={collections}
            warehouseLocations={warehouseLocations}
            mode="create"
          />
        </CardContent>
      </Card>
    </>
  );
}

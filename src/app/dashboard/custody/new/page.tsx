import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, STAFF_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CustodyTransferForm } from "../components/custody-transfer-form";

export default async function NewCustodyTransfer({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);
  const params = await searchParams;

  const [assets, users, locations] = await Promise.all([
    prisma.asset.findMany({
      where: { organizationId },
      select: {
        id: true,
        assetTag: true,
        manufacturer: true,
        model: true,
        serialNumber: true,
      },
      orderBy: { assetTag: "asc" },
      take: 500,
    }),
    prisma.user.findMany({
      where: {
        memberships: {
          some: { organizationId },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.warehouseLocation.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <Link
        href="/dashboard/custody"
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
        Back to Custody
      </Link>

      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>
          Initiate Custody Transfer
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
          Record a new chain of custody transfer for an asset
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CustodyTransferForm
            assets={assets}
            users={users}
            locations={locations}
            preselectedAssetId={params.assetId}
          />
        </CardContent>
      </Card>
    </>
  );
}

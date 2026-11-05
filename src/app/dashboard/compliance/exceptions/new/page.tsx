import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, STAFF_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ExceptionForm } from "../components/exception-form";

export default async function NewException({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string; customerId?: string }>;
}) {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);
  const params = await searchParams;

  const [assets, users, customers] = await Promise.all([
    prisma.asset.findMany({
      where: { organizationId },
      select: {
        id: true,
        assetTag: true,
        manufacturer: true,
        model: true,
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
    prisma.customer.findMany({
      where: { organizationId, status: "ACTIVE" },
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
        href="/dashboard/compliance/exceptions"
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
        Back to Exceptions
      </Link>

      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>
          Report Compliance Exception
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
          Document a compliance issue or deviation from standard procedures
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exception Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ExceptionForm
            assets={assets}
            users={users}
            customers={customers}
          />
        </CardContent>
      </Card>
    </>
  );
}

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AuditForm } from "../components/audit-form";

export default async function NewAudit() {
  // Require management role to create audits
  const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

  const [users, customers] = await Promise.all([
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
        href="/dashboard/compliance/audits"
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
        Back to Audits
      </Link>

      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>
          Schedule Compliance Audit
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
          Plan a new internal or external compliance audit
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditForm
            users={users}
            customers={customers}
          />
        </CardContent>
      </Card>
    </>
  );
}

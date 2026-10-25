import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SiteForm } from "../../../components/site-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewSite({ params }: PageProps) {
  const { id: customerId } = await params;
  const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

  const [customer, zones] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, organizationId },
      select: { id: true, name: true, reference: true },
    }),
    prisma.collectionZone.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <>
      <Link
        href={`/dashboard/customers/${customerId}?tab=sites`}
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
        Back to {customer.name}
      </Link>

      <PageHeader
        title="Add Site"
        description={`Create a new collection site for ${customer.name}`}
      />

      <Card>
        <CardContent style={{ padding: "1.5rem" }}>
          <SiteForm customerId={customerId} zones={zones} />
        </CardContent>
      </Card>
    </>
  );
}

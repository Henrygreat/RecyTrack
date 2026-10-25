import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { InvitationForm } from "../../components/invitation-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InviteUser({ params }: PageProps) {
  const { id: customerId } = await params;
  const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

  const [customer, sites] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, organizationId },
      select: { id: true, name: true, reference: true },
    }),
    prisma.site.findMany({
      where: { customerId, organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <>
      <Link
        href={`/dashboard/customers/${customerId}?tab=access`}
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
        title="Invite Portal User"
        description={`Invite a user to access the customer portal for ${customer.name}`}
      />

      <Card>
        <CardContent style={{ padding: "1.5rem" }}>
          <InvitationForm
            customerId={customerId}
            customerName={customer.name}
            sites={sites}
          />
        </CardContent>
      </Card>
    </>
  );
}

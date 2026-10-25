import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerForm } from "../../components/customer-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomer({ params }: PageProps) {
  const { id } = await params;
  const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId },
  });

  if (!customer) {
    notFound();
  }

  return (
    <>
      <Link
        href={`/dashboard/customers/${id}`}
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
        Back to Customer
      </Link>

      <PageHeader
        title="Edit Customer"
        description={`Editing ${customer.name} (${customer.reference})`}
      />

      <Card>
        <CardContent style={{ padding: "1.5rem" }}>
          <CustomerForm customer={customer} />
        </CardContent>
      </Card>
    </>
  );
}

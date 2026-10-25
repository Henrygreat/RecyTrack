import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "../../../../components/contact-form";

interface PageProps {
  params: Promise<{ id: string; contactId: string }>;
}

export default async function EditContact({ params }: PageProps) {
  const { id: customerId, contactId } = await params;
  const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);

  const [customer, contact, sites] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, organizationId },
      select: { id: true, name: true, reference: true },
    }),
    prisma.customerContact.findFirst({
      where: { id: contactId, customerId, organizationId },
    }),
    prisma.site.findMany({
      where: { customerId, organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!customer || !contact) {
    notFound();
  }

  return (
    <>
      <Link
        href={`/dashboard/customers/${customerId}?tab=contacts`}
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
        title="Edit Contact"
        description={`Editing ${contact.name}`}
      />

      <Card>
        <CardContent style={{ padding: "1.5rem" }}>
          <ContactForm customerId={customerId} contact={contact} sites={sites} />
        </CardContent>
      </Card>
    </>
  );
}

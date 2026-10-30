import { notFound, redirect } from "next/navigation";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { WarehouseLocationForm } from "../../components/warehouse-location-form";

export default async function EditWarehouseLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId, membership } = await requireMember();

  if (!MANAGEMENT_ROLES.includes(membership.role)) {
    redirect(`/dashboard/warehouse/${id}`);
  }

  const location = await prisma.warehouseLocation.findFirst({
    where: { id, organizationId },
  });

  if (!location) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Edit Location"
        description={`Editing ${location.code} - ${location.name}`}
        backHref={`/dashboard/warehouse/${id}`}
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <WarehouseLocationForm location={location} />
        </CardContent>
      </Card>
    </>
  );
}

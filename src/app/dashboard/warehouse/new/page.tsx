import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { WarehouseLocationForm } from "../components/warehouse-location-form";

export default async function NewWarehouseLocationPage() {
  const { membership } = await requireMember();

  if (!MANAGEMENT_ROLES.includes(membership.role)) {
    redirect("/dashboard/warehouse");
  }

  return (
    <>
      <PageHeader
        title="Add Warehouse Location"
        description="Create a new storage location in your warehouse"
        backHref="/dashboard/warehouse"
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <WarehouseLocationForm />
        </CardContent>
      </Card>
    </>
  );
}

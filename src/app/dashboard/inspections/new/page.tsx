import { redirect } from "next/navigation";
import { requireMember, STAFF_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { InspectionForm } from "../components/inspection-form";

export default async function NewInspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);
  const params = await searchParams;

  // Get assets for selection (or preselect if assetId provided)
  const [assets, templates] = await Promise.all([
    prisma.asset.findMany({
      where: {
        organizationId,
        status: { in: ["RECEIVED", "INSPECTION"] },
      },
      select: {
        id: true,
        assetTag: true,
        manufacturer: true,
        model: true,
        category: true,
        serialNumber: true,
      },
      orderBy: { assetTag: "asc" },
      take: 200,
    }),
    prisma.inspectionTemplate.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        version: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // If assetId provided, verify it exists
  const preselectedAsset = params.assetId
    ? assets.find((a) => a.id === params.assetId)
    : undefined;

  return (
    <>
      <PageHeader
        title="New Inspection"
        description="Create a new asset inspection"
        backHref="/dashboard/inspections"
      />

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <InspectionForm
            assets={assets}
            templates={templates}
            preselectedAssetId={preselectedAsset?.id}
          />
        </CardContent>
      </Card>
    </>
  );
}

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, STAFF_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StorageMediaForm } from "../components/storage-media-form";

export default async function NewStorageMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);
  const params = await searchParams;

  // Get assets that could have storage media
  const assets = await prisma.asset.findMany({
    where: {
      organizationId,
      status: { notIn: ["DESTROYED", "RELEASED", "RECYCLED"] },
    },
    select: {
      id: true,
      assetTag: true,
      category: true,
      manufacturer: true,
      model: true,
      serialNumber: true,
      customer: {
        select: { id: true, name: true, reference: true },
      },
      _count: {
        select: { storageMedia: true },
      },
    },
    orderBy: { assetTag: "asc" },
    take: 500,
  });

  // Get warehouse locations
  const warehouseLocations = await prisma.warehouseLocation.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  // If assetId provided, get pre-selected asset
  const preSelectedAsset = params.assetId
    ? assets.find((a) => a.id === params.assetId)
    : null;

  return (
    <>
      <Link
        href="/dashboard/destruction/media"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Media Register
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Register Storage Media</h1>
        <p className="text-sm text-slate-500">
          Register a data-bearing storage device for sanitisation tracking
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Media Details</CardTitle>
        </CardHeader>
        <CardContent>
          <StorageMediaForm
            assets={assets}
            warehouseLocations={warehouseLocations}
            preSelectedAssetId={preSelectedAsset?.id}
          />
        </CardContent>
      </Card>
    </>
  );
}

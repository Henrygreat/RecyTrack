import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, STAFF_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DestructionJobForm } from "../components/destruction-job-form";

export default async function NewDestructionJobPage({
  searchParams,
}: {
  searchParams: Promise<{ mediaId?: string }>;
}) {
  const { organizationId } = await requireMember(undefined, STAFF_ROLES);
  const params = await searchParams;

  // Get storage media that can be scheduled for destruction
  const availableMedia = await prisma.storageMedia.findMany({
    where: {
      organizationId,
      isDataBearing: true,
      destructionJob: null, // No existing destruction job
      sanitisationStatus: {
        in: ["NOT_STARTED", "ERASURE_FAILED", "PENDING_DESTRUCTION"],
      },
    },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          category: true,
          customer: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { reference: "asc" },
  });

  // Get organization members for witness selection
  const members = await prisma.membership.findMany({
    where: { organizationId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // If mediaId provided, get pre-selected media
  const preSelectedMedia = params.mediaId
    ? availableMedia.find((m) => m.id === params.mediaId)
    : null;

  return (
    <>
      <Link
        href="/dashboard/destruction/physical"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Physical Destruction
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Schedule Physical Destruction</h1>
        <p className="text-sm text-slate-500">
          Schedule physical destruction for media that cannot be sanitised through erasure
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Destruction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DestructionJobForm
            availableMedia={availableMedia}
            members={members}
            preSelectedMediaId={preSelectedMedia?.id}
          />
        </CardContent>
      </Card>
    </>
  );
}

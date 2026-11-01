import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, STAFF_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ErasureJobForm } from "../components/erasure-job-form";

export default async function NewErasureJobPage({
  searchParams,
}: {
  searchParams: Promise<{ mediaId?: string }>;
}) {
  const { organizationId, userId } = await requireMember(undefined, STAFF_ROLES);
  const params = await searchParams;

  // Get storage media that can have erasure jobs
  const availableMedia = await prisma.storageMedia.findMany({
    where: {
      organizationId,
      isDataBearing: true,
      sanitisationStatus: {
        in: ["NOT_STARTED", "ERASURE_FAILED"],
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

  // Get active erasure methods
  const methods = await prisma.erasureMethod.findMany({
    where: {
      organizationId,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  // Get current user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  // If mediaId provided, get pre-selected media
  const preSelectedMedia = params.mediaId
    ? availableMedia.find((m) => m.id === params.mediaId)
    : null;

  return (
    <>
      <Link
        href="/dashboard/destruction/jobs"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Erasure Jobs
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Erasure Job</h1>
        <p className="text-sm text-slate-500">
          Create a data erasure job for storage media
        </p>
      </div>

      {methods.length === 0 ? (
        <Card className="max-w-2xl">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">No erasure methods configured.</p>
            <Link
              href="/dashboard/destruction/methods"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Configure Erasure Methods
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Erasure Job Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ErasureJobForm
              availableMedia={availableMedia}
              methods={methods}
              currentUser={user}
              preSelectedMediaId={preSelectedMedia?.id}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}

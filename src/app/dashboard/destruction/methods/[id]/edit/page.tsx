import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ErasureMethodForm } from "../../components/erasure-method-form";

export default async function EditErasureMethodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizationId } = await requireMember(undefined, MANAGEMENT_ROLES);
  const { id } = await params;

  const method = await prisma.erasureMethod.findFirst({
    where: { id, organizationId },
  });

  if (!method) {
    notFound();
  }

  return (
    <>
      <Link
        href={`/dashboard/destruction/methods/${method.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Method Details
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Erasure Method</h1>
        <p className="text-sm text-slate-500">
          Modify the configuration for {method.name} ({method.code})
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Method Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ErasureMethodForm method={method} mode="edit" />
        </CardContent>
      </Card>
    </>
  );
}

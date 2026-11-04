import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ErasureMethodForm } from "../components/erasure-method-form";

export default async function NewErasureMethodPage() {
  // Verify user has management access to create methods
  await requireMember(undefined, MANAGEMENT_ROLES);

  return (
    <>
      <Link
        href="/dashboard/destruction/methods"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Erasure Methods
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Create Custom Erasure Method</h1>
        <p className="text-sm text-slate-500">
          Define a new sanitisation procedure template for your organisation
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Method Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ErasureMethodForm mode="create" />
        </CardContent>
      </Card>
    </>
  );
}

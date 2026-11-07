import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCustomerAccess } from "@/lib/portal-access";
import { Card, CardContent } from "@/components/ui/card";
import { SiteForm } from "../site-form";

export default async function NewPortalSitePage() {
  const ctx = await requireCustomerAccess();
  if (!ctx.isAdmin || ctx.authorizedSiteIds !== null) {
    redirect("/portal/sites");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/portal/sites" className="text-sm font-medium text-teal-700 hover:text-teal-800">
        Back to sites
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add a site</h1>
        <p className="mt-1 text-sm text-slate-600">Register another collection location for your organisation.</p>
      </div>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <SiteForm />
        </CardContent>
      </Card>
    </div>
  );
}

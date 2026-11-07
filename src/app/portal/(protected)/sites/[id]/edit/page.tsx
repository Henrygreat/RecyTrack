import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireCustomerAccess } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { SiteForm } from "../../site-form";

export default async function EditPortalSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireCustomerAccess();
  if (!ctx.isAdmin) {
    redirect("/portal/sites");
  }

  const site = await prisma.site.findFirst({
    where: {
      id,
      customerId: ctx.customerId,
      organizationId: ctx.organizationId,
      ...(ctx.authorizedSiteIds ? { id: { in: ctx.authorizedSiteIds } } : {}),
    },
    include: {
      contacts: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
        take: 1,
        select: { name: true, email: true, phone: true },
      },
    },
  });

  if (!site) {
    notFound();
  }

  const primaryContact = site.contacts[0];
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/portal/sites/${site.id}`} className="text-sm font-medium text-teal-700 hover:text-teal-800">
        Back to site
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit site</h1>
        <p className="mt-1 text-sm text-slate-600">{site.name} · {site.reference}</p>
      </div>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <SiteForm
            site={{
              id: site.id,
              name: site.name,
              address: site.address,
              postcode: site.postcode,
              contactName: primaryContact?.name ?? site.contactName,
              contactPhone: primaryContact?.phone ?? site.contactPhone,
              contactEmail: primaryContact?.email ?? site.contactEmail,
              collectionInstructions: site.collectionInstructions,
              vehicleAccessNotes: site.vehicleAccessNotes,
              openingHours: site.openingHours,
              isDefault: site.isDefault,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

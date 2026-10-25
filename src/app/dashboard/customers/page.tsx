import Link from "next/link";
import { Users, Plus, Mail, MapPin, Building } from "lucide-react";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function Customers() {
  const { organizationId } = await requireMember();

  const customers = await prisma.customer.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: { collections: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage your customer database"
        actions={
          <Link href="/dashboard/customers/new" className="btn">
            <Plus className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Add Customer
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers yet"
              description="Add your first customer to start managing collections."
              action={{ label: "Add Customer", href: "/dashboard/customers/new" }}
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-400" />
                        Company
                      </div>
                    </th>
                    <th>Contact</th>
                    <th>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        Email
                      </div>
                    </th>
                    <th>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        Postcode
                      </div>
                    </th>
                    <th>Collections</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <span className="font-medium text-slate-900">{customer.name}</span>
                      </td>
                      <td className="text-slate-600">{customer.contactName || "—"}</td>
                      <td>
                        {customer.email ? (
                          <a
                            href={`mailto:${customer.email}`}
                            className="text-teal-600 hover:text-teal-700"
                          >
                            {customer.email}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-slate-600">{customer.postcode || "—"}</td>
                      <td>
                        <span className="tag">{customer._count.collections}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

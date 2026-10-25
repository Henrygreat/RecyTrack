import Link from "next/link";
import {
  Users,
  Plus,
  Mail,
  MapPin,
  Building,
  Archive,
  CheckCircle,
  Phone,
  ChevronRight,
} from "lucide-react";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomerFilters } from "./components/customer-filters";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    type?: string;
    page?: string;
  }>;
}

export default async function Customers({ searchParams }: PageProps) {
  const params = await searchParams;
  const { organizationId } = await requireMember();

  const search = params.search || "";
  const status = params.status || "ACTIVE";
  const type = params.type || "all";
  const page = parseInt(params.page || "1", 10);
  const limit = 25;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: {
    organizationId: string;
    status?: "ACTIVE" | "ARCHIVED";
    customerType?: "BUSINESS" | "INDIVIDUAL";
    OR?: Array<Record<string, unknown>>;
  } = {
    organizationId,
  };

  if (status !== "all") {
    where.status = status as "ACTIVE" | "ARCHIVED";
  }

  if (type !== "all") {
    where.customerType = type as "BUSINESS" | "INDIVIDUAL";
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { reference: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { postcode: { contains: search, mode: "insensitive" } },
    ];
  }

  // Fetch customers with count
  const [customers, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            collections: true,
            sites: { where: { isActive: true } },
            contacts: { where: { isActive: true } },
          },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  // Get stats
  const [activeCount, archivedCount] = await Promise.all([
    prisma.customer.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.customer.count({ where: { organizationId, status: "ARCHIVED" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage your customer database"
        actions={
          <Link
            href="/dashboard/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard title="Active Customers" value={activeCount} icon={CheckCircle} />
        <MetricCard title="Archived" value={archivedCount} icon={Archive} />
        <MetricCard title="Total Records" value={activeCount + archivedCount} icon={Users} />
      </div>

      {/* Filters */}
      <CustomerFilters search={search} status={status} type={type} />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>
              {status === "all"
                ? "All Customers"
                : status === "ARCHIVED"
                ? "Archived Customers"
                : "Active Customers"}
            </CardTitle>
            <Badge variant="secondary">{totalCount} records</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search ? "No customers found" : "No customers yet"}
              description={
                search
                  ? "Try adjusting your search or filters."
                  : "Add your first customer to start managing collections."
              }
              action={!search ? { label: "Add Customer", href: "/dashboard/customers/new" } : undefined}
            />
          ) : (
            <>
              <div className="overflow-x-auto -mx-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">
                        Ref
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Customer
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Contact
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Location
                        </div>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Sites
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Collections
                      </th>
                      <th className="px-6 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          customer.status === "ARCHIVED" ? "opacity-60" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                            {customer.reference}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{customer.name}</span>
                            {customer.status === "ARCHIVED" && (
                              <Badge variant="error">Archived</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={customer.customerType === "BUSINESS" ? "info" : "warning"}>
                            {customer.customerType === "BUSINESS" ? "Business" : "Individual"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            {customer.email ? (
                              <a
                                href={`mailto:${customer.email}`}
                                className="text-teal-600 hover:text-teal-700 hover:underline"
                              >
                                {customer.email}
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                            {customer.phone && (
                              <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {customer.postcode || "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                            {customer._count.sites}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                            {customer._count.collections}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors inline-flex"
                          >
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 px-6 -mx-6">
                  <span className="text-sm text-slate-600">
                    Showing {skip + 1} to {Math.min(skip + limit, totalCount)} of {totalCount}{" "}
                    customers
                  </span>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={`/dashboard/customers?${new URLSearchParams({
                          ...(search && { search }),
                          ...(status !== "ACTIVE" && { status }),
                          ...(type !== "all" && { type }),
                          page: String(page - 1),
                        })}`}
                        className="px-3 py-1.5 text-sm font-medium bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Previous
                      </Link>
                    )}
                    <span className="px-3 py-1.5 text-sm font-medium text-slate-600">
                      Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                      <Link
                        href={`/dashboard/customers?${new URLSearchParams({
                          ...(search && { search }),
                          ...(status !== "ACTIVE" && { status }),
                          ...(type !== "all" && { type }),
                          page: String(page + 1),
                        })}`}
                        className="px-3 py-1.5 text-sm font-medium bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Next
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

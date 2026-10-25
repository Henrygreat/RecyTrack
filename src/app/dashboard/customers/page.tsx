import Link from "next/link";
import {
  Users,
  Plus,
  Mail,
  MapPin,
  Building,
  Search,
  Filter,
  Archive,
  CheckCircle,
  Phone,
  ChevronRight,
} from "lucide-react";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
          <Link href="/dashboard/customers/new" className="btn">
            <Plus className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Add Customer
          </Link>
        }
      />

      {/* Stats */}
      <div className="cards" style={{ marginBottom: "1.5rem" }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Active Customers</span>
            <CheckCircle className="w-5 h-5 text-teal-600" />
          </div>
          <div className="metric-value">{activeCount}</div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Archived</span>
            <Archive className="w-5 h-5 text-slate-400" />
          </div>
          <div className="metric-value">{archivedCount}</div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Records</span>
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div className="metric-value">{activeCount + archivedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <CustomerFilters
        search={search}
        status={status}
        type={type}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {status === "all"
              ? "All Customers"
              : status === "ARCHIVED"
                ? "Archived Customers"
                : "Active Customers"}
            {" "}({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>Ref</th>
                      <th>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-slate-400" />
                          Customer
                        </div>
                      </th>
                      <th>Type</th>
                      <th>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          Contact
                        </div>
                      </th>
                      <th>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          Location
                        </div>
                      </th>
                      <th>Sites</th>
                      <th>Collections</th>
                      <th style={{ width: "50px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr
                        key={customer.id}
                        style={{ opacity: customer.status === "ARCHIVED" ? 0.6 : 1 }}
                      >
                        <td>
                          <span
                            className="font-mono text-xs"
                            style={{
                              backgroundColor: "#f1f5f9",
                              padding: "0.125rem 0.375rem",
                              borderRadius: "0.25rem",
                            }}
                          >
                            {customer.reference}
                          </span>
                        </td>
                        <td>
                          <div>
                            <span className="font-medium text-slate-900">{customer.name}</span>
                            {customer.status === "ARCHIVED" && (
                              <span
                                className="badge"
                                style={{
                                  marginLeft: "0.5rem",
                                  backgroundColor: "#fef2f2",
                                  color: "#b91c1c",
                                  fontSize: "0.65rem",
                                }}
                              >
                                Archived
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                customer.customerType === "BUSINESS" ? "#dbeafe" : "#fef3c7",
                              color: customer.customerType === "BUSINESS" ? "#1e40af" : "#b45309",
                            }}
                          >
                            {customer.customerType === "BUSINESS" ? "Business" : "Individual"}
                          </span>
                        </td>
                        <td>
                          <div className="text-sm">
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
                            {customer.phone && (
                              <div className="text-slate-500 text-xs flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="text-slate-600">{customer.postcode || "—"}</td>
                        <td>
                          <span className="tag">{customer._count.sites}</span>
                        </td>
                        <td>
                          <span className="tag">{customer._count.collections}</span>
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
                            className="text-teal-600 hover:text-teal-700"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <span className="text-sm text-slate-600">
                    Showing {skip + 1} to {Math.min(skip + limit, totalCount)} of {totalCount} customers
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {page > 1 && (
                      <Link
                        href={`/dashboard/customers?${new URLSearchParams({
                          ...(search && { search }),
                          ...(status !== "ACTIVE" && { status }),
                          ...(type !== "all" && { type }),
                          page: String(page - 1),
                        })}`}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 1rem" }}
                      >
                        Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/dashboard/customers?${new URLSearchParams({
                          ...(search && { search }),
                          ...(status !== "ACTIVE" && { status }),
                          ...(type !== "all" && { type }),
                          page: String(page + 1),
                        })}`}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 1rem" }}
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

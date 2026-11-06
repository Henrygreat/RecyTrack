import Link from "next/link";
import {
  Truck,
  MapPin,
  Calendar,
  Package,
  Filter,
  Plus,
  ChevronRight,
} from "lucide-react";
import { requireCustomerAccess } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { CollectionStatus } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
}

const validStatuses: CollectionStatus[] = [
  "DRAFT",
  "REQUESTED",
  "CONFIRMED",
  "APPROVED",
  "SCHEDULED",
  "ASSIGNED",
  "IN_TRANSIT",
  "COLLECTED",
  "RECEIVED",
  "COMPLETED",
  "CANCELLED",
  "EXCEPTION",
];

const statusColors: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  DRAFT: { bg: "bg-slate-100", text: "text-slate-700", label: "Draft" },
  REQUESTED: { bg: "bg-amber-100", text: "text-amber-700", label: "Requested" },
  CONFIRMED: { bg: "bg-blue-100", text: "text-blue-700", label: "Confirmed" },
  APPROVED: { bg: "bg-blue-100", text: "text-blue-700", label: "Approved" },
  SCHEDULED: {
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    label: "Scheduled",
  },
  ASSIGNED: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Assigned" },
  IN_TRANSIT: { bg: "bg-teal-100", text: "text-teal-700", label: "In Transit" },
  COLLECTED: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Collected",
  },
  RECEIVED: { bg: "bg-green-100", text: "text-green-700", label: "Received" },
  COMPLETED: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
  EXCEPTION: { bg: "bg-red-100", text: "text-red-700", label: "Exception" },
};

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "REQUESTED", label: "Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "COMPLETED", label: "Completed" },
];

export default async function PortalCollections({ searchParams }: PageProps) {
  const params = await searchParams;
  const ctx = await requireCustomerAccess();

  const status = params.status || "all";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  // Build where clause - ONLY this customer's collections
  const where: {
    customerId: string;
    organizationId: string;
    status?: CollectionStatus;
  } = {
    customerId: ctx.customerId,
    organizationId: ctx.organizationId,
  };

  if (status !== "all" && validStatuses.includes(status as CollectionStatus)) {
    where.status = status as CollectionStatus;
  }

  const [collections, totalCount] = await Promise.all([
    prisma.collection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        _count: {
          select: { assets: true },
        },
      },
    }),
    prisma.collection.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      {/* Header with Book CTA */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Collections</h1>
          <p className="text-slate-500 mt-1">
            Track and view your IT recycling collections
          </p>
        </div>
        <Link
          href="/portal/book"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Book a Collection
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Filter className="w-4 h-4 text-slate-400" />
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((opt) => (
            <Link
              key={opt.value}
              href={`/portal/collections${opt.value !== "all" ? `?status=${opt.value}` : ""}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                status === opt.value
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {status === "all"
              ? "All Collections"
              : statusColors[status]?.label || status}{" "}
            ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {collections.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No collections found"
              description={
                status !== "all"
                  ? "Try changing your filter to see more collections."
                  : "Your collection history will appear here."
              }
              action={
                status === "all"
                  ? { label: "Book your first collection", href: "/portal/book" }
                  : undefined
              }
            />
          ) : (
            <>
              <div className="space-y-3">
                {collections.map((collection) => {
                  const colors = statusColors[collection.status] || {
                    bg: "bg-slate-100",
                    text: "text-slate-700",
                    label: collection.status,
                  };
                  return (
                    <Link
                      key={collection.id}
                      href={`/portal/collections/${collection.id}`}
                      className="block p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-slate-100 transition-all group"
                    >
                      <div className="flex justify-between items-start flex-wrap gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm font-semibold text-slate-900">
                              {collection.reference}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}
                            >
                              {colors.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">
                            {collection.address}
                          </p>
                          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {collection.postcode}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {collection.scheduledDate
                                ? new Date(
                                    collection.scheduledDate
                                  ).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "Pending"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {collection._count.assets > 0
                                ? `${collection._count.assets} assets`
                                : `~${collection.itemEstimate} estimated`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {collection.collectedAt && (
                            <div className="text-right text-xs text-slate-500">
                              <div>Collected</div>
                              <div className="font-medium">
                                {new Date(
                                  collection.collectedAt
                                ).toLocaleDateString("en-GB")}
                              </div>
                            </div>
                          )}
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
                  <span className="text-sm text-slate-600">
                    Showing {skip + 1} to {Math.min(skip + limit, totalCount)}{" "}
                    of {totalCount}
                  </span>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={`/portal/collections?${new URLSearchParams({
                          ...(status !== "all" && { status }),
                          page: String(page - 1),
                        })}`}
                        className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/portal/collections?${new URLSearchParams({
                          ...(status !== "all" && { status }),
                          page: String(page + 1),
                        })}`}
                        className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
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
    </div>
  );
}

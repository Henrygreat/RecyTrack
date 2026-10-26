import Link from "next/link";
import { Truck, MapPin, Calendar, Package, Filter } from "lucide-react";
import { requireCustomerAccess } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
}

export default async function PortalCollections({ searchParams }: PageProps) {
  const params = await searchParams;
  const ctx = await requireCustomerAccess();

  const status = params.status || "all";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  // Build where clause - ONLY this customer's collections
  type CollectionStatus = "REQUESTED" | "CONFIRMED" | "ASSIGNED" | "IN_TRANSIT" | "COLLECTED" | "RECEIVED" | "CANCELLED";

  const where: {
    customerId: string;
    organizationId: string;
    status?: CollectionStatus;
  } = {
    customerId: ctx.customerId,
    organizationId: ctx.organizationId,
  };

  if (status !== "all" && ["REQUESTED", "CONFIRMED", "ASSIGNED", "IN_TRANSIT", "COLLECTED", "RECEIVED", "CANCELLED"].includes(status)) {
    where.status = status as CollectionStatus;
  }

  const [collections, totalCount] = await Promise.all([
    prisma.collection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.collection.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    REQUESTED: { bg: "#fef3c7", text: "#b45309", label: "Requested" },
    CONFIRMED: { bg: "#dbeafe", text: "#1e40af", label: "Confirmed" },
    ASSIGNED: { bg: "#e0e7ff", text: "#4338ca", label: "Assigned" },
    IN_TRANSIT: { bg: "#fae8ff", text: "#a21caf", label: "In Transit" },
    COLLECTED: { bg: "#d1fae5", text: "#065f46", label: "Collected" },
    RECEIVED: { bg: "#dcfce7", text: "#166534", label: "Received" },
    CANCELLED: { bg: "#fef2f2", text: "#b91c1c", label: "Cancelled" },
  };

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "REQUESTED", label: "Requested" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "ASSIGNED", label: "Assigned" },
    { value: "IN_TRANSIT", label: "In Transit" },
    { value: "COLLECTED", label: "Collected" },
    { value: "RECEIVED", label: "Received" },
  ];

  return (
    <>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>
          Collections
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
          Track and view your IT recycling collections
        </p>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <Filter className="w-4 h-4 text-slate-400" />
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {statusOptions.map((opt) => (
            <Link
              key={opt.value}
              href={`/portal/collections${opt.value !== "all" ? `?status=${opt.value}` : ""}`}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "9999px",
                fontSize: "0.875rem",
                textDecoration: "none",
                backgroundColor: status === opt.value ? "#0f766e" : "#f1f5f9",
                color: status === opt.value ? "white" : "#64748b",
              }}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {status === "all" ? "All Collections" : statusColors[status]?.label || status} ({totalCount})
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
            />
          ) : (
            <>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {collections.map((collection) => {
                  const colors = statusColors[collection.status] || {
                    bg: "#f1f5f9",
                    text: "#64748b",
                    label: collection.status,
                  };
                  return (
                    <div
                      key={collection.id}
                      style={{
                        padding: "1rem",
                        backgroundColor: "#f8fafc",
                        borderRadius: "0.5rem",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span
                              className="font-mono"
                              style={{ fontWeight: "600", fontSize: "0.875rem" }}
                            >
                              {collection.reference}
                            </span>
                            <span
                              className="badge"
                              style={{ backgroundColor: colors.bg, color: colors.text }}
                            >
                              {colors.label}
                            </span>
                          </div>
                          <p
                            style={{
                              marginTop: "0.5rem",
                              fontSize: "0.875rem",
                              color: "#475569",
                            }}
                          >
                            {collection.address}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "1rem",
                              marginTop: "0.5rem",
                              fontSize: "0.75rem",
                              color: "#64748b",
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <MapPin className="w-3 h-3" />
                              {collection.postcode}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Calendar className="w-3 h-3" />
                              Booked: {collection.createdAt.toLocaleDateString("en-GB")}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Package className="w-3 h-3" />
                              ~{collection.itemEstimate} items
                            </span>
                          </div>
                        </div>
                        {collection.collectedAt && (
                          <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#64748b" }}>
                            <div>Collected</div>
                            <div style={{ fontWeight: "500" }}>
                              {collection.collectedAt.toLocaleDateString("en-GB")}
                            </div>
                          </div>
                        )}
                      </div>
                      {collection.notes && (
                        <p
                          style={{
                            marginTop: "0.75rem",
                            padding: "0.5rem",
                            backgroundColor: "#f1f5f9",
                            borderRadius: "0.375rem",
                            fontSize: "0.75rem",
                            color: "#64748b",
                          }}
                        >
                          {collection.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
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
                    Showing {skip + 1} to {Math.min(skip + limit, totalCount)} of {totalCount}
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {page > 1 && (
                      <Link
                        href={`/portal/collections?${new URLSearchParams({
                          ...(status !== "all" && { status }),
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
                        href={`/portal/collections?${new URLSearchParams({
                          ...(status !== "all" && { status }),
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

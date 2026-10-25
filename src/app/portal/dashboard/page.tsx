import Link from "next/link";
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  Package,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { requireCustomerAccess } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PortalDashboard() {
  const ctx = await requireCustomerAccess();

  // Fetch customer data with collections and sites
  const [collections, sites, recentCollections] = await Promise.all([
    // Collection stats
    prisma.collection.groupBy({
      by: ["status"],
      where: {
        customerId: ctx.customerId,
        organizationId: ctx.organizationId,
      },
      _count: true,
    }),
    // Sites count
    prisma.site.count({
      where: {
        customerId: ctx.customerId,
        organizationId: ctx.organizationId,
        isActive: true,
        ...(ctx.authorizedSiteIds ? { id: { in: ctx.authorizedSiteIds } } : {}),
      },
    }),
    // Recent collections
    prisma.collection.findMany({
      where: {
        customerId: ctx.customerId,
        organizationId: ctx.organizationId,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Calculate stats
  const totalCollections = collections.reduce((sum, c) => sum + c._count, 0);
  const activeCollections = collections
    .filter((c) => !["RECEIVED", "CANCELLED"].includes(c.status))
    .reduce((sum, c) => sum + c._count, 0);
  const completedCollections = collections
    .filter((c) => c.status === "RECEIVED")
    .reduce((sum, c) => sum + c._count, 0);

  const statusColors: Record<string, { bg: string; text: string }> = {
    REQUESTED: { bg: "#fef3c7", text: "#b45309" },
    CONFIRMED: { bg: "#dbeafe", text: "#1e40af" },
    ASSIGNED: { bg: "#e0e7ff", text: "#4338ca" },
    IN_TRANSIT: { bg: "#fae8ff", text: "#a21caf" },
    COLLECTED: { bg: "#d1fae5", text: "#065f46" },
    RECEIVED: { bg: "#dcfce7", text: "#166534" },
    CANCELLED: { bg: "#fef2f2", text: "#b91c1c" },
  };

  return (
    <>
      {/* Welcome Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>
          Welcome back
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
          Here's an overview of your recycling activity with {ctx.customerAccess.customer.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Active Collections</span>
            <Clock className="w-5 h-5 text-teal-600" />
          </div>
          <div className="metric-value">{activeCollections}</div>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            In progress
          </p>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Completed</span>
            <CheckCircle className="w-5 h-5 text-teal-600" />
          </div>
          <div className="metric-value">{completedCollections}</div>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            All time
          </p>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Collections</span>
            <Package className="w-5 h-5 text-teal-600" />
          </div>
          <div className="metric-value">{totalCollections}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Sites</span>
            <MapPin className="w-5 h-5 text-teal-600" />
          </div>
          <div className="metric-value">{sites}</div>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            Active locations
          </p>
        </div>
      </div>

      {/* Recent Collections */}
      <Card>
        <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <CardTitle>Recent Collections</CardTitle>
          <Link
            href="/portal/collections"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.875rem",
              color: "#0f766e",
              textDecoration: "none",
            }}
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentCollections.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No collections yet"
              description="Your collection history will appear here once you have scheduled pickups."
            />
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {recentCollections.map((collection) => {
                const colors = statusColors[collection.status] || { bg: "#f1f5f9", text: "#64748b" };
                return (
                  <div
                    key={collection.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.75rem 1rem",
                      backgroundColor: "#f8fafc",
                      borderRadius: "0.5rem",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                          className="font-mono"
                          style={{ fontWeight: "500", fontSize: "0.875rem" }}
                        >
                          {collection.reference}
                        </span>
                        <span
                          className="badge"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {collection.status.replace("_", " ")}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          marginTop: "0.25rem",
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
                          {collection.createdAt.toLocaleDateString("en-GB")}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/portal/collections/${collection.id}`}
                      style={{
                        fontSize: "0.875rem",
                        color: "#0f766e",
                        textDecoration: "none",
                      }}
                    >
                      View
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: "600", color: "#334155", marginBottom: "1rem" }}>
          Quick Actions
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <Link
            href="/portal/collections"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem",
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              textDecoration: "none",
              color: "#334155",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#f0fdfa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Truck className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div style={{ fontWeight: "500" }}>View Collections</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Track your pickups
              </div>
            </div>
          </Link>

          <Link
            href="/portal/sites"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem",
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              textDecoration: "none",
              color: "#334155",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#f0fdfa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MapPin className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div style={{ fontWeight: "500" }}>Your Sites</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Collection locations
              </div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  ChevronLeft,
  Edit,
  Archive,
  RotateCcw,
  Truck,
  Users,
  MapPinned,
  FileText,
  Activity,
  UserPlus,
  Hash,
} from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomerTabs } from "./components/customer-tabs";
import { CustomerActions } from "./components/customer-actions";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function CustomerDetail({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const { organizationId, membership } = await requireMember();

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId },
    include: {
      sites: {
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      },
      contacts: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      },
      collections: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      invitations: {
        where: {
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      },
      customerAccess: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: {
          collections: true,
          sites: true,
          contacts: true,
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const canManage = MANAGEMENT_ROLES.includes(membership.role);

  // Get recent activity
  const recentActivity = await prisma.auditLog.findMany({
    where: {
      organizationId,
      entityType: { in: ["Customer", "Site", "CustomerContact", "Collection"] },
      entityId: { in: [customer.id, ...customer.sites.map((s) => s.id)] },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <>
      {/* Back link */}
      <Link
        href="/dashboard/customers"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          color: "#64748b",
          fontSize: "0.875rem",
          marginBottom: "1rem",
          textDecoration: "none",
        }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Customers
      </Link>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                color: "#0f172a",
                margin: 0,
              }}
            >
              {customer.name}
            </h1>
            <span
              className="font-mono text-xs"
              style={{
                backgroundColor: "#f1f5f9",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
              }}
            >
              {customer.reference}
            </span>
            <span
              className="badge"
              style={{
                backgroundColor:
                  customer.status === "ACTIVE" ? "#d1fae5" : "#fef2f2",
                color: customer.status === "ACTIVE" ? "#065f46" : "#b91c1c",
              }}
            >
              {customer.status}
            </span>
          </div>
          <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
            {customer.customerType === "BUSINESS" ? "Business" : "Individual"} Customer
            {customer.companyNumber && ` • Company #${customer.companyNumber}`}
          </p>
        </div>

        {canManage && (
          <CustomerActions
            customerId={customer.id}
            customerStatus={customer.status}
          />
        )}
      </div>

      {/* Quick Info Cards */}
      <div className="cards" style={{ marginBottom: "1.5rem" }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Sites</span>
            <MapPinned className="w-5 h-5 text-teal-600" />
          </div>
          <div className="metric-value">{customer._count.sites}</div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Contacts</span>
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div className="metric-value">{customer._count.contacts}</div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Collections</span>
            <Truck className="w-5 h-5 text-teal-600" />
          </div>
          <div className="metric-value">{customer._count.collections}</div>
        </div>
      </div>

      {/* Tabs */}
      <CustomerTabs
        customerId={customer.id}
        activeTab={tab}
        customer={customer}
        canManage={canManage}
        recentActivity={recentActivity}
      />
    </>
  );
}

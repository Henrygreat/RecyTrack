import { requireCustomerAccess } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Import dashboard components
import { WelcomeBanner } from "../components/welcome-banner";
import { KPICard } from "../components/kpi-card";
import { QuickActions } from "../components/quick-actions";
import { ProcessingStatus } from "../components/processing-status";
import { RecentCertificates, RecentCollections } from "../components/recent-activity";
import { SustainabilityMetrics } from "../components/sustainability-metrics";

export default async function PortalDashboard() {
  const ctx = await requireCustomerAccess();
  const session = await auth();

  // Get user name for welcome banner
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      })
    : null;

  // Fetch comprehensive stats in parallel
  const [
    totalAssets,
    assetsByStatus,
    mediaStats,
    certificateStats,
    recentCollections,
    recentCertificates,
    upcomingCollections,
    activeCollections,
  ] = await Promise.all([
    // Total assets
    prisma.asset.count({
      where: { organizationId: ctx.organizationId, customerId: ctx.customerId },
    }),

    // Assets by status
    prisma.asset.groupBy({
      by: ["status"],
      where: { organizationId: ctx.organizationId, customerId: ctx.customerId },
      _count: true,
    }),

    // Storage media stats
    prisma.storageMedia.groupBy({
      by: ["sanitisationStatus"],
      where: {
        organizationId: ctx.organizationId,
        asset: { customerId: ctx.customerId },
      },
      _count: true,
    }),

    // Certificate stats
    prisma.certificate.groupBy({
      by: ["status"],
      where: {
        organizationId: ctx.organizationId,
        customerId: ctx.customerId,
      },
      _count: true,
    }),

    // Recent collections
    prisma.collection.findMany({
      where: {
        customerId: ctx.customerId,
        organizationId: ctx.organizationId,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        reference: true,
        status: true,
        scheduledDate: true,
        _count: { select: { assets: true } },
      },
    }),

    // Recent certificates
    prisma.certificate.findMany({
      where: {
        customerId: ctx.customerId,
        organizationId: ctx.organizationId,
        status: "ISSUED",
      },
      orderBy: { issueDate: "desc" },
      take: 3,
      select: {
        id: true,
        certificateNumber: true,
        certificateType: true,
        issueDate: true,
        totalMediaCount: true,
      },
    }),

    // Upcoming collections count
    prisma.collection.count({
      where: {
        customerId: ctx.customerId,
        organizationId: ctx.organizationId,
        status: { in: ["SCHEDULED", "APPROVED", "CONFIRMED"] },
        scheduledDate: { gte: new Date() },
      },
    }),

    // Active collections count
    prisma.collection.count({
      where: {
        customerId: ctx.customerId,
        organizationId: ctx.organizationId,
        status: { in: ["IN_TRANSIT", "COLLECTED", "RECEIVED"] },
      },
    }),
  ]);

  // Process status counts
  const statusMap: Record<string, number> = {};
  for (const item of assetsByStatus) {
    statusMap[item.status] = item._count;
  }

  const mediaMap: Record<string, number> = {};
  for (const item of mediaStats) {
    mediaMap[item.sanitisationStatus] = item._count;
  }

  const certMap: Record<string, number> = {};
  for (const item of certificateStats) {
    certMap[item.status] = item._count;
  }

  // Calculate derived metrics
  const assetsAtFacility =
    (statusMap["RECEIVED"] || 0) +
    (statusMap["INSPECTION"] || 0) +
    (statusMap["PROCESSING"] || 0) +
    (statusMap["DATA_ERASURE"] || 0);

  const assetsProcessed =
    (statusMap["READY"] || 0) +
    (statusMap["RELEASED"] || 0) +
    (statusMap["RECYCLED"] || 0) +
    (statusMap["SOLD"] || 0) +
    (statusMap["DESTROYED"] || 0);

  const mediaSanitised =
    (mediaMap["VERIFIED"] || 0) +
    (mediaMap["DESTROYED"] || 0) +
    (mediaMap["ERASURE_PASSED"] || 0);

  const recycledAssets = (statusMap["RECYCLED"] || 0) + (statusMap["DESTROYED"] || 0);
  const reusedAssets = (statusMap["SOLD"] || 0) + (statusMap["RELEASED"] || 0);
  const failedMedia = mediaMap["ERASURE_FAILED"] || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <WelcomeBanner
        customerName={ctx.customerAccess.customer.name}
        userName={user?.name || undefined}
      />

      {/* KPI Cards - Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Assets"
          value={totalAssets}
          iconName="package"
          iconColor="text-primary-teal"
          iconBgColor="bg-primary-teal/10"
          href="/portal/assets"
        />
        <KPICard
          title="At Facility"
          value={assetsAtFacility}
          subtitle="In processing"
          iconName="map-pin"
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <KPICard
          title="Media Sanitised"
          value={mediaSanitised}
          iconName="shield"
          iconColor="text-eco-green"
          iconBgColor="bg-emerald-100"
        />
        <KPICard
          title="Certificates"
          value={certMap["ISSUED"] || 0}
          iconName="award"
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
          href="/portal/certificates"
        />
      </div>

      {/* Collection Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Upcoming Collections"
          value={upcomingCollections}
          iconName="calendar"
          iconColor="text-indigo-600"
          iconBgColor="bg-indigo-100"
          href="/portal/collections"
        />
        <KPICard
          title="Active Collections"
          value={activeCollections}
          iconName="truck"
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          href="/portal/collections"
        />
        <KPICard
          title="Assets Processed"
          value={assetsProcessed}
          iconName="check-circle"
          iconColor="text-eco-green"
          iconBgColor="bg-emerald-100"
        />
        <KPICard
          title="Total Media"
          value={Object.values(mediaMap).reduce((a, b) => a + b, 0)}
          iconName="shield"
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Processing Status & Sustainability */}
        <div className="space-y-6">
          <ProcessingStatus
            inspection={statusMap["INSPECTION"] || 0}
            processing={
              (statusMap["PROCESSING"] || 0) + (statusMap["DATA_ERASURE"] || 0)
            }
            ready={(statusMap["READY"] || 0) + (statusMap["RELEASED"] || 0)}
            attention={failedMedia}
          />
          <SustainabilityMetrics
            totalAssets={assetsProcessed}
            recycled={recycledAssets}
            reused={reusedAssets}
            sanitised={mediaSanitised}
          />
        </div>

        {/* Middle & Right Columns - Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <RecentCertificates certificates={recentCertificates} />
          <RecentCollections collections={recentCollections} />
        </div>
      </div>
    </div>
  );
}

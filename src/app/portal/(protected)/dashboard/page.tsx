import { requireCustomerAccess } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Import dashboard components
import { WelcomeBanner } from "../components/welcome-banner";
import { KPICard } from "../components/kpi-card";
import { QuickActions } from "../components/quick-actions";
import { RecentCertificates, RecentCollections } from "../components/recent-activity";
import { AssetLifecycle, MediaProgress } from "../components/dashboard-insights";

export default async function PortalDashboard() {
  const ctx = await requireCustomerAccess();
  const session = await auth();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

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
    totalCollections,
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
        statusHistory: {
          select: { id: true, toStatus: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
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
        status: { in: ["SCHEDULED", "APPROVED", "CONFIRMED", "ASSIGNED"] },
        scheduledDate: { gte: today },
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
    prisma.collection.count({
      where: { customerId: ctx.customerId, organizationId: ctx.organizationId },
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

  const totalMedia = Object.values(mediaMap).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <WelcomeBanner
        customerName={ctx.customerAccess.customer.name}
        userName={user?.name || undefined}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="All Collections"
          value={totalCollections}
          subtitle="All statuses"
          iconName="calendar"
          iconColor="text-indigo-600"
          iconBgColor="bg-indigo-100"
          href="/portal/collections"
        />
        <KPICard
          title="Upcoming Collections"
          value={upcomingCollections}
          subtitle="Scheduled from today"
          iconName="truck"
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          href="/portal/collections"
        />
        <KPICard
          title="Active Collections"
          value={activeCollections}
          subtitle="In transit, collected or received"
          iconName="check-circle"
          iconColor="text-eco-green"
          iconBgColor="bg-emerald-100"
        />
        <KPICard
          title="Assets Processed"
          value={assetsProcessed}
          subtitle="Ready, released, sold, recycled or destroyed"
          iconName="shield"
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AssetLifecycle statuses={assetsByStatus.map((item) => ({ status: item.status, count: item._count }))} />
        </div>
        <div className="lg:col-span-5">
          <MediaProgress completed={mediaSanitised} total={totalMedia} />
        </div>
        <div className="lg:col-span-7">
          <RecentCollections collections={recentCollections} />
        </div>
        <div className="lg:col-span-5">
          <RecentCertificates certificates={recentCertificates} />
        </div>
      </div>
    </div>
  );
}
